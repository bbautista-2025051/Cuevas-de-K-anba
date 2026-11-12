/* ==========================================================================
   K’anba · verificación pública de comprobantes
   ========================================================================== */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);

  const money = (value) => `Q${Number(value || 0).toFixed(2)}`;

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

  function formatDate(iso) {
    if (!iso) return '—';
    const date = new Date(`${iso}T12:00:00-06:00`);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString('es-GT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('es-GT', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  async function api(url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    let data = null;
    try { data = await res.json(); } catch { /* vacío */ }
    if (!res.ok) {
      const error = new Error(data?.error?.message || 'No pudimos verificar el código.');
      error.status = res.status;
      throw error;
    }
    return data;
  }

  function detail(label, value) {
    const cell = document.createElement('div');
    const span = document.createElement('span');
    span.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = value === null || value === undefined || value === '' ? '—' : value;
    cell.append(span, strong);
    return cell;
  }

  function renderValid(data) {
    const wrap = $('#verifyResult');
    if (!wrap) return;
    wrap.hidden = false;
    wrap.replaceChildren();

    const card = document.createElement('div');
    card.className = 'panel-card';

    const state = document.createElement('div');
    state.className = 'state-card';
    const icon = document.createElement('div');
    icon.className = 'state-icon green';
    icon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m8 12.2 2.7 2.7L16.4 9" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const title = document.createElement('h2');
    title.textContent = 'Comprobante válido';
    const text = document.createElement('p');
    text.textContent = `La reserva ${data.code} está confirmada y pagada. Los datos coinciden con nuestro registro.`;
    state.append(icon, title, text);

    const grid = document.createElement('div');
    grid.className = 'confirm-grid';
    grid.append(
      detail('Código', data.code),
      detail('Comprobante', data.receiptNumber || '—'),
      detail('Experiencia', data.tourName || '—'),
      detail('Fecha', formatDate(data.date)),
      detail('Horario', data.time || '—'),
      detail('Participantes', String(data.participants || '—')),
      detail('Total', money(data.total)),
      detail('Pagado el', formatDateTime(data.paidAt))
    );

    const note = document.createElement('p');
    note.className = 'confirm-note';
    note.textContent = 'Esta verificación no sustituye el comprobante original. Para cambios o cancelaciones usa “Mi reserva” o escribe a reservas@kanba.gt.';

    card.append(state, grid, note);
    wrap.append(card);
  }

  function renderInvalid(code) {
    const wrap = $('#verifyResult');
    if (!wrap) return;
    wrap.hidden = false;
    wrap.replaceChildren();

    const card = document.createElement('div');
    card.className = 'panel-card state-card';
    const icon = document.createElement('div');
    icon.className = 'state-icon rust';
    icon.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m9 9 6 6M15 9l-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    const title = document.createElement('h2');
    title.textContent = 'No encontramos una reserva confirmada';
    const text = document.createElement('p');
    text.textContent = code
      ? `El código ${code} no corresponde a una reserva confirmada. Puede estar pendiente de pago, cancelada, expirada o mal escrito.`
      : 'El código no corresponde a una reserva confirmada. Puede estar pendiente de pago, cancelada, expirada o mal escrito.';
    const actions = document.createElement('div');
    actions.className = 'state-actions';
    const link = document.createElement('a');
    link.className = 'btn btn-primary';
    link.href = '/mi-reserva.html';
    link.textContent = 'Consultar mi reserva';
    const home = document.createElement('a');
    home.className = 'btn btn-outline';
    home.href = '/';
    home.textContent = 'Volver al inicio';
    actions.append(link, home);
    card.append(icon, title, text, actions);
    wrap.append(card);
  }

  async function verify(code) {
    const input = $('#verifyCode');
    const button = $('#verifyButton');
    const error = $('#verifyError');
    const clean = String(code || '').trim().toUpperCase();
    if (error) {
      error.hidden = true;
      error.textContent = '';
    }
    if (!clean) {
      if (error) {
        error.hidden = false;
        error.textContent = 'Ingresa el código de reserva que aparece en el comprobante.';
      }
      return;
    }
    if (input) input.value = clean;
    busy(button, true);
    try {
      const data = await api(`/api/verify/${encodeURIComponent(clean)}`);
      if (data.valid) {
        renderValid({ ...data, code: clean });
        const url = new URL(window.location.href);
        url.searchParams.set('code', clean);
        window.history.replaceState(null, '', url);
      } else {
        renderInvalid(clean);
      }
    } catch (err) {
      if (error) {
        error.hidden = false;
        error.textContent = err.message;
      } else {
        toast(err.message);
      }
    } finally {
      busy(button, false);
    }
  }

  function init() {
    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());

    const form = $('#verifyForm');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        verify($('#verifyCode')?.value);
      });
    }

    const input = $('#verifyCode');
    if (input) {
      input.addEventListener('input', () => {
        input.value = input.value.toUpperCase();
      });
    }

    const code = (new URLSearchParams(window.location.search).get('code') || '').trim().toUpperCase();
    if (code) {
      if (input) input.value = code;
      verify(code);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
