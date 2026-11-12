/* ==========================================================================
   K’anba · mi reserva
   Consulta, pago pendiente, comprobante y cancelación.
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
    loaded: false
  };

  const money = (value) => `Q${Number(value || 0).toFixed(2)}`;

  const STATUS_LABEL = {
    pending_payment: 'Pago pendiente',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    expired: 'Expirada'
  };

  const ICON_CLOCK = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v6M12 16.5v.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const ICON_CHECK = '<svg viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m8 12.2 2.7 2.7L16.4 9" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_X = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m9 9 6 6M15 9l-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

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
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });
    let data = null;
    try { data = await res.json(); } catch { /* respuesta vacía */ }
    if (!res.ok) {
      const error = new Error(data?.error?.message || data?.message || 'No pudimos completar la solicitud.');
      error.status = res.status;
      error.data = data;
      error.fields = data?.error?.fields || data?.fields || null;
      throw error;
    }
    return data;
  }

  /* ---------------- Política y fechas ---------------- */

  function hoursUntil(reservation) {
    const ms = Date.parse(`${reservation.date}T${reservation.time}:00-06:00`);
    if (Number.isNaN(ms)) return null;
    return (ms - Date.now()) / 3600000;
  }

  function policyText(reservation) {
    if (reservation.status === 'pending_payment') return 'Cupos bloqueados · sin cargo';
    if (reservation.status !== 'confirmed') return 'Reserva no reembolsable';
    const hours = hoursUntil(reservation);
    if (hours === null) return 'Política de cancelación';
    if (hours >= 72) return 'Cancelación · reembolso 100%';
    if (hours >= 24) return 'Cancelación · reembolso 50%';
    return 'Cancelación · sin reembolso';
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('es-GT', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  /* ---------------- Estado de la página ---------------- */

  function showState(tone, title, text, actions = []) {
    const card = $('#reservationCard');
    const lookup = $('#lookupCard');
    const panel = $('#resState');
    if (card) card.hidden = true;
    if (lookup) lookup.hidden = true;
    if (!panel) return;
    panel.hidden = false;
    const icon = $('#resStateIcon');
    if (icon) {
      icon.className = `state-icon ${tone}`;
      icon.innerHTML = tone === 'green' ? ICON_CHECK : tone === 'rust' ? ICON_X : ICON_CLOCK;
    }
    const titleNode = $('#resStateTitle');
    const textNode = $('#resStateText');
    if (titleNode) titleNode.textContent = title;
    if (textNode) textNode.textContent = text;
    const wrap = $('#resStateActions');
    if (!wrap) return;
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
        button.type = 'button';
        button.className = `btn ${action.variant || 'btn-primary'}`;
        button.textContent = action.label;
        button.addEventListener('click', action.onClick);
        wrap.append(button);
      }
    });
  }

  function showLookup(message = '') {
    const card = $('#reservationCard');
    const panel = $('#resState');
    const lookup = $('#lookupCard');
    if (card) card.hidden = true;
    if (panel) panel.hidden = true;
    if (lookup) lookup.hidden = false;
    const error = $('#lookupError');
    if (error) {
      error.hidden = !message;
      error.textContent = message;
    }
  }

  /* ---------------- Render ---------------- */

  function detail(label, value) {
    const cell = document.createElement('div');
    const span = document.createElement('span');
    span.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = value === null || value === undefined || value === '' ? '—' : value;
    cell.append(span, strong);
    return cell;
  }

  function render(reservation) {
    state.reservation = reservation;
    state.code = reservation.code;

    const card = $('#reservationCard');
    const lookup = $('#lookupCard');
    const panel = $('#resState');
    if (lookup) lookup.hidden = true;
    if (panel) panel.hidden = true;
    if (!card) return;
    card.hidden = false;

    const chip = $('#resStatus');
    if (chip) {
      chip.className = `status-chip light ${reservation.status}`;
      chip.textContent = STATUS_LABEL[reservation.status] || reservation.status;
    }

    const title = $('#resTitle');
    const subtitle = $('#resSubtitle');
    const code = $('#resCode');
    if (title) title.textContent = reservation.tour?.name || reservation.code;
    if (subtitle) {
      subtitle.textContent = `${reservation.dateLong || reservation.date} · ${reservation.time} · ${reservation.participants} ${reservation.participants === 1 ? 'persona' : 'personas'}`;
    }
    if (code) code.textContent = `Código ${reservation.code}`;

    const pill = $('#resPolicy');
    if (pill) pill.textContent = policyText(reservation);

    const grid = $('#resDetails');
    if (grid) {
      grid.replaceChildren();
      grid.append(
        detail('Experiencia', reservation.tour?.name),
        detail('Fecha', reservation.dateLong || reservation.date),
        detail('Horario', reservation.time),
        detail('Participantes', `${reservation.participants}`),
        detail('Precio unitario', money(reservation.unitPrice)),
        detail('Total', money(reservation.total)),
        detail('Punto de encuentro', reservation.tour?.meetingPoint || 'Recepción K’anba'),
        detail('Titular', reservation.customer?.name),
        detail('Correo', reservation.customer?.email),
        detail('Teléfono', reservation.customer?.phone),
        detail('Pago', paymentLabel(reservation)),
        detail('Comprobante', reservation.receipt?.number || 'Pendiente')
      );
      if (reservation.cancellation) {
        grid.append(
          detail('Cancelada el', formatDateTime(reservation.cancelledAt || reservation.cancellation.requestedAt)),
          detail('Motivo', reservation.cancellation.reason)
        );
      }
      if (reservation.refund) {
        grid.append(detail('Reembolso', `${money(reservation.refund.amount)} · ${refundLabel(reservation.refund.status)}`));
      }
    }

    renderActions(reservation);
    renderCancelBlock(reservation);
    renderHistory(reservation);
    startCountdown(reservation);
  }

  function paymentLabel(reservation) {
    const p = reservation.payment || {};
    if (p.status === 'refund_pending') return 'Reembolso pendiente';
    if (p.status === 'refunded') return 'Reembolsado';
    if (p.status === 'paid' || reservation.paidAt) {
      return `${p.brand || 'Tarjeta'} •••• ${p.last4 || '—'} · ${money(p.amount ?? reservation.total)}`;
    }
    if (p.status === 'expired') return 'Pago no completado';
    if (p.attempts) return `Pago pendiente · ${p.attempts} ${p.attempts === 1 ? 'intento' : 'intentos'}`;
    return 'Pago pendiente';
  }

  function refundLabel(status) {
    if (status === 'processed') return 'procesado';
    if (status === 'pending') return 'en proceso';
    return status || 'registrado';
  }

  function actionButton(label, { href, variant = 'btn-outline', onClick } = {}) {
    if (href) {
      const link = document.createElement('a');
      link.className = `btn ${variant}`;
      link.href = href;
      link.textContent = label;
      return link;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn ${variant}`;
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  function renderActions(reservation) {
    const wrap = $('#resActions');
    if (!wrap) return;
    wrap.replaceChildren();
    const token = encodeURIComponent(state.token);
    const code = encodeURIComponent(reservation.code);

    if (reservation.status === 'pending_payment') {
      wrap.append(
        actionButton('Completar pago', { href: `/pago.html?code=${code}&token=${token}`, variant: 'btn-primary' }),
        actionButton('Actualizar estado', { onClick: () => loadReservation(true) })
      );
      const countdown = document.createElement('span');
      countdown.className = 'policy-pill';
      countdown.id = 'resCountdown';
      countdown.textContent = 'Cupos bloqueados';
      wrap.append(countdown);
      return;
    }

    if (reservation.status === 'confirmed') {
      wrap.append(
        actionButton('Ver comprobante', {
          href: `/comprobante.html?code=${code}&token=${token}`,
          variant: 'btn-primary'
        }),
        actionButton('Verificar comprobante', {
          href: `/verificar.html?code=${code}`
        }),
        actionButton('Añadir al calendario', { onClick: () => downloadCalendar(reservation) }),
        actionButton('WhatsApp', { href: 'https://wa.me/50240002026' })
      );
      return;
    }

    wrap.append(
      actionButton('Volver a reservar', { href: '/#reservar', variant: 'btn-primary' }),
      actionButton('Consultar otra reserva', { onClick: () => showLookup() })
    );
  }

  function renderCancelBlock(reservation) {
    const block = $('#cancelBlock');
    if (!block) return;
    const canCancel = reservation.status === 'pending_payment' || reservation.status === 'confirmed';
    block.hidden = !canCancel;
    if (!canCancel) return;
    const form = $('#cancelForm');
    const toggle = $('#toggleCancel');
    if (form) form.hidden = true;
    if (toggle) toggle.hidden = false;
    const text = $('#cancelPolicyText');
    if (text) {
      if (reservation.status === 'pending_payment') {
        text.textContent = 'Aún no hay un pago aprobado. Si cancelas, los cupos se liberan de inmediato y no se genera cargo.';
      } else {
        const hours = hoursUntil(reservation);
        if (hours === null) {
          text.textContent = 'El reembolso se calcula según la anticipación con la que canceles.';
        } else if (hours >= 72) {
          text.textContent = `Faltan más de 72 horas: corresponde un reembolso del 100% (${money(reservation.total)}). La solicitud queda registrada y el reembolso se procesa al medio de pago original.`;
        } else if (hours >= 24) {
          text.textContent = `Faltan entre 72 y 24 horas: corresponde un reembolso del 50% (${money(reservation.total * 0.5)}). La solicitud queda registrada y el reembolso se procesa al medio de pago original.`;
        } else {
          text.textContent = 'Faltan menos de 24 horas: según la política no aplica reembolso. La solicitud de cancelación quedará registrada.';
        }
      }
    }
  }

  function renderHistory(reservation) {
    const list = $('#historyList');
    const history = $('#resHistory');
    if (!list) return;
    list.replaceChildren();
    const entries = Array.isArray(reservation.history) ? reservation.history : [];
    if (history) history.hidden = entries.length === 0;
    entries.slice().reverse().forEach((entry) => {
      const li = document.createElement('li');
      const strong = document.createElement('strong');
      strong.textContent = entry.label || entry.type || 'Actualización';
      const time = document.createElement('time');
      time.dateTime = entry.at || '';
      time.textContent = formatDateTime(entry.at);
      li.append(strong, time);
      list.append(li);
    });
  }

  /* ---------------- Cuenta regresiva ---------------- */

  function stopCountdown() {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
  }

  function startCountdown(reservation) {
    stopCountdown();
    const node = $('#resCountdown');
    if (!node || reservation.status !== 'pending_payment') return;
    state.secondsLeft = Math.max(0, Number(reservation.secondsLeft) || 0);

    const paint = () => {
      const left = state.secondsLeft;
      const minutes = Math.floor(left / 60);
      const seconds = left % 60;
      node.textContent = left > 0
        ? `Cupos bloqueados · ${minutes}:${String(seconds).padStart(2, '0')}`
        : 'Plazo de pago vencido';
      node.style.color = left <= 120 ? '#8e3b25' : '';
      if (left <= 0) {
        stopCountdown();
        setTimeout(() => loadReservation(true), 1200);
        return;
      }
      state.secondsLeft -= 1;
    };

    paint();
    state.timer = setInterval(paint, 1000);
  }

  /* ---------------- Calendario ---------------- */

  function downloadCalendar(reservation) {
    const tour = reservation.tour || {};
    const start = Date.parse(`${reservation.date}T${reservation.time}:00-06:00`);
    if (Number.isNaN(start)) {
      toast('No pudimos preparar el calendario para esta reserva.');
      return;
    }
    const duration = Number(tour.durationMinutes || 120);
    const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Kanba Cuevas Vivas//Reservas//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${reservation.code}@kanba.gt`,
      `DTSTAMP:${stamp(Date.now())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(start + duration * 60000)}`,
      `SUMMARY:K’anba · ${tour.name || 'Tour'}`,
      `LOCATION:${(tour.meetingPoint || 'Recepción K’anba, Lanquín, Alta Verapaz').replace(/,/g, '\\,')}`,
      `DESCRIPTION:Reserva ${reservation.code}. ${reservation.participants} participantes. Llega 20 minutos antes.`,
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Tu tour en K’anba comienza pronto',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kanba-${reservation.code}.ics`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('Archivo de calendario descargado.');
  }

  /* ---------------- Carga ---------------- */

  function setLocation(code, token) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('code', code);
      url.searchParams.set('token', token);
      window.history.replaceState(null, '', url);
    } catch { /* noop */ }
  }

  async function loadReservation(silent = false) {
    if (!state.code || !state.token) {
      showLookup();
      return;
    }
    const lookupButton = $('#lookupButton');
    if (!silent) busy(lookupButton, true);
    try {
      const data = await api(`/api/reservations/${encodeURIComponent(state.code)}?token=${encodeURIComponent(state.token)}`);
      state.loaded = true;
      render(data.reservation);
    } catch (error) {
      const message = error.status === 403
        ? 'El enlace privado no es válido. Consulta con el código y el correo del titular.'
        : error.status === 404
          ? 'No encontramos esa reserva. Revisa el código o consulta con tu correo.'
          : error.message;
      if (silent && state.loaded) {
        toast(message);
      } else {
        showState('rust', 'No pudimos abrir la reserva', message, [
          { label: 'Consultar mi reserva', onClick: () => showLookup() },
          { label: 'Volver al inicio', href: '/', variant: 'btn-outline' }
        ]);
      }
    } finally {
      busy(lookupButton, false);
    }
  }

  async function lookup(event) {
    event.preventDefault();
    const error = $('#lookupError');
    const codeInput = $('#lookupCode');
    const emailInput = $('#lookupEmail');
    const button = $('#lookupButton');
    if (error) {
      error.hidden = true;
      error.textContent = '';
    }

    const code = (codeInput?.value || '').trim().toUpperCase();
    const email = (emailInput?.value || '').trim();
    if (!code || !email) {
      if (error) {
        error.hidden = false;
        error.textContent = 'Ingresa el código de reserva y el correo del titular.';
      }
      return;
    }

    busy(button, true);
    try {
      const data = await api('/api/reservations/lookup', {
        method: 'POST',
        body: JSON.stringify({ code, email })
      });
      state.code = data.reservation.code;
      state.token = data.token;
      state.loaded = true;
      setLocation(state.code, state.token);
      render(data.reservation);
      toast('Reserva encontrada.');
    } catch (err) {
      if (error) {
        error.hidden = false;
        error.textContent = err.status === 404
          ? 'No encontramos una reserva con ese código y correo. Verifica los datos e inténtalo de nuevo.'
          : err.message;
      }
    } finally {
      busy(button, false);
    }
  }

  async function cancel(event) {
    event.preventDefault();
    const reasonInput = $('#cancelReason');
    const error = $('#cancelError');
    const submit = $('#cancelSubmit');
    if (error) {
      error.hidden = true;
      error.textContent = '';
    }
    const reason = (reasonInput?.value || '').trim();
    if (reason.length < 5) {
      if (error) {
        error.hidden = false;
        error.textContent = 'Cuéntanos brevemente el motivo (al menos 5 caracteres).';
      }
      return;
    }

    busy(submit, true);
    try {
      const data = await api(`/api/reservations/${encodeURIComponent(state.code)}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ token: state.token, reason })
      });
      state.reservation = data.reservation;
      render(data.reservation);
      const amount = Number(data.refund?.amount || 0);
      toast(amount > 0
        ? `Cancelación registrada. Reembolso de ${money(amount)} en proceso.`
        : 'Cancelación registrada. No aplica reembolso según la política.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (error) {
        error.hidden = false;
        error.textContent = err.message;
      } else {
        toast(err.message);
      }
    } finally {
      busy(submit, false);
    }
  }

  /* ---------------- Eventos ---------------- */

  function bind() {
    const form = $('#lookupForm');
    if (form) form.addEventListener('submit', lookup);

    const toggle = $('#toggleCancel');
    const cancelForm = $('#cancelForm');
    const back = $('#cancelBack');
    if (toggle && cancelForm) {
      toggle.addEventListener('click', () => {
        cancelForm.hidden = false;
        toggle.hidden = true;
        $('#cancelReason')?.focus();
      });
    }
    if (back && cancelForm && toggle) {
      back.addEventListener('click', () => {
        cancelForm.hidden = true;
        toggle.hidden = false;
      });
    }
    if (cancelForm) cancelForm.addEventListener('submit', cancel);

    const codeInput = $('#lookupCode');
    if (codeInput) {
      codeInput.addEventListener('input', () => {
        codeInput.value = codeInput.value.toUpperCase();
      });
    }
  }

  function init() {
    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());
    bind();

    const params = new URLSearchParams(window.location.search);
    const code = (params.get('code') || '').trim().toUpperCase();
    const token = (params.get('token') || '').trim();
    const email = (params.get('email') || '').trim();

    if (code) {
      const codeInput = $('#lookupCode');
      const emailInput = $('#lookupEmail');
      if (codeInput) codeInput.value = code;
      if (emailInput) {
        if (email) emailInput.value = email;
        else emailInput.focus();
      }
    }

    if (code && token) {
      state.code = code;
      state.token = token;
      loadReservation();
    } else if (code && email) {
      const form = $('#lookupForm');
      if (form) form.requestSubmit();
    } else if (code) {
      const error = $('#lookupError');
      if (error) {
        error.hidden = false;
        error.textContent = 'Por seguridad, confirma el correo del titular para abrir esta reserva.';
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
