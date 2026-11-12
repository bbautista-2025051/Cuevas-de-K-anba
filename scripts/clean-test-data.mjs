/**
 * One-off cleanup: removes E2E test reservations, refunds, emails and uploads.
 * Run while the server is stopped: node scripts/clean-test-data.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbFile = path.join(root, 'data', 'db.json');
const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));

const testCodes = new Set(['KAN-2026-01037', 'KAN-2026-01038', 'KAN-2026-01039', 'KAN-2026-01040']);
const testEmails = new Set(['prueba.e2e@example.com', 'reembolso.e2e@example.com', 'expiracion@example.com', 'ui-test@example.com']);

const before = {
  reservations: db.reservations.length,
  refunds: db.refunds.length,
  emails: db.emails.length
};

const removedEmails = db.emails.filter((e) => testCodes.has(e.reservationCode) || testEmails.has(e.to));
db.reservations = db.reservations.filter((r) => !testCodes.has(r.code) && !testEmails.has(r.customer?.email));
db.refunds = db.refunds.filter((r) => !testCodes.has(r.reservationCode) && !testEmails.has(r.customerEmail));
db.emails = db.emails.filter((e) => !removedEmails.includes(e));

fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));

// Remove outbox files for deleted emails.
const outbox = path.join(root, 'data', 'outbox');
let removedFiles = 0;
for (const mail of removedEmails) {
  const file = path.join(outbox, `${mail.id}.eml`);
  if (fs.existsSync(file)) {
    fs.rmSync(file);
    removedFiles += 1;
  }
}

// Remove orphan uploads (anything in public/uploads not referenced by content).
const uploads = path.join(root, 'public', 'uploads');
let removedUploads = 0;
if (fs.existsSync(uploads)) {
  const referenced = new Set();
  const walk = (value) => {
    if (typeof value === 'string') {
      if (value.startsWith('/uploads/')) referenced.add(value);
    } else if (Array.isArray(value)) {
      value.forEach(walk);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(walk);
    }
  };
  walk(db.content);
  walk(db.tours);
  for (const name of fs.readdirSync(uploads)) {
    if (!referenced.has(`/uploads/${name}`)) {
      fs.rmSync(path.join(uploads, name));
      removedUploads += 1;
    }
  }
}

console.log(JSON.stringify({
  before,
  after: { reservations: db.reservations.length, refunds: db.refunds.length, emails: db.emails.length },
  removedOutboxFiles: removedFiles,
  removedUploads
}, null, 2));
