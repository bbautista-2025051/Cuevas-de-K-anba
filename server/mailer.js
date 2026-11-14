import fs from 'node:fs';
import path from 'node:path';
import { getDb, saveDb, ensureOutbox, formatDateLong, dateToEpoch } from './store.js';
import { sendSmtpMail } from './smtp.js';

const money = (n, currency = 'GTQ') =>
  new Intl.NumberFormat('es-GT', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(n || 0));

function baseUrl() {
  const d = getDb();
  return (
    d.settings.business.siteUrl ||
    process.env.PUBLIC_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function layout({ preheader, title, body, cta, ctaUrl, note }) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f2ede2;font-family:Georgia,'Times New Roman',serif;color:#16211d;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader || '')}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2ede2;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#fffdf7;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px rgba(14,36,32,.14);">
  <tr><td style="background:#0e2420;padding:26px 34px;">
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#b8d98c;">K’anba · Cuevas Vivas</div>
    <div style="font-family:Georgia,serif;font-size:27px;color:#f6f1e6;margin-top:6px;line-height:1.1;">Donde el río se esconde</div>
  </td></tr>
  <tr><td style="padding:34px 34px 10px;">
    <h1 style="font-family:Georgia,serif;font-size:30px;line-height:1.15;margin:0 0 14px;color:#0e2420;font-weight:normal;">${esc(title)}</h1>
    ${body}
    ${cta ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 8px;"><tr><td style="border-radius:999px;background:#2f6b57;">
      <a href="${esc(ctaUrl)}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#fffdf7;text-decoration:none;border-radius:999px;">${esc(cta)}</a>
    </td></tr></table>` : ''}
  </td></tr>
  <tr><td style="padding:16px 34px 30px;">
    ${note ? `<div style="background:#f2ede2;border-radius:12px;padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#4a5b53;">${note}</div>` : ''}
  </td></tr>
  <tr><td style="background:#0e2420;padding:22px 34px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#a9bdb3;">
    <strong style="color:#f6f1e6;">K’anba Cuevas Vivas</strong><br>
    Lanquín, Alta Verapaz, Guatemala · +502 4000 2026<br>
    <a href="${baseUrl()}" style="color:#b8d98c;text-decoration:none;">kanba.gt</a> · Este es un correo transaccional generado automáticamente.
  </td></tr>
</table>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#8a9a92;padding:16px 8px;">Sitio y sistema demostrativos. No es el sitio oficial de las Cuevas de K’anba.</div>
</td></tr></table></body></html>`;
}

function reservationTable(r, { showPayment = false } = {}) {
  const rows = [
    ['Reserva', r.code],
    ['Tour', r.tourName],
    ['Fecha', formatDateLong(r.date)],
    ['Horario', `${r.time} h (GMT-6)`],
    ['Participantes', String(r.participants)],
    ['Punto de encuentro', r.meetingPoint || 'Recepción K’anba · desvío antes del puente']
  ];
  if (showPayment) {
    rows.push(['Método de pago', r.payment?.brand ? `${r.payment.brand} ····${r.payment.last4}` : 'Pasarela en línea']);
    rows.push(['Referencia', r.payment?.reference || '—']);
  }
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;border-top:1px solid #e4ddcd;border-bottom:1px solid #e4ddcd;">
    ${rows.map(([k, v]) => `<tr>
      <td style="padding:9px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7b8c83;width:42%;">${esc(k)}</td>
      <td style="padding:9px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#16211d;text-align:right;">${esc(v)}</td>
    </tr>`).join('')}
    <tr>
      <td style="padding:14px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#7b8c83;">Total</td>
      <td style="padding:14px 0 8px;text-align:right;font-family:Georgia,serif;font-size:24px;color:#0e2420;">${money(r.total, r.currency)}</td>
    </tr>
  </table>`;
}

const p = 'font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#33443c;margin:0 0 14px;';

function templates(r, extra = {}) {
  const url = baseUrl();
  const receiptUrl = `${url}/comprobante.html?code=${encodeURIComponent(r.code)}&token=${encodeURIComponent(r.token)}`;
  const confirmUrl = `${url}/confirmacion.html?code=${encodeURIComponent(r.code)}&token=${encodeURIComponent(r.token)}`;
  const payUrl = `${url}/pago.html?code=${encodeURIComponent(r.code)}&token=${encodeURIComponent(r.token)}`;
  const manageUrl = `${url}/mi-reserva.html?code=${encodeURIComponent(r.code)}&email=${encodeURIComponent(r.customer.email)}`;
  const minutes = extra.holdMinutes || 20;

  return {
    pending: {
      subject: `Completa tu pago · ${r.code} · K’anba`,
      preheader: `Tus cupos están bloqueados por ${minutes} minutos.`,
      title: 'Tus cupos están apartados',
      body: `<p style="${p}">Hola ${esc(r.customer.name)},</p>
        <p style="${p}">Recibimos tu solicitud para <strong>${esc(r.tourName)}</strong>. Bloqueamos tus cupos durante <strong>${minutes} minutos</strong>. La reserva se confirma únicamente cuando la pasarela aprueba el pago.</p>
        ${reservationTable(r)}
        <p style="${p}">Si el plazo vence, los cupos se liberan automáticamente y la reserva expira. Puedes intentarlo de nuevo desde la página.</p>`,
      cta: 'Completar el pago',
      ctaUrl: payUrl,
      note: `<strong>Importante:</strong> el bloqueo vence el ${esc(new Date(r.holdExpiresAt).toLocaleString('es-GT', { timeZone: 'America/Guatemala' }))}. Lleva calzado que se pueda mojar y ropa de cambio.`
    },
    confirmation: {
      subject: `Reserva confirmada · ${r.code} · K’anba`,
      preheader: 'Tu pago fue aprobado. Nos vemos bajo tierra.',
      title: 'Estás dentro.',
      body: `<p style="${p}">Hola ${esc(r.customer.name)},</p>
        <p style="${p}">Tu pago fue aprobado y tu lugar en <strong>${esc(r.tourName)}</strong> está confirmado. Guarda este correo: tu número de reserva es <strong>${esc(r.code)}</strong>.</p>
        ${reservationTable(r, { showPayment: true })}
        <p style="${p}"><strong>Qué llevar:</strong> traje de baño puesto, ropa de cambio, toalla, calzado cerrado que se pueda mojar, bolsa impermeable y efectivo en billetes pequeños. Llega 20 minutos antes.</p>
        <p style="${p}">Adjuntamos el acceso a tu comprobante digital. También puedes gestionar o cancelar tu reserva desde “Mi reserva”.</p>`,
      cta: 'Ver mi comprobante',
      ctaUrl: receiptUrl,
      note: `Cancelación: 100% hasta 72 h antes, 50% entre 72 y 24 h, sin reembolso con menos de 24 h. <a href="${esc(manageUrl)}" style="color:#2f6b57;">Gestionar reserva</a>.`
    },
    receipt: {
      subject: `Comprobante ${r.receipt?.number || ''} · ${r.code} · K’anba`,
      preheader: 'Tu comprobante de pago digital.',
      title: 'Comprobante de pago',
      body: `<p style="${p}">Hola ${esc(r.customer.name)},</p>
        <p style="${p}">Este es tu comprobante digital por la reserva <strong>${esc(r.code)}</strong>. Puedes imprimirlo o guardarlo como PDF desde el enlace.</p>
        ${reservationTable(r, { showPayment: true })}
        <p style="${p}">Comprobante N.º <strong>${esc(r.receipt?.number || '—')}</strong> · Emitido el ${esc(new Date(r.receipt?.issuedAt || Date.now()).toLocaleDateString('es-GT', { timeZone: 'America/Guatemala' }))}.</p>`,
      cta: 'Abrir comprobante imprimible',
      ctaUrl: receiptUrl,
      note: 'Documento no fiscal para fines demostrativos. Conserva el comprobante y preséntalo en recepción junto con tu documento de identidad.'
    },
    expired: {
      subject: `Tu reserva expiró · ${r.code} · K’anba`,
      preheader: 'El plazo de pago venció y los cupos fueron liberados.',
      title: 'El río siguió su curso',
      body: `<p style="${p}">Hola ${esc(r.customer.name)},</p>
        <p style="${p}">El plazo para completar el pago de la reserva <strong>${esc(r.code)}</strong> venció. Los cupos fueron liberados automáticamente para otros visitantes.</p>
        <p style="${p}">No se realizó ningún cargo. Si aún quieres venir, puedes reservar de nuevo y elegir otro horario disponible.</p>`,
      cta: 'Reservar de nuevo',
      ctaUrl: `${url}/#reservar`,
      note: 'Si crees que esto es un error o el pago se cobró, escríbenos a reservas@kanba.gt con el número de reserva.'
    },
    cancellation: {
      subject: `Cancelación registrada · ${r.code} · K’anba`,
      preheader: extra.refund > 0 ? 'Tu solicitud de reembolso fue registrada.' : 'Tu reserva fue cancelada.',
      title: 'Cancelación registrada',
      body: `<p style="${p}">Hola ${esc(r.customer.name)},</p>
        <p style="${p}">Registramos la cancelación de tu reserva <strong>${esc(r.code)}</strong> para <strong>${esc(r.tourName)}</strong> del ${esc(formatDateLong(r.date))}.</p>
        ${reservationTable(r)}
        <p style="${p}"><strong>Política aplicada:</strong> ${esc(extra.policy || '—')}.<br>
        <strong>Importe de reembolso:</strong> ${money(extra.refund || 0, r.currency)}.</p>
        ${extra.refund > 0
          ? `<p style="${p}">El reembolso quedó registrado con estado <strong>pendiente</strong> y se procesará al medio de pago original en un plazo de 5 a 10 días hábiles. Te enviaremos otro correo cuando esté procesado.</p>`
          : `<p style="${p}">Según la política vigente, esta cancelación no genera reembolso. Si fue por una emergencia, responde a este correo y revisaremos tu caso.</p>`}`,
      cta: 'Ver políticas',
      ctaUrl: `${url}/#politicas`,
      note: 'Motivo registrado: ' + esc(extra.reason || 'No especificado') + '.'
    },
    refund: {
      subject: `Reembolso procesado · ${r.code} · K’anba`,
      preheader: 'Tu reembolso fue procesado.',
      title: 'Reembolso procesado',
      body: `<p style="${p}">Hola ${esc(r.customer.name)},</p>
        <p style="${p}">Procesamos el reembolso de tu reserva <strong>${esc(r.code)}</strong> por <strong>${money(extra.amount || 0, r.currency)}</strong>.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;border-top:1px solid #e4ddcd;border-bottom:1px solid #e4ddcd;">
          <tr><td style="padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7b8c83;">Referencia</td><td style="padding:10px 0;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:13px;">${esc(extra.reference || '—')}</td></tr>
          <tr><td style="padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7b8c83;">Método</td><td style="padding:10px 0;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:13px;">${esc(extra.method || 'Medio de pago original')}</td></tr>
          <tr><td style="padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7b8c83;">Importe</td><td style="padding:10px 0;text-align:right;font-family:Georgia,serif;font-size:21px;">${money(extra.amount || 0, r.currency)}</td></tr>
        </table>
        <p style="${p}">El abono puede tardar de 5 a 10 días hábiles en reflejarse, según tu banco o emisor de tarjeta.</p>`,
      cta: 'Contactar soporte',
      ctaUrl: `mailto:reservas@kanba.gt?subject=${encodeURIComponent('Reembolso ' + r.code)}`,
      note: 'Gracias por viajar con guías locales. Esperamos verte en otra temporada.'
    }
  };
}

function plainText({ title, body }) {
  return `${title}\n\n${body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}\n\nK’anba Cuevas Vivas · Lanquín, Alta Verapaz, Guatemala\n`;
}

export async function sendMail({ to, template, reservation, extra = {} }) {
  const d = getDb();
  const tpl = templates(reservation, extra)[template];
  if (!tpl) throw new Error(`Plantilla de correo desconocida: ${template}`);

  const html = layout({
    preheader: tpl.preheader,
    title: tpl.title,
    body: tpl.body,
    cta: tpl.cta,
    ctaUrl: tpl.ctaUrl,
    note: tpl.note
  });
  const text = plainText(tpl);
  const record = {
    id: `mail_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    to,
    subject: tpl.subject,
    template,
    reservationCode: reservation.code,
    status: 'queued',
    provider: 'outbox',
    createdAt: new Date().toISOString(),
    html,
    text,
    error: null
  };
  d.emails.unshift(record);
  if (d.emails.length > 500) d.emails.length = 500;
  saveDb();

  const smtp = d.settings.smtp || {};
  if (smtp.host && smtp.user) {
    try {
      await sendSmtpMail({
        host: smtp.host,
        port: Number(smtp.port || 465),
        secure: smtp.secure !== false,
        user: smtp.user,
        pass: smtp.pass,
        fromEmail: smtp.fromEmail || 'reservas@kanba.gt',
        fromName: smtp.fromName || 'K’anba Reservas',
        to,
        subject: tpl.subject,
        html,
        text
      });
      record.status = 'sent';
      record.provider = 'smtp';
    } catch (err) {
      record.status = 'failed';
      record.provider = 'smtp';
      record.error = err.message;
      console.error('[mail] SMTP falló, el correo queda en la bandeja de salida:', err.message);
    }
  } else {
    record.status = 'sent';
    record.provider = 'outbox';
  }

  try {
    const dir = ensureOutbox();
    const safe = record.id.replace(/[^a-z0-9_-]/gi, '');
    const eml = [
      `From: "K’anba Reservas" <reservas@kanba.gt>`,
      `To: ${to}`,
      `Subject: ${tpl.subject}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${record.id}@kanba.gt>`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="kanba-${safe}"`,
      '',
      `--kanba-${safe}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      text,
      '',
      `--kanba-${safe}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      html,
      '',
      `--kanba-${safe}--`,
      ''
    ].join('\r\n');
    fs.writeFileSync(path.join(dir, `${safe}.eml`), eml, 'utf8');
  } catch (err) {
    console.error('[mail] no se pudo escribir el .eml:', err.message);
  }

  saveDb();
  return record;
}

export function resendMail(reservation, template) {
  const extra = {
    holdMinutes: getDb().settings.booking.holdMinutes,
    refund: reservation.cancellation?.refundAmount || 0,
    policy: reservation.cancellation?.policy,
    reason: reservation.cancellation?.reason,
    amount: reservation.cancellation?.refundAmount || 0,
    reference: reservation.refund?.reference,
    method: reservation.refund?.method
  };
  return sendMail({ to: reservation.customer.email, template, reservation, extra });
}

export async function notifyPending(r) {
  return sendMail({
    to: r.customer.email,
    template: 'pending',
    reservation: r,
    extra: { holdMinutes: getDb().settings.booking.holdMinutes }
  });
}

export async function notifyConfirmed(r) {
  await sendMail({ to: r.customer.email, template: 'confirmation', reservation: r });
  await sendMail({ to: r.customer.email, template: 'receipt', reservation: r });
}

export async function notifyExpired(r) {
  return sendMail({ to: r.customer.email, template: 'expired', reservation: r });
}

export async function notifyCancellation(r, extra) {
  return sendMail({ to: r.customer.email, template: 'cancellation', reservation: r, extra });
}

export async function notifyRefund(r, refund) {
  return sendMail({
    to: r.customer.email,
    template: 'refund',
    reservation: r,
    extra: {
      amount: refund.amount,
      reference: refund.reference,
      method: refund.method
    }
  });
}

export function reminderWindow(r) {
  const hours = (dateToEpoch(r.date, r.time) - Date.now()) / 3600000;
  return hours;
}
