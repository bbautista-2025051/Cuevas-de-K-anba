/* ==========================================================================
   K’anba · pago de la reserva (pasarela sandbox)
   ========================================================================== */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);

  const state = {
    code: '',
    token: '',
    reservation: null,
    timer: null,
    secondsLeft: 0,
    paying: false
  };

  const money = (value) => `Q${Number(value || 0).toFixed(2)}`;

  const STATUS_LABEL = {
    pending_payment: 'Pago pendiente',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    expired: 'Expirada'
  };

  function toast(message) {
    const node = $('#toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toast.__timer);
    toast.__timer = setTimeout(() => node.classList.remove('show'), 3600);
  }

  function busy(button, on) {
    if (!button) return;
    button.classList.toggle('is-loading', Boolean(on));
    button.disabled = Boolean(on);
  }

  async function api(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
    });
    let data = null;
    try { data = await res.json(); } catch { /* vacío */ }
    if (!res.ok) {
      const error = new Error(data?.error?.message || data?.message || 'No pudimos procesar el pago.');
      error.status = res.status;
      error.data = data;
      error.fields = data?.error?.fields || data?.fields || null;
      throw error;
    }
    return data;
  }

  const ICON_CLOCK = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v6M12 16.5v.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const ICON_CHECK = '<svg viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m8 12.2 2.7 2.7L16.4 9" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_X = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m9 9 6 6M15 9l-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  function showState({ tone = 'amber', title, text, actions = [] }) {
    const panel = $('#paymentPanel');
    const card = $('#stateCard');
    const icon = $('#stateIcon');
    const policy = $('#policyMini');
    const banner = $('#holdBanner');
    if (panel) panel.hidden = true;
    if (policy) policy.hidden = true;
    if (banner) banner.hidden = true;
    if (!card) return;
    card.hidden = false;
    if (icon) {
      icon.className = `state-icon ${tone}`;
      icon.innerHTML = tone === 'green' ? ICON_CHECK : tone === 'rust' ? ICON_X : ICON_CLOCK;
    }
    $('#stateTitle').textContent = title;
    $('#stateText').textContent = text;
    const wrap = $('#stateActions');
    if (wrap) {
      wrap.replaceChildren();
      actions.forEach((action) => {
        if (action.href) {
          const link = document.createElement('a');
          link.className = `btn ${action.variant || 'btn-primary'}`;
          link.href = action.href;
          link.textContent = action.label;
          wrap.append(link);
        } else {
          const button = document.createElement('button');
          button.className = `btn ${action.variant || 'btn-primary'}`;
          button.type = 'button';
          button.textContent = action.label;
          button.addEventListener('click', action.onClick);
          wrap.append(button);
        }
      });
    }
  }

  function renderOrder(reservation) {
    const content = $('#orderContent');
    const status = $('#orderStatus');
    if (!content) return;
    if (status) status.textContent = STATUS_LABEL[reservation.status] || reservation.status;
    content.replaceChildren();

    const tour = reservation.tour || {};
    const top = document.createElement('div');
    top.className = 'order-tour';
    if (tour.image) {
      const img = document.createElement('img');
      img.src = tour.image;
      img.alt = '';
      top.append(img);
    }
    const info = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = tour.name || reservation.code;
    const meta = document.createElement('span');
    meta.textContent = reservation.status === 'pending_payment'
      ? `${reservation.participants} ${reservation.participants === 1 ? 'persona' : 'personas'} · ${tour.duration || ''}`
      : `${reservation.dateLong} · ${reservation.time}`;
    info.append(name, meta);
    top.append(info);
    content.append(top);

    const lines = document.createElement('dl');
    lines.className = 'order-lines';
    const rows = [
      ['Código', reservation.code],
      ['Fecha', reservation.dateLong],
      ['Horario', reservation.time],
      ['Participantes', String(reservation.participants)],
      ['Precio unitario', money(reservation.unitPrice)],
      ['Titular', reservation.customer?.name || '—'],
      ['Correo', reservation.customer?.email || '—']
    ];
    rows.forEach(([label, value]) => {
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      row.append(dt, dd);
      lines.append(row);
    });
    content.append(lines);

    const total = document.createElement('div');
    total.className = 'order-total';
    const label = document.createElement('span');
    label.textContent = 'Total';
    const amount = document.createElement('strong');
    amount.textContent = money(reservation.total);
    total.append(label, amount);
    content.append(total);

    if (reservation.status === 'confirmed' && reservation.receipt) {
      const note = document.createElement('div');
      note.className = 'order-note';
      const strong = document.createElement('strong');
      strong.textContent = `Comprobante ${reservation.receipt.number}`;
      note.append(strong, document.createTextNode('Pago aprobado. Tu reserva está confirmada.'));
      content.append(note);
    } else if (reservation.status === 'pending_payment') {
      const note = document.createElement('div');
      note.className = 'order-note';
      const strong = document.createElement('strong');
      strong.textContent = 'Pago protegido';
      note.append(strong, document.createTextNode('Si el pago es rechazado, tus cupos siguen bloqueados hasta que venza el plazo.'));
      content.append(note);
    }

    const links = document.createElement('div');
    links.className = 'order-links';
    const mi = document.createElement('a');
    mi.href = `/mi-reserva.html?code=${encodeURIComponent(reservation.code)}&token=${encodeURIComponent(state.token)}`;
    mi.textContent = 'Gestionar mi reserva';
    const politicas = document.createElement('a');
    politicas.href = '/#politicas';
    politicas.textContent = 'Políticas de cancelación';
    links.append(mi, politicas);
    content.append(links);

    const provider = $('#providerName');
    if (provider) provider.textContent = reservation.payment?.provider || 'KanbaPay Sandbox';
  }

  function startCountdown(seconds) {
    state.secondsLeft = Math.max(0, Number(seconds) || 0);
    const ring = $('#holdRing');
    const output = $('#countdown');
    const banner = $('#holdBanner');
    if (banner) banner.hidden = false;
    const paint = () => {
      const left = state.secondsLeft;
      const minutes = Math.floor(left / 60);
      const secs = left % 60;
      if (output) output.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      if (ring) ring.classList.toggle('urgent', left > 0 && left <= 300);
    };
    paint();
    clearInterval(state.timer);
    state.timer = setInterval(() => {
      state.secondsLeft = Math.max(0, state.secondsLeft - 1);
      paint();
      if (state.secondsLeft <= 0) {
        clearInterval(state.timer);
        expirePayment();
      }
    }, 1000);
  }

  function expirePayment() {
    const banner = $('#holdBanner');
    if (banner) {
      banner.classList.add('hold-expired');
      const text = $('#holdText');
      if (text) text.textContent = 'El plazo de pago venció y los cupos fueron liberados automáticamente.';
    }
    showState({
      tone: 'rust',
      title: 'El plazo de pago venció',
      text: 'Los cupos de esta reserva fueron liberados. Puedes volver a reservar la misma experiencia o escribirnos para buscar disponibilidad.',
      actions: [
        { label: 'Volver a reservar', href: '/#reservar', variant: 'btn-primary' },
        { label: 'Consultar mi reserva', href: `/mi-reserva.html?code=${encodeURIComponent(state.code)}&token=${encodeURIComponent(state.token)}`, variant: 'btn-outline' }
      ]
    });
  }

  /* ---------------------------- Tarjeta ---------------------------- */

  function formatCardNumber(input) {
    const digits = input.value.replace(/\D/g, '').slice(0, 19);
    input.value = digits.replace(/(.{4})/g, '$1 ').trim();
  }

  function formatExpiry(input) {
    let digits = input.value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) digits = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    input.value = digits;
  }

  function luhn(number) {
    const digits = String(number).replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    let alt = false;
    for (let i = digits.length - 1; i >= 0; i -= 1) {
      let digit = Number(digits[i]);
      if (alt) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  function setFieldError(name, message) {
    const field = document.querySelector(`[data-error="${name}"]`);
    if (field) field.textContent = message;
    const input = document.querySelector(`#paymentForm [name="${name}"]`);
    if (input) input.classList.toggle('invalid', Boolean(message));
  }

  function validateCardForm() {
    const number = $('#cardNumber').value.replace(/\s/g, '');
    const name = $('#cardName').value.trim();
    const expiry = $('#cardExpiry').value.trim();
    const cvc = $('#cardCvc').value.trim();
    let valid = true;

    ['number', 'name', 'expiry', 'cvc'].forEach((field) => setFieldError(field, ''));

    if (!luhn(number)) {
      setFieldError('number', 'Número de tarjeta inválido. Revisa los dígitos.');
      valid = false;
    }
    if (name.length < 3) {
      setFieldError('name', 'Escribe el nombre del titular.');
      valid = false;
    }
    if (!/^\d{2}\s*\/\s*\d{2}$/.test(expiry)) {
      setFieldError('expiry', 'Usa el formato MM/AA.');
      valid = false;
    } else {
      const [mm, yy] = expiry.split('/').map((value) => Number(value.trim()));
      const end = new Date(2000 + yy, mm, 1).getTime();
      if (mm < 1 || mm > 12) {
        setFieldError('expiry', 'Mes inválido.');
        valid = false;
      } else if (end <= Date.now()) {
        setFieldError('expiry', 'La tarjeta está vencida.');
        valid = false;
      }
    }
    if (!/^\d{3,4}$/.test(cvc)) {
      setFieldError('cvc', 'CVV inválido.');
      valid = false;
    }
    return valid;
  }

  function renderPayment(reservation) {
    state.reservation = reservation;
    if (reservation.status === 'confirmed') {
      showState({
        tone: 'green',
        title: 'Esta reserva ya está pagada',
        text: `El pago de ${reservation.code} fue aprobado. Puedes ver tu confirmación y descargar el comprobante.`,
        actions: [
          { label: 'Ver confirmación', href: `/confirmacion.html?code=${encodeURIComponent(reservation.code)}&token=${encodeURIComponent(state.token)}`, variant: 'btn-primary' },
          { label: 'Ver comprobante', href: `/comprobante.html?code=${encodeURIComponent(reservation.code)}&token=${encodeURIComponent(state.token)}`, variant: 'btn-outline' },
          { label: 'Mi reserva', href: `/mi-reserva.html?code=${encodeURIComponent(reservation.code)}&token=${encodeURIComponent(state.token)}`, variant: 'btn-outline' }
        ]
      });
      return;
    }
    if (reservation.status === 'cancelled' || reservation.status === 'expired') {
      showState({
        tone: 'rust',
        title: reservation.status === 'expired' ? 'La reserva expiró' : 'La reserva fue cancelada',
        text: reservation.status === 'expired'
          ? 'El plazo para pagar terminó y los cupos se liberaron. Puedes iniciar una nueva reserva.'
          : 'Esta reserva fue cancelada y ya no admite pagos. Si tienes dudas, contáctanos con tu número de reserva.',
        actions: [
          { label: 'Volver a reservar', href: '/#reservar', variant: 'btn-primary' },
          { label: 'Consultar la reserva', href: `/mi-reserva.html?code=${encodeURIComponent(reservation.code)}&token=${encodeURIComponent(state.token)}`, variant: 'btn-outline' }
        ]
      });
      return;
    }

    const panel = $('#paymentPanel');
    const policy = $('#policyMini');
    if (panel) panel.hidden = false;
    if (policy) policy.hidden = false;
    const amount = $('#payAmount');
    if (amount) amount.textContent = `Pagar ${money(reservation.total)}`;
    startCountdown(reservation.secondsLeft || 0);
    if ((reservation.secondsLeft || 0) <= 0) {
      expirePayment();
    }
  }

  async function loadReservation() {
    const params = new URLSearchParams(window.location.search);
    state.code = (params.get('code') || '').trim().toUpperCase();
    state.token = (params.get('token') || '').trim();

    if (!state.code || !state.token) {
      showState({
        tone: 'amber',
        title: 'Falta el enlace de pago',
        text: 'Abre el enlace privado que recibiste por correo o consulta tu reserva con el código y el correo del titular.',
        actions: [
          { label: 'Consultar mi reserva', href: '/mi-reserva.html', variant: 'btn-primary' },
          { label: 'Volver al inicio', href: '/', variant: 'btn-outline' }
        ]
      });
      return;
    }

    try {
      const data = await api(`/api/reservations/${encodeURIComponent(state.code)}?token=${encodeURIComponent(state.token)}`);
      const reservation = data.reservation;
      renderOrder(reservation);
      renderPayment(reservation);
    } catch (error) {
      showState({
        tone: 'rust',
        title: 'No pudimos abrir la reserva',
        text: error.status === 403
          ? 'El enlace de pago no es válido. Verifica que lo hayas copiado completo o consulta tu reserva con tu correo.'
          : error.status === 404
            ? 'No encontramos esta reserva. Revisa el código o consulta con el correo del titular.'
            : error.message,
        actions: [
          { label: 'Consultar mi reserva', href: '/mi-reserva.html', variant: 'btn-primary' },
          { label: 'Volver al inicio', href: '/', variant: 'btn-outline' }
        ]
      });
    }
  }

  async function pay(event) {
    event.preventDefault();
    if (state.paying) return;
    const errorBox = $('#payError');
    if (errorBox) errorBox.hidden = true;
    if (!validateCardForm()) return;
    if (state.secondsLeft <= 0) { expirePayment(); return; }

    const reservation = state.reservation;
    if (!reservation?.payment?.intentId) {
      toast('No encontramos el intento de pago. Recarga la página.');
      return;
    }

    const button = $('#payButton');
    busy(button, true);
    state.paying = true;
    try {
      const data = await api(`/api/payments/${encodeURIComponent(reservation.payment.intentId)}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          token: state.token,
          card: {
            number: $('#cardNumber').value.replace(/\s/g, ''),
            name: $('#cardName').value.trim(),
            expiry: $('#cardExpiry').value.trim(),
            cvc: $('#cardCvc').value.trim()
          }
        })
      });
      clearInterval(state.timer);
      window.location.href = data.redirect || `/confirmacion.html?code=${encodeURIComponent(state.code)}&token=${encodeURIComponent(state.token)}`;
    } catch (error) {
      state.paying = false;
      busy(button, false);
      if (errorBox) {
        errorBox.textContent = error.message;
        errorBox.hidden = false;
      }
      if (error.fields) {
        Object.entries(error.fields).forEach(([field, message]) => setFieldError(field, message));
      }
      if (error.status === 410) {
        expirePayment();
      } else if (error.data?.secondsLeft !== undefined) {
        state.secondsLeft = Number(error.data.secondsLeft);
      }
    }
  }

  function setupInputs() {
    const number = $('#cardNumber');
    const expiry = $('#cardExpiry');
    const cvc = $('#cardCvc');
    number?.addEventListener('input', () => formatCardNumber(number));
    expiry?.addEventListener('input', () => formatExpiry(expiry));
    cvc?.addEventListener('input', () => { cvc.value = cvc.value.replace(/\D/g, '').slice(0, 4); });
    ['number', 'name', 'expiry', 'cvc'].forEach((name) => {
      const input = $(`#paymentForm [name="${name}"]`);
      input?.addEventListener('input', () => setFieldError(name, ''));
    });
    $('#paymentForm')?.addEventListener('submit', pay);
  }

  function init() {
    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());
    setupInputs();
    loadReservation();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
