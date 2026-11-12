/**
 * E2E: hold expiry worker.
 *   node scripts/e2e-expiry.mjs create
 *   node scripts/e2e-expiry.mjs check <code> <token>
 * Between both calls, restart the server with holdExpiresAt forced to the past.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.env.BASE_URL || 'http://localhost:3000';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbFile = path.join(root, 'data', 'db.json');
const mode = process.argv[2] || 'create';

async function json(method, url, body) {
  const res = await fetch(base + url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

if (mode === 'create') {
  const date = process.env.TEST_DATE || '2026-11-20';
  const time = process.env.TEST_TIME || '08:30';
  const before = await json('GET', `/api/availability?tour=candela&from=${date}&days=1`);
  const slotBefore = before.data?.daysList?.[0]?.tours?.[0]?.departures?.find((t) => t.time === time);

  const created = await json('POST', '/api/reservations', {
    tourId: 'candela',
    date,
    time,
    participants: 2,
    customer: {
      name: 'Prueba Expiración',
      email: 'expiracion@example.com',
      phone: '5555-0101',
      country: 'Guatemala',
      document: 'TEST-EXP-01',
      notes: 'Reserva automática para probar la liberación de cupos.',
      acceptPolicies: true,
      acceptTerms: true
    }
  });
  if (created.status !== 201) {
    console.error('No se pudo crear la reserva:', created.status, created.data);
    process.exit(1);
  }
  console.log(JSON.stringify({
    code: created.data.code,
    token: created.data.token,
    date,
    time,
    participants: 2,
    takenBefore: slotBefore?.taken,
    leftBefore: slotBefore?.left,
    holdExpiresAt: created.data.holdExpiresAt
  }, null, 2));
} else if (mode === 'check') {
  const [, , , code, token] = process.argv;
  if (!code || !token) {
    console.error('Uso: node scripts/e2e-expiry.mjs check <code> <token>');
    process.exit(1);
  }
  const res = await json('GET', `/api/reservations/${code}?token=${encodeURIComponent(token)}`);
  const r = res.data?.reservation || res.data;
  const status = r?.status;
  const ok = res.status === 200 && status === 'expired' && r?.payment?.status === 'expired';
  console.log(`${ok ? 'PASS' : 'FAIL'}  reservation ${code} status=${status} payment=${r?.payment?.status} — HTTP ${res.status}`);

  let seatsOk = true;
  if (r?.date && r?.time) {
    const tourId = r.tourId || r.tour?.id;
    const av = await json('GET', `/api/availability?tour=${tourId}&from=${r.date}&days=1`);
    const tour = av.data?.daysList?.[0]?.tours?.find((t) => t.tourId === tourId);
    const slot = tour?.departures?.find((t) => t.time === r.time);
    seatsOk = Boolean(slot) && slot.left === slot.capacity;
    console.log(`INFO  seats now: taken=${slot?.taken} left=${slot?.left} (capacity ${slot?.capacity})`);
    console.log(`${seatsOk ? 'PASS' : 'FAIL'}  seats released to full capacity`);
  }

  const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  const stored = db.reservations.find((x) => x.code === code);
  const historyOk = stored?.history?.some((h) => h.type === 'expired');
  console.log(`${historyOk ? 'PASS' : 'FAIL'}  history entry type=expired present`);
  console.log(`${stored?.status === 'expired' ? 'PASS' : 'FAIL'}  persisted status=expired (${stored?.status})`);
  process.exitCode = ok && historyOk && seatsOk && stored?.status === 'expired' ? 0 : 1;
} else {
  console.error('Modo desconocido. Usa create | check.');
  process.exit(1);
}
