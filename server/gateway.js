/**
 * Pasarela de pagos K’anbaPay (modo sandbox).
 *
 * La interfaz está aislada para poder sustituirla por la pasarela acordada
 * (Stripe, Recurrente, BAC Credomatic, etc.) sin tocar el flujo de reservas.
 * Contrato:
 *   createIntent(reservation) -> { intentId, provider, status, amount, currency }
 *   charge(intent, cardData)   -> { approved, brand, last4, reference, message, code }
 */

export function detectBrand(number = '') {
  const n = String(number).replace(/\D/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^6/.test(n)) return 'Discover';
  return 'Tarjeta';
}

export function luhnValid(number = '') {
  const n = String(number).replace(/\D/g, '');
  if (n.length < 13 || n.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i]);
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function validateCard({ number, name, expiry, cvc }) {
  const digits = String(number || '').replace(/\D/g, '');
  const errors = {};
  if (!name || String(name).trim().length < 3) errors.name = 'Nombre del titular requerido.';
  if (!luhnValid(digits)) errors.number = 'Número de tarjeta inválido.';
  if (!/^\d{2}\s*\/\s*\d{2}$/.test(String(expiry || '').trim())) {
    errors.expiry = 'Usa el formato MM/AA.';
  } else {
    const [mm, yy] = String(expiry).split('/').map((x) => Number(x.trim()));
    if (mm < 1 || mm > 12) errors.expiry = 'Mes inválido.';
    else {
      const end = new Date(2000 + yy, mm, 1).getTime();
      if (end <= Date.now()) errors.expiry = 'La tarjeta está vencida.';
    }
  }
  if (!/^\d{3,4}$/.test(String(cvc || '').trim())) errors.cvc = 'CVV inválido.';
  return { valid: Object.keys(errors).length === 0, errors, digits };
}

export function createIntent(reservation, provider = 'KanbaPay Sandbox') {
  return {
    intentId: reservation.payment?.intentId || `pi_${Math.random().toString(36).slice(2, 12)}`,
    provider,
    status: 'requires_payment',
    amount: reservation.total,
    currency: reservation.currency
  };
}

/**
 * Cobro simulado. Reglas de prueba:
 *  - Cualquier tarjeta con Luhn válido es aprobada.
 *  - Terminación 0002 => rechazo (fondos insuficientes).
 *  - Terminación 0003 => rechazo (requiere autenticación).
 */
export function charge({ reservation, card, provider = 'KanbaPay Sandbox' }) {
  const { valid, errors, digits } = validateCard(card);
  if (!valid) {
    return {
      approved: false,
      code: 'invalid_card',
      message: Object.values(errors)[0],
      errors,
      brand: detectBrand(digits),
      last4: digits.slice(-4)
    };
  }
  const last4 = digits.slice(-4);
  const brand = detectBrand(digits);
  if (last4 === '0002') {
    return { approved: false, code: 'insufficient_funds', message: 'La pasarela rechazó el pago: fondos insuficientes. Prueba otra tarjeta.', brand, last4 };
  }
  if (last4 === '0003') {
    return { approved: false, code: 'authentication_required', message: 'La pasarela solicita autenticación adicional. Usa otra tarjeta de prueba.', brand, last4 };
  }
  if (String(card.number).replace(/\D/g, '') === '4000000000000069') {
    return { approved: false, code: 'expired_card', message: 'La pasarela indica que la tarjeta está vencida.', brand, last4 };
  }
  return {
    approved: true,
    code: 'approved',
    message: 'Pago aprobado',
    brand,
    last4,
    reference: `PAY-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    provider,
    amount: reservation.total,
    currency: reservation.currency
  };
}
