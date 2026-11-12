/**
 * Responsive QA via headless Chrome DevTools Protocol.
 * Usage: node scripts/responsive-check.mjs [baseUrl]
 * Checks horizontal overflow, mobile navigation behavior and key layout switches.
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

const port = 9333 + Math.floor(Math.random() * 200);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'kanba-cdp-'));
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
  await sleep(500);
}

async function reload() {
  const loaded = once('Page.loadEventFired');
  await send('Page.reload', { ignoreCache: true });
  await loaded;
  await sleep(600);
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const overflowProbe = `(() => {
  const doc = document.documentElement;
  const body = document.body;
  const vw = window.innerWidth;
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    if (s.position === 'fixed' || s.display === 'none' || s.visibility === 'hidden' || s.overflowX === 'auto' || s.overflowX === 'scroll') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 2 || r.left < -2) {
      offenders.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '') + ' [' + Math.round(r.left) + '→' + Math.round(r.right) + ']');
    }
  }
  return { vw, docScroll: doc.scrollWidth, bodyScroll: body.scrollWidth, offenders: offenders.slice(0, 8) };
})()`;

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');

const widths = [
  { label: 'desktop', width: 1440 },
  { label: 'tablet', width: 820 },
  { label: 'phone', width: 390 }
];

const publicPages = [
  ['/', 'Portada'],
  ['/mi-reserva.html', 'Mi reserva'],
  ['/verificar.html', 'Verificar comprobante'],
  ['/pago.html', 'Pago']
];

for (const [route, name] of publicPages) {
  for (const { label, width } of widths) {
    await setViewport(width);
    await navigate(base + route);
    const m = await evaluate(overflowProbe);
    check(`${name} ${label}: sin desbordamiento horizontal`, m.docScroll <= m.vw + 1 && m.bodyScroll <= m.vw + 1,
      `vw=${m.vw} doc=${m.docScroll} body=${m.bodyScroll}${m.offenders.length ? ' · ' + m.offenders.join(' | ') : ''}`);
  }
}

// Public mobile navigation
await setViewport(390, 844);
await navigate(base + '/');
const navBefore = await evaluate(`(() => {
  const t = document.getElementById('navToggle');
  const n = document.getElementById('mainNav');
  const bar = document.getElementById('mobileBar');
  return {
    toggle: t ? getComputedStyle(t).display : null,
    navVisible: n ? n.getBoundingClientRect().height > 0 && getComputedStyle(n).visibility !== 'hidden' : null,
    bar: bar ? getComputedStyle(bar).display : null,
    expanded: t?.getAttribute('aria-expanded')
  };
})()`);
check('Portada phone: botón de menú visible', navBefore.toggle && navBefore.toggle !== 'none', JSON.stringify(navBefore));
if (navBefore.toggle && navBefore.toggle !== 'none') {
  await evaluate(`document.getElementById('navToggle').click()`);
  await sleep(350);
  const navAfter = await evaluate(`(() => {
    const t = document.getElementById('navToggle');
    const n = document.getElementById('mainNav');
    const r = n.getBoundingClientRect();
    return { expanded: t.getAttribute('aria-expanded'), width: Math.round(r.width), height: Math.round(r.height), right: Math.round(r.right), vw: innerWidth, htmlClass: document.documentElement.className };
  })()`);
  check('Portada phone: el menú se abre al pulsar', navAfter.expanded === 'true' && navAfter.height > 0 && navAfter.right <= navAfter.vw + 1, JSON.stringify(navAfter));
  await evaluate(`document.getElementById('navToggle').click()`);
  await sleep(300);
  const navClosed = await evaluate(`document.getElementById('navToggle').getAttribute('aria-expanded')`);
  check('Portada phone: el menú se cierra al pulsar de nuevo', navClosed === 'false', `aria-expanded=${navClosed}`);
}

// Admin layout, logged in
await setViewport(1440, 900);
await navigate(base + '/admin.html');
const login = await evaluate(`fetch('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'kanba2026' }) }).then(r => r.status)`);
check('Admin login desde navegador', login === 200, `HTTP ${login}`);
await reload();
for (const { label, width } of widths) {
  await setViewport(width);
  await reload();
  const m = await evaluate(overflowProbe);
  check(`Admin ${label}: sin desbordamiento horizontal`, m.docScroll <= m.vw + 1 && m.bodyScroll <= m.vw + 1,
    `vw=${m.vw} doc=${m.docScroll} body=${m.bodyScroll}${m.offenders.length ? ' · ' + m.offenders.join(' | ') : ''}`);
  const layout = await evaluate(`(() => {
    const side = document.getElementById('adminSidebar');
    const toggle = document.getElementById('menuToggle');
    const s = side ? getComputedStyle(side) : null;
    return {
      sidebarPosition: s?.position,
      sidebarTransform: s?.transform,
      toggleDisplay: toggle ? getComputedStyle(toggle).display : null,
      mainLeft: Math.round(document.querySelector('.admin-main')?.getBoundingClientRect().left || 0)
    };
  })()`);
  if (label === 'desktop') {
    check('Admin desktop: sidebar persistente y sin botón móvil', ['fixed', 'sticky'].includes(layout.sidebarPosition) && layout.toggleDisplay === 'none', JSON.stringify(layout));
  } else if (label === 'phone') {
    check('Admin phone: botón de menú visible y sidebar fuera de pantalla', layout.toggleDisplay !== 'none' && layout.mainLeft < 20, JSON.stringify(layout));
    await evaluate(`document.getElementById('menuToggle').click()`);
    await sleep(400);
    const opened = await evaluate(`(() => {
      const side = document.getElementById('adminSidebar');
      const r = side.getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right), open: document.body.classList.contains('sidebar-open') || side.classList.contains('open') || side.getAttribute('aria-hidden') === 'false', classes: document.body.className };
    })()`);
    check('Admin phone: el menú lateral se abre', opened.left >= -1 && opened.right <= 390 + 1 && opened.right > 100, JSON.stringify(opened));
    await evaluate(`document.getElementById('sidebarClose')?.click()`);
    await sleep(350);
    const closed = await evaluate(`Math.round(document.getElementById('adminSidebar').getBoundingClientRect().right)`);
    check('Admin phone: el menú lateral se cierra', closed <= 1, `right=${closed}`);
  }
}

// Restore desktop and clean session
await setViewport(1440, 900);
await evaluate(`fetch('/api/admin/logout', { method: 'POST' })`);
ws.close();
chrome.kill();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* lock */ }

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} comprobaciones correctas.`);
if (failed.length) {
  console.log('Fallos:');
  failed.forEach((f) => console.log(` - ${f.name}: ${f.detail}`));
  process.exitCode = 1;
}
