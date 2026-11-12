/**
 * Captura de pantallas para revisión visual.
 * Uso: node scripts/screenshots.mjs [baseUrl] [outDir]
 * Genera PNG por página y tamaño en el directorio indicado.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const base = process.argv[2] || 'http://localhost:3000';
const outDir = process.argv[3] || path.join(os.tmpdir(), 'kanba-shots');
fs.mkdirSync(outDir, { recursive: true });

const chromePath = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe')
].find((p) => p && fs.existsSync(p));

if (!chromePath) {
  console.error('Chrome no encontrado.');
  process.exit(1);
}

const port = 9600 + Math.floor(Math.random() * 200);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'kanba-shot-'));
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
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`));
    else resolve(msg.result);
  } else if (msg.method) {
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
  await send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: width < 600
  });
}

async function navigate(url) {
  const loaded = once('Page.loadEventFired');
  await send('Page.navigate', { url });
  await loaded;
  await sleep(900);
  await evaluate(`window.scrollTo(0, 0)`);
  await sleep(250);
}

async function shot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const file = path.join(outDir, name + '.png');
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  console.log('OK ' + file);
}

async function scrollTo(selector) {
  await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (el) el.scrollIntoView({ block: 'start' });
    return !!el;
  })()`);
  await sleep(700);
}

await send('Page.enable');
await send('Runtime.enable');

// Portada escritorio: hero, experiencias, galería, reservas
await setViewport(1440, 900);
await navigate(base + '/');
await shot('01-portada-hero-desktop');
for (const [sel, name] of [
  ['#experiencias', '02-portada-experiencias-desktop'],
  ['#galeria', '03-portada-galeria-desktop'],
  ['#reservar', '04-portada-reservas-desktop'],
  ['#mapa', '05-portada-mapa-desktop']
]) {
  await scrollTo(sel);
  await shot(name);
}

// Portada móvil
await setViewport(390, 844);
await navigate(base + '/');
await shot('06-portada-hero-phone');
await scrollTo('#reservar');
await shot('07-portada-reservas-phone');

// Página de pago
await setViewport(1440, 900);
await navigate(base + '/pago.html');
await shot('08-pago-desktop');
await setViewport(390, 844);
await navigate(base + '/pago.html');
await shot('09-pago-phone');

// Mi reserva / verificar
await setViewport(1440, 900);
await navigate(base + '/mi-reserva.html');
await shot('10-mi-reserva-desktop');
await navigate(base + '/verificar.html');
await shot('11-verificar-desktop');

// Admin: login y panel
await setViewport(1440, 900);
await navigate(base + '/admin.html');
await shot('12-admin-login-desktop');
await evaluate(`fetch('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'kanba2026' }) }).then(r => r.status)`);
await navigate(base + '/admin.html');
await sleep(800);
await shot('13-admin-panel-desktop');

await setViewport(390, 844);
await navigate(base + '/admin.html');
await sleep(600);
await shot('14-admin-panel-phone');

ws.close();
chrome.kill();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* noop */ }
console.log('\nCapturas en: ' + outDir);
