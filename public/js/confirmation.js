/* ==========================================================================
   K’anba · confirmación de reserva
   ========================================================================== */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const state = { code: '', token: '', reservation: null };

  const money = (value) => `Q${Number(value || 0).toFixed(2)}`;

  async function api(url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    let data = null;
    try { data = await res.json(); } catch { /* vacío */ }
    if (!res.ok) {
      const error = new Error(data?.error?.message || 'No pudimos cargar la reserva.');
      error.status = res.status;
      throw error;
    }
    return data;
  }

  function setBand(title, lead) {
    const t = $('#confirmBandTitle');
    const l = $('#confirmBandLead');
    if (t) t.textContent = title;
    if (l) l.textContent = lead;
  }

  function renderGrid(reservation) {
    const grid = $('#confirmGrid');
    if (!grid) return;
    grid.replaceChildren();
    const tour = reservation.tour || {};
    const rows = [
      ['Experiencia', tour.name || '—'],
      ['Fecha', reservation.dateLong || '—'],
      ['Horario', reservation.time || '—'],
      ['Participantes', `${reservation.participants} ${reservation.participants === 1 ? 'persona' : 'personas'}`],
      ['Total pagado', money(reservation.total)],
      ['Punto de encuentro', tour.meetingPoint || 'Recepción K’anba'],
      ['Titular', reservation.customer?.name || '—'],
      ['Correo', reservation.customer?.email || '—']
    ];
    rows.forEach(([label, value]) => {
      const cell = document.createElement('div');
      const span = document.createElement('span');
      span.textContent = label;
      const strong = document.createElement('strong');
      strong.textContent = value;
      cell.append(span, strong);
      grid.append(cell);
    });
  }

  function addAction(label, { href, variant = 'btn-outline', onClick } = {}) {
    const wrap = $('#confirmActions');
    if (!wrap) return;
    if (href) {
      const link = document.createElement('a');
      link.className = `btn ${variant}`;
      link.href = href;
      link.textContent = label;
      wrap.append(link);
    } else {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `btn ${variant}`;
      button.textContent = label;
      button.addEventListener('click', onClick);
      wrap.append(button);
    }
  }

  function calendarFile(reservation) {
    const tour = reservation.tour || {};
    const start = Date.parse(`${reservation.date}T${reservation.time}:00-06:00`);
    const duration = Number(tour.durationMinutes || 120);
    const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const end = start + duration * 60000;
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
      `DTEND:${stamp(end)}`,
      `SUMMARY:K’anba · ${tour.name || 'Tour'}`,
      `LOCATION:${(tour.meetingPoint || 'Recepción K’anba, Lanquín, Alta Verapaz').replace(/,/g, '\\,')}`,
      `DESCRIPTION:Reserva ${reservation.code}. ${reservation.participants} participantes. Llega 20 minutos antes. Presenta este correo en recepción.`,
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Tu tour en K’anba comienza pronto',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    return new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  }

  function downloadCalendar(reservation) {
    const blob = calendarFile(reservation);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kanba-${reservation.code}.ics`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    const toast = $('#toast');
    if (toast) {
      toast.textContent = 'Archivo de calendario descargado.';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
  }

  function showState(title, text, actions) {
    const card = $('#confirmCard');
    const panel = $('#confirmState');
    if (card) card.hidden = true;
    if (!panel) return;
    panel.hidden = false;
    $('#confirmStateTitle').textContent = title;
    $('#confirmStateText').textContent = text;
    const wrap = $('#confirmStateActions');
    wrap.replaceChildren();
    actions.forEach((action) => {
      const link = document.createElement('a');
      link.className = `btn ${action.variant || 'btn-primary'}`;
      link.href = action.href;
      link.textContent = action.label;
      wrap.append(link);
    });
  }

  async function load() {
    const params = new URLSearchParams(window.location.search);
    state.code = (params.get('code') || '').trim().toUpperCase();
    state.token = (params.get('token') || '').trim();
    if (!state.code || !state.token) {
      showState('Falta el enlace de la reserva', 'Abre el enlace que recibiste por correo o consulta tu reserva con el código y el correo del titular.', [
        { label: 'Consultar mi reserva', href: '/mi-reserva.html' },
        { label: 'Volver al inicio', href: '/', variant: 'btn-outline' }
      ]);
      return;
    }

    try {
      const data = await api(`/api/reservations/${encodeURIComponent(state.code)}?token=${encodeURIComponent(state.token)}`);
      const reservation = data.reservation;
      state.reservation = reservation;
      const statusText = $('#confirmStatusText');
      const code = $('#confirmCode');
      const lead = $('#confirmLead');
      const note = $('#confirmNote');
      const icon = $('#confirmIcon');
      if (code) code.textContent = reservation.code;

      if (reservation.status === 'confirmed') {
        setBand('Tu lugar bajo tierra está listo', 'Gracias por reservar con guías locales de Lanquín. Revisa los detalles y llega 20 minutos antes.');
        if (statusText) statusText.textContent = 'Reserva confirmada';
        if (lead) lead.textContent = `Tu pago fue aprobado y tus cupos están asegurados. Te esperamos el ${reservation.dateLong} a las ${reservation.time}.`;
        renderGrid(reservation);
        addAction('Ver comprobante', {
          href: `/comprobante.html?code=${encodeURIComponent(reservation.code)}&token=${encodeURIComponent(state.token)}`,
          variant: 'btn-primary'
        });
        addAction('Añadir al calendario', { onClick: () => downloadCalendar(reservation) });
        addAction('Gestionar mi reserva', {
          href: `/mi-reserva.html?code=${encodeURIComponent(reservation.code)}&token=${encodeURIComponent(state.token)}`
        });
        addAction('WhatsApp', { href: 'https://wa.me/50240002026' });
        if (note) note.textContent = `${reservation.customer?.email || 'Tu correo'} recibió la confirmación y el comprobante digital. Si no los ves, revisa spam o escríbenos con tu código de reserva.`;
        return;
      }

      if (reservation.status === 'pending_payment') {
        setBand('Tu pago está pendiente', 'Los cupos siguen bloqueados por unos minutos. Completa el pago para confirmar tu lugar.');
        if (statusText) statusText.textContent = 'Pago pendiente';
        if (lead) lead.textContent = `La reserva ${reservation.code} todavía no tiene pago aprobado. Si el plazo vence, los cupos se liberan automáticamente.`;
        if (icon) icon.className = 'confirm-check amber';
        renderGrid(reservation);
        addAction('Completar pago', {
          href: `/pago.html?code=${encodeURIComponent(reservation.code)}&token=${encodeURIComponent(state.token)}`,
          variant: 'btn-primary'
        });
        addAction('Gestionar mi reserva', {
          href: `/mi-reserva.html?code=${encodeURIComponent(reservation.code)}&token=${encodeURIComponent(state.token)}`
        });
        if (note) note.textContent = 'Puedes cerrar esta página y volver desde el enlace de tu correo o desde “Mi reserva”.';
        return;
      }

      const expired = reservation.status === 'expired';
      setBand(expired ? 'La reserva expiró' : 'La reserva fue cancelada', expired ? 'El plazo de pago terminó y los cupos fueron liberados.' : 'Esta reserva ya no está activa.');
      if (statusText) statusText.textContent = expired ? 'Reserva expirada' : 'Reserva cancelada';
      if (lead) lead.textContent = reservation.cancellation?.reason
        ? `Motivo registrado: ${reservation.cancellation.reason}`
        : 'Si necesitas ayuda, escríbenos con tu número de reserva.';
      if (icon) icon.className = 'confirm-check rust';
      renderGrid(reservation);
      addAction('Volver a reservar', { href: '/#reservar', variant: 'btn-primary' });
      addAction('Consultar mi reserva', {
        href: `/mi-reserva.html?code=${encodeURIComponent(reservation.code)}&token=${encodeURIComponent(state.token)}`,
        variant: 'btn-outline'
      });
      if (note) note.textContent = 'Los reembolsos, cuando aplican, se registran y procesan al medio de pago original.';
    } catch (error) {
      showState(
        error.status === 403 ? 'Enlace no válido' : 'No pudimos cargar la reserva',
        error.status === 403
          ? 'El enlace de esta reserva no es correcto. Consulta tu reserva con el código y el correo del titular.'
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
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
