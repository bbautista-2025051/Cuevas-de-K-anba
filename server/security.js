import crypto from 'node:crypto';

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, stored) {
  if (!stored?.salt || !stored?.hash) return false;
  const candidate = crypto.scryptSync(String(password), stored.salt, 64);
  const expected = Buffer.from(stored.hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

export function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function signPayload(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifySignature(secret, payload, signature) {
  const expected = signPayload(secret, payload);
  return safeEqual(expected, signature || '');
}
