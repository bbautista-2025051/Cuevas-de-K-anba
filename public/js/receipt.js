/* ==========================================================================
   K’anba · comprobante digital
   ========================================================================== */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  let context = { code: '', token: '' };

  const money = (value) => `Q${Number(value || 0).toFixed(2)}`;

  function text(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value === undefined || value === null || value === '' ? '—' : value;
  }

  function formatDate(date, withTime = false) {
    if (!date) return '—';
    const iso = String(date).length === 10 ? `${date}T12:00:00` : date;
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return date;
    return new Intl.DateTimeFormat('es-GT', withTime
      ? { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(parsed);
  }

  async function api(url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    let data = null;
    try { data = await res.json(); } catch { /* vacío */ }
    if (!res.ok) {
      const error = new Error(data?.error?.message || 'No pudimos cargar el comprobante.');
      error.status = res.status;
      throw error;
    }
    return data;
  }

  function showState(tone, title, message, actions) {
    const wrap = $('#receiptWrap');
    const panel = $('#receiptState');
    if (wrap) wrap.hidden = true;
    if (!panel) return;
    panel.hidden = false;
    const icon = $('#receiptStateIcon');
    if (icon) icon.className = `state-icon ${tone}`;
    $('#receiptStateTitle').textContent = title;
    $('#receiptStateText').textContent = message;
    const box = $('#receiptStateActions');
    box.replaceChildren();
    actions.forEach((action) => {
      const link = document.createElement('a');
      link.className = `btn ${action.variant || 'btn-primary'}`;
      link.href = action.href;
      link.textContent = action.label;
      box.append(link);
    });
  }

  function render(receipt) {
    const wrap = $('#receiptWrap');
    if (wrap) wrap.hidden = false;
    const panel = $('#receiptState');
    if (panel) panel.hidden = true;

    const reservation = receipt.reservation || {};
    const tour = receipt.tour || reservation.tour || {};
    const business = receipt.business || {};
    const breakdown = receipt.breakdown || {};
    const payment = receipt.payment || reservation.payment || {};

    document.title = `Comprobante ${receipt.receiptNumber} · K’anba Cuevas Vivas`;

    text('businessName', business.legalName || 'K’anba Cuevas Vivas · Operadora local');
    text('businessDetails', `${business.address || 'Lanquín, Alta Verapaz, Guatemala'} · NIT ${business.nit || '—'}`);
    text('businessEmail', business.email || 'reservas@kanba.gt');
    text('receiptNumber', receipt.receiptNumber);
    text('receiptDate', `Emitido: ${formatDate(receipt.issuedAt, true)}`);
    text('receiptStatus', reservation.status === 'confirmed' ? 'Pago aprobado' : reservation.status);

    text('customerName', reservation.customer?.name);
    text('customerEmail', reservation.customer?.email);
    text('customerPhone', reservation.customer?.phone);
    text('customerCountry', reservation.customer?.country);

    text('reservationCode', reservation.code);
    text('reservationTour', tour.name || 'Experiencia K’anba');
    text('reservationDate', `${reservation.dateLong || formatDate(reservation.date)} · ${reservation.time || ''}`);
    text('reservationPax', `${reservation.participants} ${reservation.participants === 1 ? 'participante' : 'participantes'}`);

    const lines = $('#receiptLines');
    if (lines) {
      lines.replaceChildren();
      const row = document.createElement('tr');
      const desc = document.createElement('td');
      desc.textContent = tour.name || 'Experiencia K’anba';
      const note = document.createElement('small');
      note.textContent = 'Guía local, candela, casco, chaleco salvavidas y entrada';
      desc.append(note);
      const qty = document.createElement('td');
      qty.textContent = String(reservation.participants || 1);
      const unit = document.createElement('td');
      unit.textContent = money(reservation.unitPrice);
      const amount = document.createElement('td');
      amount.textContent = money(reservation.total);
      row.append(desc, qty, unit, amount);
      lines.append(row);
    }

    text('subtotal', money(breakdown.subtotal));
    text('tax', money(breakdown.tax));
    text('total', money(breakdown.total));
    text('paymentMethod', payment.brand ? `${payment.brand} ****${payment.last4 || ''}` : 'Tarjeta');
    text('paymentReference', payment.reference || '—');
    text('paymentProvider', payment.provider || 'KanbaPay Sandbox');
    text('paymentDate', formatDate(payment.paidAt || reservation.paidAt, true));

    const back = $('#backConfirm');
    if (back) back.href = `/confirmacion.html?code=${encodeURIComponent(context.code)}&token=${encodeURIComponent(context.token)}`;
    const manage = $('#goReservation');
    if (manage) manage.href = `/mi-reserva.html?code=${encodeURIComponent(context.code)}&token=${encodeURIComponent(context.token)}`;
    const verify = $('#verifyLink');
    if (verify) verify.href = `/verificar.html?code=${encodeURIComponent(context.code)}`;
  }

  async function load() {
    const params = new URLSearchParams(window.location.search);
    context.code = (params.get('code') || '').trim().toUpperCase();
    context.token = (params.get('token') || '').trim();

    if (!context.code || !context.token) {
      showState('rust', 'Falta el enlace del comprobante', 'Abre el enlace que recibiste por correo o consulta tu reserva con el código y el correo del titular.', [
        { label: 'Consultar mi reserva', href: '/mi-reserva.html' },
        { label: 'Volver al inicio', href: '/', variant: 'btn-outline' }
      ]);
      return;
    }

    try {
      const data = await api(`/api/receipt/${encodeURIComponent(context.code)}?token=${encodeURIComponent(context.token)}`);
      render(data.receipt);
    } catch (error) {
      const notPaid = error.status === 409;
      showState(
        notPaid ? 'amber' : 'rust',
        notPaid ? 'El comprobante todavía no está disponible' : 'No pudimos abrir el comprobante',
        notPaid
          ? 'El comprobante se emite cuando la pasarela aprueba el pago. Si tu pago está en proceso, vuelve a intentarlo en unos minutos.'
          : error.status === 403
            ? 'El enlace del comprobante no es válido. Verifica que lo hayas copiado completo.'
            : error.message,
        [
          { label: 'Consultar mi reserva', href: '/mi-reserva.html' },
          { label: 'Volver al inicio', href: '/', variant: 'btn-outline' }
        ]
      );
    }
  }

  function init() {
    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());
    $('#printReceipt')?.addEventListener('click', () => window.print());
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
