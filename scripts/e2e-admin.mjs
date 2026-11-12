/**
 * E2E: admin content/settings round-trip and image upload.
 * Usage: node scripts/e2e-admin.mjs [baseUrl] [password]
 */
const base = process.argv[2] || 'http://localhost:3000';
const password = process.argv[3] || 'kanba2026';

let cookie = '';

async function call(method, path, body, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (cookie) headers.cookie = cookie;
  let payload;
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(base + path, { method, headers, body: payload });
  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length) cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON */ }
  return { status: res.status, json, text };
}

function check(name, condition, detail) {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!condition) process.exitCode = 1;
}

const login = await call('POST', '/api/admin/login', { password });
check('login', login.status === 200 && login.json?.ok, `HTTP ${login.status}`);
if (login.status !== 200) process.exit(1);

const contentRes = await call('GET', '/api/admin/content');
check('GET content', contentRes.status === 200 && contentRes.json?.content, `HTTP ${contentRes.status}`);
const content = contentRes.json.content;

// Round-trip a deep copy with a modified nested field.
const marker = `Prueba E2E ${new Date().toISOString()}`;
const mutated = structuredClone(content);
mutated.brand.tagline = marker;
const putContent = await call('PUT', '/api/admin/content', { content: mutated });
check('PUT content nested field', putContent.status === 200 && putContent.json?.content?.brand?.tagline === marker, `HTTP ${putContent.status} ${putContent.text.slice(0, 160)}`);
const pubSite = await call('GET', '/api/site');
check('Public /api/site reflects saved content', pubSite.json?.brand?.tagline === marker);

// Restore original content.
const restore = await call('PUT', '/api/admin/content', { content });
check('Restore original content', restore.status === 200 && restore.json?.content?.brand?.tagline === content.brand.tagline, `HTTP ${restore.status}`);

const settingsRes = await call('GET', '/api/admin/settings');
check('GET settings', settingsRes.status === 200 && settingsRes.json?.settings, `HTTP ${settingsRes.status}`);
const settings = settingsRes.json.settings;
const originalExchange = settings.booking.exchangeRate;
const mutatedSettings = structuredClone(settings);
mutatedSettings.booking.exchangeRate = Number(originalExchange) + 0.25;
const putSettings = await call('PUT', '/api/admin/settings', { settings: mutatedSettings });
check('PUT settings nested field', putSettings.status === 200 && putSettings.json?.settings?.booking?.exchangeRate === Number(originalExchange) + 0.25, `HTTP ${putSettings.status} ${putSettings.text.slice(0, 160)}`);
const restoreSettings = await call('PUT', '/api/admin/settings', { settings });
check('Restore original settings', restoreSettings.status === 200 && restoreSettings.json?.settings?.booking?.exchangeRate === Number(originalExchange), `HTTP ${restoreSettings.status}`);

// Real image upload (smallest gallery photo).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imgName = fs.readdirSync(path.join(root, 'public/assets/img')).filter((n) => /\.(jpe?g|png)$/i.test(n))
  .sort((a, b) => fs.statSync(path.join(root, 'public/assets/img', a)).size - fs.statSync(path.join(root, 'public/assets/img', b)).size)[0];
const imgBuf = fs.readFileSync(path.join(root, 'public/assets/img', imgName));
const mime = /\.png$/i.test(imgName) ? 'image/png' : 'image/jpeg';
const upload = await call('POST', '/api/admin/media', { dataUrl: `data:${mime};base64,${imgBuf.toString('base64')}` });
check('POST media upload', upload.status === 201 && upload.json?.url?.startsWith('/uploads/'), `HTTP ${upload.status} ${upload.text.slice(0, 160)}`);
if (upload.json?.url) {
  const asset = await fetch(base + upload.json.url);
  check('Uploaded file is served', asset.status === 200, `HTTP ${asset.status}`);
}

// Reject non-image payloads.
const badUpload = await call('POST', '/api/admin/media', { dataUrl: 'data:text/plain;base64,aGVsbG8=' });
check('Reject invalid media type', badUpload.status === 422, `HTTP ${badUpload.status}`);

const logout = await call('POST', '/api/admin/logout');
check('logout', logout.status === 200, `HTTP ${logout.status}`);
console.log(process.exitCode ? '\nSome checks failed.' : '\nAll admin checks passed.');
