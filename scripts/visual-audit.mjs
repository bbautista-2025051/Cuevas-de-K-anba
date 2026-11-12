/**
 * Auditoría visual/DOM rápida (sin inspección de píxeles).
 * Uso: node scripts/visual-audit.mjs [baseUrl]
 * Revisa imágenes rotas, textos alternativos, enlaces vacíos, errores de consola,
 * áreas táctiles pequeñas y recortes de texto en botones/etiquetas.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const base = process.argv[2] || 'http://localhost:3000';
const chromePath = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe')
].find((p) => p && fs.existsSync(p));

if (!chromePath) {
  console.error('Chrome no encontrado.');
  process.exit(1);
}

const port = 9800 + Math.floor(Math.random() * 150);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'kanba-audit-'));
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDevtools() {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (res.ok) return await res.json();
    } catch { /* not ready */ }
    await sleep(150);
  }
  throw new Error('DevTools no respondió.');
}

let targets;
try {
  targets = await waitForDevtools();
} catch (err) {
  chrome.kill();
  throw err;
}
const target = targets.find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);

let seq = 0;
const pending = new Map();
const listeners = new Map();
const consoleErrors = [];
const requestFailures = [];

ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`));
    else resolve(msg.result);
  } else if (msg.method) {
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || ''));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
    }
    if (msg.method === 'Network.loadingFailed' && !msg.params.canceled) {
      requestFailures.push(msg.params.errorText);
    }
    const list = listeners.get(msg.method) || [];
    listeners.set(msg.method, []);
    list.forEach((fn) => fn(msg.params));
  }
});
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

function send(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function once(method, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout esperando ${method}`)), timeout);
    const fn = (params) => { clearTimeout(timer); resolve(params); };
    listeners.set(method, [...(listeners.get(method) || []), fn]);
  });
}

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
  return r.result.value;
}

async function setViewport(width, height = 900) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
}

async function navigate(url) {
  const loaded = once('Page.loadEventFired');
  await send('Page.navigate', { url });
  await loaded;
  await sleep(1200);
  await evaluate(`window.scrollTo(0, document.body.scrollHeight)`);
  await sleep(700);
  await evaluate(`window.scrollTo(0, 0)`);
  await sleep(400);
}

const auditProbe = `(() => {
  const vw = innerWidth;
  const visible = (el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  };
  const brokenImages = [...document.images]
    .filter((img) => img.complete && img.naturalWidth === 0 && !img.closest('[hidden]'))
    .map((img) => img.getAttribute('src'));
  const missingAlt = [...document.images].filter((img) => visible(img) && !img.hasAttribute('alt')).map((img) => img.getAttribute('src'));
  const emptyLinks = [...document.querySelectorAll('a')]
    .filter((a) => visible(a) && (!a.getAttribute('href') || a.getAttribute('href') === '#') && !a.hasAttribute('data-action'))
    .map((a) => a.textContent.trim().slice(0, 40));
  const smallTargets = [...document.querySelectorAll('a, button, input[type=submit], [role=button]')]
    .filter(visible)
    .filter((el) => {
      const r = el.getBoundingClientRect();
      if (el.closest('footer') || el.closest('.marquee') || el.closest('.chip-row') || el.closest('.gallery-filter') || el.closest('.social-row')) return false;
      return r.height < 32 || r.width < 32;
    })
    .map((el) => (el.tagName + ':' + (el.id || el.className || el.textContent.trim()).toString().slice(0, 40)));
  const clippedText = [...document.querySelectorAll('h1,h2,h3,p,span,strong,em,li,button,a,label,td,th')]
    .filter(visible)
    .filter((el) => {
      if (!el.childElementCount && el.textContent.trim().length > 0) {
        const s = getComputedStyle(el);
        if (s.overflowX === 'hidden' || s.textOverflow === 'ellipsis') {
          return el.scrollWidth > el.clientWidth + 2;
        }
      }
      return false;
    })
    .map((el) => el.tagName + '.' + (el.className || '').toString().split(/\\s+/)[0] + ' :: ' + el.textContent.trim().slice(0, 40));
  const fonts = [...document.fonts].filter((f) => f.status === 'error').map((f) => f.family);
  return {
    brokenImages,
    missingAlt,
    emptyLinks,
    smallTargets: smallTargets.slice(0, 10),
    clippedText: clippedText.slice(0, 10),
    fonts,
    title: document.title,
    h1: document.querySelector('h1')?.textContent.trim().slice(0, 120) || null,
    docHeight: document.documentElement.scrollHeight
  };
})()`;

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');

const pages = [
  ['/', 'Portada'],
  ['/pago.html', 'Pago'],
  ['/mi-reserva.html', 'Mi reserva'],
  ['/verificar.html', 'Verificar']
];
const sizes = [
  ['desktop', 1440, 900],
  ['phone', 390, 844]
];

const problems = [];
let checks = 0;

for (const [route, name] of pages) {
  for (const [label, w, h] of sizes) {
    consoleErrors.length = 0;
    requestFailures.length = 0;
    await setViewport(w, h);
    await navigate(base + route);
    const r = await evaluate(auditProbe);
    checks++;
    const issues = [];
    if (r.brokenImages.length) issues.push('imágenes rotas: ' + r.brokenImages.join(', '));
    if (r.missingAlt.length) issues.push('sin alt: ' + r.missingAlt.join(', '));
    if (r.emptyLinks.length) issues.push('enlaces vacíos: ' + r.emptyLinks.join(', '));
    if (r.smallTargets.length) issues.push('objetivos táctiles pequeños: ' + r.smallTargets.join(', '));
    if (r.clippedText.length) issues.push('texto recortado: ' + r.clippedText.join(', '));
    if (r.fonts.length) issues.push('fuentes con error: ' + r.fonts.join(', '));
    if (consoleErrors.length) issues.push('errores de consola: ' + consoleErrors.join(' | '));
    if (requestFailures.length) issues.push('peticiones fallidas: ' + [...new Set(requestFailures)].join(', '));
    if (!r.h1) issues.push('sin h1');
    const ok = issues.length === 0;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${label}${issues.length ? ' — ' + issues.join(' · ') : ''}`);
    if (!ok) problems.push({ name, label, issues });
  }
}

// Admin logueado
await setViewport(1440, 900);
await navigate(base + '/admin.html');
await evaluate(`fetch('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'kanba2026' }) }).then(r => r.status)`);
for (const [label, w, h] of sizes) {
  consoleErrors.length = 0;
  requestFailures.length = 0;
  await setViewport(w, h);
  await navigate(base + '/admin.html');
  await sleep(1200);
  const r = await evaluate(auditProbe);
  checks++;
  const issues = [];
  if (r.brokenImages.length) issues.push('imágenes rotas: ' + r.brokenImages.join(', '));
  if (r.missingAlt.length) issues.push('sin alt: ' + r.missingAlt.join(', '));
  if (r.emptyLinks.length) issues.push('enlaces vacíos: ' + r.emptyLinks.join(', '));
  if (r.smallTargets.length) issues.push('objetivos táctiles pequeños: ' + r.smallTargets.join(', '));
  if (r.clippedText.length) issues.push('texto recortado: ' + r.clippedText.join(', '));
  if (consoleErrors.length) issues.push('errores de consola: ' + consoleErrors.join(' | '));
  if (requestFailures.length) issues.push('peticiones fallidas: ' + [...new Set(requestFailures)].join(', '));
  const ok = issues.length === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  Admin ${label}${issues.length ? ' — ' + issues.join(' · ') : ''}`);
  if (!ok) problems.push({ name: 'Admin', label, issues });
}

ws.close();
chrome.kill();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* noop */ }

console.log(`\n${checks - problems.length}/${checks} comprobaciones correctas.`);
if (problems.length) {
  console.log('\nHallazgos:');
  for (const p of problems) console.log(`- ${p.name} ${p.label}: ${p.issues.join(' · ')}`);
  process.exitCode = 1;
}
