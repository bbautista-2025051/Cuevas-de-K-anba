/**
 * Detalle de objetivos táctiles pequeños en móvil.
 * Uso: node scripts/tap-targets.mjs [baseUrl]
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
const port = 9900 + Math.floor(Math.random() * 80);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'kanba-tap-'));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wait() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/list`); if (r.ok) return await r.json(); } catch { /* noop */ }
    await sleep(150);
  }
  throw new Error('DevTools no respondió.');
}
const targets = await wait();
const target = targets.find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
const listeners = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); }
  else if (m.method) { const l = listeners.get(m.method) || []; listeners.set(m.method, []); l.forEach((f) => f(m.params)); }
});
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const once = (method) => new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error('timeout ' + method)), 20000); const f = (p) => { clearTimeout(t); resolve(p); }; listeners.set(method, [...(listeners.get(method) || []), f]); });
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
}
async function navigate(url) {
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const loaded = once('Page.loadEventFired');
  await send('Page.navigate', { url });
  await loaded;
  await sleep(900);
}

await send('Page.enable');
await send('Runtime.enable');

const probe = `(() => {
  const out = [];
  for (const el of document.querySelectorAll('a, button, [role=button], input[type=submit]')) {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (s.display === 'none' || s.visibility === 'hidden' || r.width === 0 || r.height === 0) continue;
    if (r.height >= 40 && r.width >= 40) continue;
    out.push({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      cls: (el.className || '').toString().slice(0, 70),
      text: el.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40),
      w: Math.round(r.width), h: Math.round(r.height),
      pad: s.padding, display: s.display, inline: s.display === 'inline'
    });
  }
  return out;
})()`;

for (const route of ['/', '/pago.html', '/mi-reserva.html', '/verificar.html', '/admin.html']) {
  await navigate(base + route);
  let list = await evaluate(probe);
  if (route === '/admin.html') {
    await evaluate(`fetch('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'kanba2026' }) })`);
    await navigate(base + '/admin.html');
    await sleep(1000);
    list = await evaluate(probe);
  }
  console.log(`\n=== ${route} ===`);
  for (const t of list) console.log(`${t.tag}${t.id ? '#' + t.id : ''}.${t.cls} | ${t.w}x${t.h} | display=${t.display} pad=${t.pad} | "${t.text}"`);
}

ws.close();
chrome.kill();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* noop */ }
