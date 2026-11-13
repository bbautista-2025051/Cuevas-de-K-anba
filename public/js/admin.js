/* ==========================================================================
   K’anba · panel administrativo
   Sin dependencias. Trabaja contra /api/admin/*.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    view: 'overview',
    overview: null,
    reservations: [],
    reservationSeq: 0,
    tours: [],
    content: null,
    settings: null,
    emails: [],
    refunds: [],
    closures: [],
    contentTab: 'brand',
    charts: []
  };

  const VIEW_META = {
    overview: ['Operación', 'Resumen'],
    reservations: ['Operación', 'Reservas'],
    availability: ['Operación', 'Disponibilidad'],
    tours: ['Operación', 'Tours'],
    content: ['Sitio', 'Contenido'],
    gallery: ['Sitio', 'Galería'],
    videos: ['Sitio', 'Videos'],
    emails: ['Control', 'Correos'],
    refunds: ['Control', 'Reembolsos'],
    settings: ['Control', 'Configuración']
  };

  const STATUS_LABEL = {
    pending_payment: 'Pago pendiente',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    expired: 'Expirada',
    pending: 'Pendiente',
    processed: 'Procesado',
    sent: 'Enviado',
    queued: 'En cola',
    failed: 'Falló',
    paid: 'Pagado',
    refund_pending: 'Reembolso pendiente',
    refunded: 'Reembolsado'
  };

  const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const CATEGORY_OPTIONS = [
    ['cueva', 'Cueva'],
    ['rio', 'Río'],
    ['selva', 'Selva'],
    ['semuc', 'Semuc'],
    ['otro', 'Otro']
  ];

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const money = (value) => `Q${Number(value || 0).toFixed(2)}`;
  const getPath = (obj, path) => path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
  const setPath = (obj, path, value) => {
    const parts = path.split('.');
    let cursor = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cursor[parts[i]] == null || typeof cursor[parts[i]] !== 'object') cursor[parts[i]] = {};
      cursor = cursor[parts[i]];
    }
    cursor[parts[parts.length - 1]] = value;
  };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function statusBadge(status, label) {
    const node = el('span', `status-badge ${status || ''}`, label || STATUS_LABEL[status] || status || '—');
    return node;
  }

  function toast(message) {
    const node = $('#toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toast.__timer);
    toast.__timer = setTimeout(() => node.classList.remove('show'), 3800);
  }

  function setSync(on) {
    const pill = $('#syncPill');
    if (pill) pill.classList.toggle('busy', Boolean(on));
  }

  function busy(button, on) {
    if (!button) return;
    button.classList.toggle('is-loading', Boolean(on));
    button.disabled = Boolean(on);
  }

  async function api(url, options = {}) {
    const res = await fetch(url, {
      credentials: 'same-origin',
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
      throw error;
    }
    return data;
  }

  function handleError(error) {
    if (error?.status === 401) {
      showLogin();
      return;
    }
    console.error(error);
    toast(error.message || 'Ocurrió un error inesperado.');
  }

  /* ====================================================================
     Sesión
     ==================================================================== */

  function showLogin() {
    closeModal();
    const login = $('#loginScreen');
    const shell = $('#adminShell');
    if (login) login.hidden = false;
    if (shell) shell.hidden = true;
    closeSidebar();
  }

  function showShell() {
    const login = $('#loginScreen');
    const shell = $('#adminShell');
    if (login) login.hidden = true;
    if (shell) shell.hidden = false;
  }

  async function boot() {
    try {
      const me = await api('/api/admin/me');
      if (me.authenticated) {
        showShell();
        const info = $('#sessionInfo');
        if (info && me.admin?.expiresAt) {
          info.textContent = `Sesión hasta ${new Date(me.admin.expiresAt).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}`;
        }
        navigate('overview');
      } else {
        showLogin();
      }
    } catch (error) {
      showLogin();
      const box = $('#loginError');
      if (box) {
        box.hidden = false;
        box.textContent = 'No pudimos conectar con el servidor. Verifica que el servicio esté activo.';
      }
    }
  }

  async function login(event) {
    event.preventDefault();
    const input = $('#loginPassword');
    const button = $('#loginButton');
    const error = $('#loginError');
    if (error) {
      error.hidden = true;
      error.textContent = '';
    }
    const password = input?.value || '';
    if (!password) {
      if (error) {
        error.hidden = false;
        error.textContent = 'Ingresa la contraseña de administración.';
      }
      return;
    }
    busy(button, true);
    try {
      await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
      if (input) input.value = '';
      showShell();
      navigate('overview');
      toast('Bienvenido al panel de K’anba.');
    } catch (err) {
      if (error) {
        error.hidden = false;
        error.textContent = err.status === 401 ? 'Contraseña incorrecta. Inténtalo de nuevo.' : err.message;
      }
    } finally {
      busy(button, false);
    }
  }

  async function logout() {
    try {
      await api('/api/admin/logout', { method: 'POST' });
    } catch { /* noop */ }
    showLogin();
  }

  /* ====================================================================
     Navegación y modal
     ==================================================================== */

  function closeSidebar() {
    $('#adminSidebar')?.classList.remove('open');
    const scrim = $('#sidebarScrim');
    if (scrim) scrim.hidden = true;
  }

  function openSidebar() {
    $('#adminSidebar')?.classList.add('open');
    const scrim = $('#sidebarScrim');
    if (scrim) scrim.hidden = false;
  }

  function navigate(view) {
    if (!VIEW_META[view]) view = 'overview';
    state.view = view;
    $$('.nav-item').forEach((item) => item.classList.toggle('is-active', item.dataset.view === view));
    $$('[data-view-panel]').forEach((panel) => {
      const active = panel.dataset.viewPanel === view;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    const meta = VIEW_META[view];
    const kicker = $('#viewKicker');
    const title = $('#viewTitle');
    if (kicker) kicker.textContent = meta[0];
    if (title) title.textContent = meta[1];
    closeSidebar();
    loadView(view);
  }

  function loadView(view) {
    const loaders = {
      overview: loadOverview,
      reservations: loadReservations,
      availability: loadAvailability,
      tours: loadTours,
      content: loadContent,
      gallery: loadGallery,
      videos: loadVideos,
      emails: loadEmails,
      refunds: loadRefunds,
      settings: loadSettings
    };
    const fn = loaders[view];
    if (fn) fn();
  }

  function openModal(title, body, { kicker = 'Detalle', wide = false } = {}) {
    const root = $('#modalRoot');
    const panel = $('#modalPanel');
    const bodyNode = $('#modalBody');
    const titleNode = $('#modalTitle');
    const kickerNode = $('#modalKicker');
    if (!root || !panel || !bodyNode) return;
    if (titleNode) titleNode.textContent = title;
    if (kickerNode) kickerNode.textContent = kicker;
    bodyNode.replaceChildren();
    if (body) bodyNode.append(body);
    panel.classList.toggle('wide', Boolean(wide));
    root.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const root = $('#modalRoot');
    const bodyNode = $('#modalBody');
    if (bodyNode) bodyNode.replaceChildren();
    if (root) root.hidden = true;
    document.body.style.overflow = '';
  }

  /* ====================================================================
     Resumen
     ==================================================================== */

  async function loadOverview() {
    setSync(true);
    try {
      const data = await api('/api/admin/overview');
      state.overview = data;
      renderOverview(data);
      updateBadges(data.kpis);
    } catch (error) {
      handleError(error);
    } finally {
      setSync(false);
    }
  }

  function updateBadges(kpis) {
    const emails = $('#emailBadge');
    const refunds = $('#refundBadge');
    if (emails) {
      emails.hidden = !(kpis?.emails > 0);
      emails.textContent = kpis?.emails > 99 ? '99+' : String(kpis?.emails || 0);
    }
    if (refunds) {
      refunds.hidden = !(kpis?.refundsPending > 0);
      refunds.textContent = String(kpis?.refundsPending || 0);
    }
  }

  function kpiCard(label, value, sub, tone = '') {
    const card = el('div', `kpi ${tone}`.trim());
    card.append(el('span', '', label), el('strong', '', value));
    if (sub) {
      const small = el('small');
      small.append(sub);
      card.append(small);
    }
    return card;
  }

  function renderOverview(data) {
    const k = data.kpis;
    const wrap = $('#overviewKpis');
    if (wrap) {
      wrap.replaceChildren();
      wrap.append(
        kpiCard('Ingresos confirmados', money(k.revenue), `Ticket promedio ${money(k.avgTicket)}`, 'lime'),
        kpiCard('Reservas confirmadas', String(k.confirmed), `${k.pending} pendientes · ${money(k.pendingAmount)} en espera`),
        kpiCard('Ocupación de hoy', `${k.occupancyToday}%`, `${k.seatsToday} de ${k.capacityToday} cupos vendidos`, 'amber'),
        kpiCard('Reembolsos pendientes', String(k.refundsPending), `${money(k.refundsPendingAmount)} por procesar`, k.refundsPending ? 'rust' : '')
      );
    }

    renderChart(data.chart);
    renderOccupancy(data);
    renderOverviewTables(data);
    renderRefundItems($('#overviewRefunds'), data.refunds, { compact: true });
  }

  function renderChart(chart) {
    const wrap = $('#overviewChart');
    const total = $('#chartTotal');
    if (!wrap) return;
    wrap.parentElement?.querySelectorAll('.chart-legend').forEach((node) => node.remove());
    wrap.replaceChildren();
    const list = Array.isArray(chart) ? chart : [];
    const maxCount = Math.max(1, ...list.map((d) => Number(d.count) || 0));
    const maxRevenue = Math.max(1, ...list.map((d) => Number(d.revenue) || 0));
    const sum = list.reduce((s, d) => s + (Number(d.count) || 0), 0);
    if (total) total.textContent = `${sum} reservas nuevas`;
    list.forEach((day) => {
      const item = el('div', 'bar-item');
      const stack = el('div', 'bar-stack');
      const bar = el('div', 'bar');
      const barRevenue = el('div', 'bar revenue');
      const height = Math.max(2, Math.round(((Number(day.count) || 0) / maxCount) * 100));
      const heightRevenue = Math.max(2, Math.round(((Number(day.revenue) || 0) / maxRevenue) * 100));
      bar.style.height = `${height}%`;
      barRevenue.style.height = `${heightRevenue}%`;
      const tip = el('span', '', `${day.count || 0}`);
      const tipRevenue = el('span', '', money(day.revenue));
      bar.append(tip);
      barRevenue.append(tipRevenue);
      stack.append(bar, barRevenue);
      const label = el('span', 'bar-label', day.label || day.date || '');
      item.append(stack, label);
      wrap.append(item);
    });
    const legend = el('div', 'chart-legend');
    const l1 = el('span');
    l1.append(el('i', ''), document.createTextNode('Reservas creadas'));
    const l2 = el('span');
    l2.append(el('i', ''), document.createTextNode('Ingresos confirmados'));
    l2.querySelector('i').style.background = 'var(--amber-deep)';
    legend.append(l1, l2);
    wrap.after(legend);
  }

  function renderOccupancy(data) {
    const ringWrap = $('#occupancyRing');
    const stats = $('#storageStats');
    if (!ringWrap) return;
    ringWrap.replaceChildren();
    const k = data.kpis;
    const pct = Math.max(0, Math.min(100, Number(k.occupancyToday) || 0));
    const ring = el('div', 'occupancy-ring');
    ring.style.background = `conic-gradient(var(--moss) ${pct * 3.6}deg, rgba(14,36,32,.09) 0)`;
    const inner = el('div');
    inner.append(el('strong', '', `${pct}%`), el('span', '', 'ocupación'));
    ring.append(inner);
    const copy = el('div', 'ring-copy');
    copy.append(
      el('strong', '', 'Cupos de hoy'),
      el('p', '', k.capacityToday
        ? `${k.seatsToday} de ${k.capacityToday} lugares reservados en las salidas de hoy.`
        : 'No hay salidas programadas para hoy.')
    );
    ringWrap.append(ring, copy);

    if (stats) {
      stats.replaceChildren();
      const values = [
        ['Tours', String(data.store?.tours ?? '—')],
        ['Fotos', String(data.store?.gallery ?? '—')],
        ['Videos', String(data.store?.videos ?? '—')],
        ['Correos', String(data.store?.emails ?? '—')]
      ];
      values.forEach(([label, value]) => {
        const cell = el('div');
        cell.append(el('span', '', label), el('strong', '', value));
        stats.append(cell);
      });
    }
  }

  function overviewTable(container, rows, columns) {
    if (!container) return;
    container.replaceChildren();
    const thead = el('thead');
    const tr = el('tr');
    columns.forEach((col) => tr.append(el('th', '', col.label)));
    thead.append(tr);
    const tbody = el('tbody');
    if (!rows.length) {
      const empty = el('tr');
      const td = el('td', 'table-empty', 'Sin datos por ahora.');
      td.colSpan = columns.length;
      empty.append(td);
      tbody.append(empty);
    } else {
      rows.forEach((row) => {
        const trr = el('tr', 'clickable');
        trr.addEventListener('click', () => openReservation(row.code));
        columns.forEach((col) => {
          const td = el('td', col.className || '');
          const value = col.value(row);
          if (value instanceof Node) td.append(value);
          else td.textContent = value == null ? '—' : String(value);
          trr.append(td);
        });
        tbody.append(trr);
      });
    }
    container.append(thead, tbody);
  }

  function renderOverviewTables(data) {
    overviewTable($('#upcomingTable'), data.upcoming || [], [
      { label: 'Reserva', value: (r) => r.code, className: 'cell-code' },
      { label: 'Cliente', value: (r) => r.customer?.name || '—' },
      { label: 'Fecha', value: (r) => `${r.dateLong || r.date} · ${r.time}` },
      { label: 'Pax', value: (r) => String(r.participants) },
      { label: 'Total', value: (r) => money(r.total), className: 'cell-right' }
    ]);
    overviewTable($('#recentTable'), data.recent || [], [
      { label: 'Reserva', value: (r) => r.code, className: 'cell-code' },
      { label: 'Estado', value: (r) => statusBadge(r.status) },
      { label: 'Total', value: (r) => money(r.total), className: 'cell-right' },
      { label: 'Creada', value: (r) => shortDate(r.createdAt), className: 'cell-right' }
    ]);
  }

  function shortDate(iso) {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es-GT', { day: '2-digit', month: 'short' });
  }

  function longDateTime(iso) {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('es-GT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  /* ====================================================================
     Reservas
     ==================================================================== */

  function loadReservations() {
    const seq = ++state.reservationSeq;
    const q = $('#reservationSearch')?.value.trim() || '';
    const status = $('#reservationStatus')?.value || 'all';
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status !== 'all') params.set('status', status);
    setSync(true);
    api(`/api/admin/reservations${params.toString() ? '?' + params : ''}`)
      .then((data) => {
        if (seq !== state.reservationSeq) return;
        state.reservations = data.reservations || [];
        renderReservations();
      })
      .catch(handleError)
      .finally(() => setSync(false));
  }

  function renderReservations() {
    const container = $('#reservationsTable');
    const count = $('#reservationCount');
    if (count) count.textContent = `${state.reservations.length} ${state.reservations.length === 1 ? 'reserva' : 'reservas'}`;
    if (!container) return;
    container.replaceChildren();
    const thead = el('thead');
    const headRow = el('tr');
    ['Reserva', 'Cliente', 'Tour', 'Fecha y hora', 'Pax', 'Total', 'Estado'].forEach((label) => headRow.append(el('th', '', label)));
    thead.append(headRow);
    const tbody = el('tbody');
    if (!state.reservations.length) {
      const row = el('tr');
      const td = el('td', 'table-empty');
      td.colSpan = 7;
      const strong = el('strong', '', 'No hay reservas con ese filtro');
      td.append(strong, document.createTextNode('Prueba con otro estado o limpia la búsqueda.'));
      row.append(td);
      tbody.append(row);
    } else {
      state.reservations.forEach((r) => {
        const row = el('tr', 'clickable');
        row.addEventListener('click', () => openReservation(r.code));

        const codeCell = el('td', 'cell-code');
        codeCell.append(el('span', '', r.code), el('span', 'cell-sub', shortDate(r.createdAt)));
        row.append(codeCell);

        const customer = el('td');
        customer.append(el('span', 'cell-strong', r.customer?.name || '—'), el('span', 'cell-sub', r.customer?.email || '—'));
        row.append(customer);

        row.append(el('td', '', r.tour?.name || '—'));

        const dateCell = el('td', 'cell-nowrap');
        dateCell.append(el('span', '', r.dateLong || r.date), el('span', 'cell-sub', `${r.time} · ${r.participants} ${r.participants === 1 ? 'persona' : 'personas'}`));
        row.append(dateCell);

        row.append(el('td', 'cell-right', String(r.participants)));
        row.append(el('td', 'cell-right', money(r.total)));
        const statusCell = el('td');
        statusCell.append(statusBadge(r.status));
        row.append(statusCell);
        tbody.append(row);
      });
    }
    container.append(thead, tbody);
  }

  function detailList(rows) {
    const list = el('div', 'detail-list');
    rows.forEach(([label, value, full]) => {
      const cell = el('div', full ? 'full' : '');
      cell.append(el('span', '', label), el('strong', '', value == null || value === '' ? '—' : String(value)));
      list.append(cell);
    });
    return list;
  }

  function section(title, nodes) {
    const wrap = el('div', 'modal-section');
    if (title) wrap.append(el('h3', '', title));
    nodes.forEach((node) => wrap.append(node));
    return wrap;
  }

  async function openReservation(code) {
    setSync(true);
    try {
      const data = await api(`/api/admin/reservations/${encodeURIComponent(code)}`);
      const r = data.reservation;
      const body = el('div');

      const summary = el('div');
      const statusRow = el('div', 'row');
      statusRow.append(statusBadge(r.status));
      if (r.payment?.status) statusRow.append(statusBadge(r.payment.status, `Pago: ${STATUS_LABEL[r.payment.status] || r.payment.status}`));
      summary.append(statusRow);
      summary.append(el('div', 'mt'));
      summary.append(detailList([
        ['Experiencia', r.tour?.name || r.tourId],
        ['Fecha', r.dateLong || r.date],
        ['Horario', r.time],
        ['Participantes', `${r.participants}`],
        ['Precio unitario', money(r.unitPrice)],
        ['Total', money(r.total)],
        ['Titular', r.customer?.name],
        ['Correo', r.customer?.email],
        ['Teléfono', r.customer?.phone],
        ['País', r.customer?.country],
        ['Documento', r.customer?.document],
        ['Creada', longDateTime(r.createdAt)],
        ['Pago', r.payment ? `${r.payment.provider || '—'} · ${r.payment.brand || '—'} •••• ${r.payment.last4 || '—'}` : '—'],
        ['Referencia', r.payment?.reference],
        ['Pagada el', longDateTime(r.paidAt)],
        ['Comprobante', r.receipt?.number || '—'],
        ['Notas del cliente', r.customer?.notes, true]
      ]));
      if (r.cancellation) {
        const note = el('div', 'modal-note danger');
        note.textContent = `Cancelada el ${longDateTime(r.cancelledAt)} por ${r.cancellation.by === 'admin' ? 'administración' : 'el cliente'} · ${r.cancellation.reason} · reembolso ${money(r.cancellation.refundAmount)}`;
        summary.append(note);
      }
      body.append(section('Resumen de la reserva', [summary]));

      const actions = el('div', 'modal-actions');
      const token = r.token ? `&token=${encodeURIComponent(r.token)}` : '';
      if (r.status === 'pending_payment') {
        const pay = el('a', 'btn btn-primary btn-compact', 'Abrir pago');
        pay.href = `/pago.html?code=${encodeURIComponent(r.code)}${token}`;
        pay.target = '_blank';
        pay.rel = 'noopener';
        actions.append(pay);
        const confirmButton = el('button', 'btn btn-outline btn-compact', 'Confirmar pago manual');
        confirmButton.type = 'button';
        confirmButton.addEventListener('click', async () => {
          if (!window.confirm(`¿Confirmar manualmente el pago de ${r.code} por ${money(r.total)}? Se emitirá comprobante y se enviarán correos.`)) return;
          busy(confirmButton, true);
          try {
            await api(`/api/admin/reservations/${encodeURIComponent(r.code)}/confirm`, { method: 'POST' });
            toast('Pago confirmado manualmente.');
            openReservation(r.code);
            loadReservations();
          } catch (error) {
            handleError(error);
          } finally {
            busy(confirmButton, false);
          }
        });
        actions.append(confirmButton);
      }
      if (r.status === 'confirmed') {
        const receipt = el('a', 'btn btn-primary btn-compact', 'Ver comprobante');
        receipt.href = `/comprobante.html?code=${encodeURIComponent(r.code)}${token}`;
        receipt.target = '_blank';
        receipt.rel = 'noopener';
        actions.append(receipt);
      }
      const confirmation = el('a', 'btn btn-outline btn-compact', 'Ver confirmación');
      confirmation.href = `/confirmacion.html?code=${encodeURIComponent(r.code)}${token}`;
      confirmation.target = '_blank';
      confirmation.rel = 'noopener';
      actions.append(confirmation);
      const verify = el('a', 'btn btn-outline btn-compact', 'Verificar');
      verify.href = `/verificar.html?code=${encodeURIComponent(r.code)}`;
      verify.target = '_blank';
      verify.rel = 'noopener';
      actions.append(verify);
      body.append(section('Enlaces del cliente', [actions]));

      /* Reenviar correos */
      const mailSection = el('div', 'modal-section');
      mailSection.append(el('h3', '', 'Reenviar correo'));
      const mailRow = el('div', 'row');
      const templateSelect = el('select', 'select-compact');
      const templates = [
        ['pending', 'Pago pendiente'],
        ['confirmation', 'Confirmación'],
        ['receipt', 'Comprobante'],
        ['expired', 'Reserva expirada'],
        ['cancellation', 'Cancelación'],
        ['refund', 'Reembolso procesado']
      ];
      templates.forEach(([value, label]) => {
        const option = el('option', '', label);
        option.value = value;
        templateSelect.append(option);
      });
      if (r.status === 'confirmed') templateSelect.value = 'confirmation';
      else if (r.status === 'cancelled') templateSelect.value = 'cancellation';
      else if (r.status === 'expired') templateSelect.value = 'expired';
      const send = el('button', 'btn btn-outline btn-compact', 'Enviar correo');
      send.type = 'button';
      send.addEventListener('click', async () => {
        busy(send, true);
        try {
          await api(`/api/admin/reservations/${encodeURIComponent(r.code)}/resend`, {
            method: 'POST',
            body: JSON.stringify({ template: templateSelect.value })
          });
          toast(`Correo “${templateSelect.options[templateSelect.selectedIndex].text}” generado para ${r.customer?.email}.`);
        } catch (error) {
          handleError(error);
        } finally {
          busy(send, false);
        }
      });
      mailRow.append(templateSelect, send);
      mailSection.append(mailRow);
      mailSection.append(el('div', 'modal-note', 'Los correos se guardan en la bandeja de salida y en data/outbox. Si el SMTP está configurado, también se envían.'));
      body.append(mailSection);

      /* Cancelación */
      if (r.status === 'pending_payment' || r.status === 'confirmed') {
        const cancelSection = el('div', 'modal-section');
        cancelSection.append(el('h3', '', 'Cancelar reserva'));
        const form = el('div', 'stack');
        const reasonLabel = el('label', 'field');
        reasonLabel.append(el('span', '', 'Motivo'));
        const reason = el('textarea');
        reason.rows = 2;
        reason.placeholder = 'Motivo de la cancelación';
        reasonLabel.append(reason);
        const amountLabel = el('label', 'field');
        amountLabel.append(el('span', '', 'Reembolso manual (opcional)'));
        const amount = el('input');
        amount.type = 'number';
        amount.min = '0';
        amount.max = String(r.total);
        amount.step = '0.01';
        amount.placeholder = `Automático según política (máx. ${money(r.total)})`;
        amountLabel.append(amount);
        const methodLabel = el('label', 'field');
        methodLabel.append(el('span', '', 'Método de reembolso'));
        const method = el('input');
        method.type = 'text';
        method.value = 'Medio de pago original';
        methodLabel.append(method);
        const submit = el('button', 'btn btn-danger btn-compact', 'Confirmar cancelación');
        submit.type = 'button';
        submit.addEventListener('click', async () => {
          if (!reason.value.trim()) {
            toast('Escribe el motivo de la cancelación.');
            reason.focus();
            return;
          }
          if (!window.confirm(`¿Cancelar la reserva ${r.code}? Esta acción queda registrada.`)) return;
          busy(submit, true);
          try {
            const result = await api(`/api/admin/reservations/${encodeURIComponent(r.code)}/cancel`, {
              method: 'POST',
              body: JSON.stringify({
                reason: reason.value.trim(),
                refundAmount: amount.value === '' ? null : Number(amount.value),
                refundMethod: method.value.trim() || 'Medio de pago original'
              })
            });
            const refund = result.refund?.amount || 0;
            toast(`Reserva cancelada. Reembolso ${money(refund)} registrado.`);
            openReservation(r.code);
            loadReservations();
          } catch (error) {
            handleError(error);
          } finally {
            busy(submit, false);
          }
        });
        form.append(reasonLabel, amountLabel, methodLabel, submit);
        cancelSection.append(form);
        cancelSection.append(el('div', 'modal-note warn', 'La política aplica 100% con 72 h o más, 50% entre 72 y 24 h, y 0% con menos de 24 h. Puedes fijar un importe manual si la operación lo requiere.'));
        body.append(cancelSection);
      }

      /* Historial */
      const historySection = el('div', 'modal-section');
      historySection.append(el('h3', '', 'Historial'));
      const timeline = el('div', 'timeline');
      (r.history || []).slice().reverse().forEach((entry) => {
        const item = el('div');
        item.append(el('strong', '', entry.label || entry.type || 'Actualización'), document.createTextNode(longDateTime(entry.at)));
        timeline.append(item);
      });
      if (!r.history?.length) timeline.append(el('div', '', 'Sin eventos registrados.'));
      historySection.append(timeline);
      body.append(historySection);

      openModal(r.code, body, { kicker: 'Gestión de reserva', wide: true });
    } catch (error) {
      handleError(error);
    } finally {
      setSync(false);
    }
  }

  /* ====================================================================
     Disponibilidad
     ==================================================================== */

  async function loadAvailability() {
    setSync(true);
    try {
      const days = Number($('#availabilityDays')?.value) || 14;
      const [availability, closures, tours] = await Promise.all([
        api(`/api/admin/availability?days=${days}`),
        api('/api/admin/closures'),
        state.tours.length ? Promise.resolve({ tours: state.tours }) : api('/api/admin/tours')
      ]);
      state.closures = closures.closures || [];
      state.tours = tours.tours || state.tours;
      renderAvailability(availability.grid || []);
      renderClosures();
      const note = $('#availabilityNote');
      if (note) note.textContent = `${availability.grid?.length || 0} días · ${state.tours.filter((t) => t.active !== false).length} tours activos`;
      const select = $('#closureTour');
      if (select) {
        const current = select.value;
        select.replaceChildren();
        const all = el('option', '', 'Todos los tours');
        all.value = 'all';
        select.append(all);
        state.tours.forEach((t) => {
          const option = el('option', '', t.name);
          option.value = t.id;
          select.append(option);
        });
        select.value = current && state.tours.some((t) => t.id === current) ? current : 'all';
      }
      const dateInput = $('#closureDate');
      if (dateInput && !dateInput.value) dateInput.value = availability.grid?.[0]?.date || '';
    } catch (error) {
      handleError(error);
    } finally {
      setSync(false);
    }
  }

  function renderAvailability(days) {
    const grid = $('#availabilityGrid');
    if (!grid) return;
    grid.replaceChildren();
    if (!days.length) {
      grid.append(el('div', 'empty-state', 'No hay datos de disponibilidad.'));
      return;
    }
    days.forEach((day) => {
      const card = el('div', 'avail-day');
      const head = el('div', 'avail-day-head');
      head.append(el('strong', '', day.dateLong || day.date), el('span', '', day.date));
      const closures = state.closures.filter((c) => c.date === day.date);
      if (closures.length) {
        const closed = el('span', 'avail-closed', closures.some((c) => c.tourId === 'all') ? 'Cerrado todo el día' : 'Con cierres parciales');
        head.append(closed);
      }
      card.append(head);
      const toursWrap = el('div', 'avail-tours');
      if (!day.occupancy?.length) {
        toursWrap.append(el('div', 'empty-note', 'Sin tours activos para este día.'));
      } else {
        day.occupancy.forEach((tour) => {
          const row = el('div', 'avail-tour');
          row.append(el('strong', '', tour.tourName));
          const times = el('div', 'avail-times');
          tour.times.forEach((slot) => {
            const closed = closures.some((c) => c.tourId === 'all' || c.tourId === tour.tourId);
            const status = closed || slot.left <= 0 ? 'full' : slot.left <= Math.max(1, Math.round(slot.capacity * 0.2)) ? 'last' : 'open';
            const chip = el('span', `avail-time ${status}`);
            chip.append(el('b', '', slot.time), el('span', '', closed ? 'cerrado' : `${slot.left} cupos`));
            times.append(chip);
          });
          row.append(times);
          toursWrap.append(row);
        });
      }
      card.append(toursWrap);
      grid.append(card);
    });
  }

  function renderClosures() {
    const list = $('#closureList');
    const count = $('#closureCount');
    if (!list) return;
    list.replaceChildren();
    if (count) count.textContent = `${state.closures.length} registrados`;
    const sorted = state.closures.slice().sort((a, b) => a.date.localeCompare(b.date));
    if (!sorted.length) {
      list.append(el('div', 'empty-state', 'No hay cierres programados.'));
      return;
    }
    sorted.forEach((closure) => {
      const item = el('div', 'closure-item');
      const date = el('div', 'closure-date');
      const parsed = new Date(`${closure.date}T12:00:00-06:00`);
      date.append(
        el('strong', '', String(parsed.getUTCDate()).padStart(2, '0')),
        el('span', '', parsed.toLocaleDateString('es-GT', { month: 'short' }).replace('.', ''))
      );
      const info = el('div', 'closure-info');
      const tour = closure.tourId === 'all' ? 'Todos los tours' : state.tours.find((t) => t.id === closure.tourId)?.name || closure.tourId;
      info.append(el('strong', '', tour), el('span', '', closure.reason || 'Cierre administrativo'));
      const remove = el('button', '', '×');
      remove.type = 'button';
      remove.title = 'Eliminar cierre';
      remove.addEventListener('click', async () => {
        if (!window.confirm('¿Eliminar este cierre? Los cupos vuelven a estar disponibles.')) return;
        try {
          await api(`/api/admin/closures/${encodeURIComponent(closure.id)}`, { method: 'DELETE' });
          toast('Cierre eliminado.');
          loadAvailability();
        } catch (error) {
          handleError(error);
        }
      });
      item.append(date, info, remove);
      list.append(item);
    });
  }

  async function addClosure(event) {
    event.preventDefault();
    const date = $('#closureDate')?.value;
    const tourId = $('#closureTour')?.value || 'all';
    const reason = $('#closureReason')?.value.trim();
    const button = $('#closureSubmit');
    if (!date) {
      toast('Selecciona la fecha del cierre.');
      return;
    }
    if (!reason) {
      toast('Escribe el motivo del cierre.');
      $('#closureReason')?.focus();
      return;
    }
    busy(button, true);
    try {
      await api('/api/admin/closures', {
        method: 'POST',
        body: JSON.stringify({ date, tourId, reason })
      });
      const input = $('#closureReason');
      if (input) input.value = '';
      toast('Cierre registrado.');
      loadAvailability();
    } catch (error) {
      handleError(error);
    } finally {
      busy(button, false);
    }
  }

  /* ====================================================================
     Tours
     ==================================================================== */

  async function loadTours() {
    setSync(true);
    try {
      const data = await api('/api/admin/tours');
      state.tours = data.tours || [];
      renderTours();
      const note = $('#toursNote');
      if (note) note.textContent = `${state.tours.filter((t) => t.active !== false).length} activos de ${state.tours.length} tours`;
    } catch (error) {
      handleError(error);
    } finally {
      setSync(false);
    }
  }

  function renderTours() {
    const grid = $('#toursGrid');
    if (!grid) return;
    grid.replaceChildren();
    if (!state.tours.length) {
      grid.append(el('div', 'empty-state', 'No hay tours. Crea el primero con “Nuevo tour”.'));
      return;
    }
    state.tours.forEach((tour) => {
      const card = el('article', 'tour-admin-card');
      const media = el('div', 'tour-admin-media');
      if (tour.image) {
        const img = el('img');
        img.src = tour.image;
        img.alt = '';
        img.loading = 'lazy';
        media.append(img);
      }
      media.append(statusBadge(tour.active !== false ? 'confirmed' : 'cancelled', tour.active !== false ? 'Activo' : 'Archivado'));
      if (tour.featured) media.append(el('span', 'featured-tag', 'Destacado'));
      const body = el('div', 'tour-admin-body');
      body.append(el('h3', '', tour.name), el('div', 'tour-id', tour.id));
      const meta = el('div', 'tour-admin-meta');
      [
        ['Precio', money(tour.price)],
        ['Duración', tour.duration],
        ['Cupo', `${tour.capacity} por salida`],
        ['Horarios', (tour.times || []).join(' · ')],
        ['Días', (tour.days || []).map((d) => DAY_NAMES[d]).join(' ')]
      ].forEach(([label, value]) => {
        const item = el('span');
        item.append(el('b', '', `${label}: `), document.createTextNode(value || '—'));
        meta.append(item);
      });
      body.append(meta);
      const actions = el('div', 'tour-admin-actions');
      const edit = el('button', 'btn btn-outline', 'Editar');
      edit.type = 'button';
      edit.addEventListener('click', () => openTourForm(tour));
      const remove = el('button', 'btn btn-outline danger', tour.active !== false ? 'Archivar' : 'Eliminar');
      remove.type = 'button';
      remove.addEventListener('click', async () => {
        const hasReservations = window.confirm(`¿${tour.active !== false ? 'Archivar' : 'Eliminar'} “${tour.name}”? Si tiene reservas, se archivará en lugar de borrarse.`);
        if (!hasReservations) return;
        try {
          const result = await api(`/api/admin/tours/${encodeURIComponent(tour.id)}`, { method: 'DELETE' });
          toast(result.archived ? 'Tour archivado (tiene reservas asociadas).' : 'Tour eliminado.');
          loadTours();
        } catch (error) {
          handleError(error);
        }
      });
      actions.append(edit, remove);
      body.append(actions);
      card.append(media, body);
      grid.append(card);
    });
  }

  function formField(labelText, name, value, opts = {}) {
    const wrap = el('label', `field${opts.full ? ' full' : ''}`);
    wrap.append(el('span', '', labelText));
    let input;
    if (opts.textarea) {
      input = el('textarea');
      input.rows = opts.rows || 3;
    } else {
      input = el('input');
      input.type = opts.type || 'text';
      if (opts.min !== undefined) input.min = String(opts.min);
      if (opts.max !== undefined) input.max = String(opts.max);
      if (opts.step !== undefined) input.step = String(opts.step);
    }
    input.name = name;
    input.value = value == null ? '' : value;
    if (opts.placeholder) input.placeholder = opts.placeholder;
    if (opts.readOnly) input.readOnly = true;
    wrap.append(input);
    if (opts.hint) wrap.append(el('small', 'form-hint', opts.hint));
    return wrap;
  }

  function openTourForm(tour = null) {
    const editing = Boolean(tour);
    const form = el('form');
    const grid = el('div', 'form-grid');
    grid.append(
      formField('Identificador', 'id', tour?.id || '', { readOnly: editing, placeholder: 'se genera del nombre', hint: editing ? 'No se puede cambiar.' : undefined }),
      formField('Nombre', 'name', tour?.name || '', { placeholder: 'Ritual de la Cueva' }),
      formField('Etiqueta', 'badge', tour?.badge || '', { placeholder: 'Más reservado' }),
      formField('Duración (texto)', 'duration', tour?.duration || '2 horas'),
      formField('Duración (minutos)', 'durationMinutes', tour?.durationMinutes || 120, { type: 'number', min: 30, max: 720 }),
      formField('Precio (Q)', 'price', tour?.price || '', { type: 'number', min: 1, step: '0.01' }),
      formField('Cupo por salida', 'capacity', tour?.capacity || 12, { type: 'number', min: 1, max: 60 }),
      formField('Mínimo de participantes', 'minParticipants', tour?.minParticipants || 1, { type: 'number', min: 1, max: 60 }),
      formField('Máximo de participantes', 'maxParticipants', tour?.maxParticipants || tour?.capacity || 12, { type: 'number', min: 1, max: 60 }),
      formField('Dificultad', 'difficulty', tour?.difficulty || '', { placeholder: 'Moderada · agua al pecho' }),
      formField('Edad mínima', 'minAge', tour?.minAge || 0, { type: 'number', min: 0, max: 99 }),
      formField('Punto de encuentro', 'meetingPoint', tour?.meetingPoint || '', { full: true }),
      formField('Horarios (separados por coma)', 'times', (tour?.times || []).join(', '), { full: true, placeholder: '08:00, 10:30, 13:00' }),
      formField('Imagen (URL o /assets/…)', 'image', tour?.image || '/assets/img/kanba-cave-01.jpg', { full: true }),
      formField('Descripción corta', 'description', tour?.description || '', { textarea: true, full: true, rows: 2 }),
      formField('Descripción larga', 'longDescription', tour?.longDescription || '', { textarea: true, full: true, rows: 4 }),
      formField('Incluye (uno por línea)', 'includes', (tour?.includes || []).join('\n'), { textarea: true, full: true, rows: 3 }),
      formField('No incluye (uno por línea)', 'notIncludes', (tour?.notIncludes || []).join('\n'), { textarea: true, full: true, rows: 3 })
    );

    const daysWrap = el('div', 'field full');
    daysWrap.append(el('span', '', 'Días de operación'));
    const checks = el('div', 'check-grid');
    const activeDays = tour?.days || [0, 1, 2, 3, 4, 5, 6];
    DAY_NAMES.forEach((label, index) => {
      const check = el('label', 'inline-check');
      const input = el('input');
      input.type = 'checkbox';
      input.name = 'days';
      input.value = String(index);
      input.checked = activeDays.includes(index);
      check.append(input, document.createTextNode(label));
      checks.append(check);
    });
    daysWrap.append(checks);
    grid.append(daysWrap);

    const flags = el('div', 'field full');
    const activeLabel = el('label', 'inline-check');
    const activeInput = el('input');
    activeInput.type = 'checkbox';
    activeInput.name = 'active';
    activeInput.checked = tour ? tour.active !== false : true;
    activeLabel.append(activeInput, document.createTextNode('Tour activo y visible en el sitio'));
    const featuredLabel = el('label', 'inline-check');
    const featuredInput = el('input');
    featuredInput.type = 'checkbox';
    featuredInput.name = 'featured';
    featuredInput.checked = Boolean(tour?.featured);
    featuredLabel.append(featuredInput, document.createTextNode('Marcar como destacado'));
    flags.append(activeLabel, featuredLabel);
    grid.append(flags);

    form.append(grid);
    const actions = el('div', 'modal-actions');
    const save = el('button', 'btn btn-primary btn-compact', editing ? 'Guardar cambios' : 'Crear tour');
    save.type = 'submit';
    const cancel = el('button', 'btn btn-outline btn-compact', 'Cancelar');
    cancel.type = 'button';
    cancel.addEventListener('click', closeModal);
    actions.append(save, cancel);
    form.append(actions);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = {
        id: form.elements.namedItem('id')?.value.trim() || undefined,
        name: form.elements.namedItem('name')?.value.trim(),
        badge: form.elements.namedItem('badge')?.value.trim(),
        duration: form.elements.namedItem('duration')?.value.trim(),
        durationMinutes: Number(form.elements.namedItem('durationMinutes')?.value) || 120,
        price: Number(form.elements.namedItem('price')?.value),
        capacity: Number(form.elements.namedItem('capacity')?.value) || 12,
        minParticipants: Number(form.elements.namedItem('minParticipants')?.value) || 1,
        maxParticipants: Number(form.elements.namedItem('maxParticipants')?.value) || 12,
        difficulty: form.elements.namedItem('difficulty')?.value.trim(),
        minAge: Number(form.elements.namedItem('minAge')?.value) || 0,
        meetingPoint: form.elements.namedItem('meetingPoint')?.value.trim(),
        times: (form.elements.namedItem('times')?.value || '').split(',').map((t) => t.trim()).filter(Boolean),
        image: form.elements.namedItem('image')?.value.trim(),
        description: form.elements.namedItem('description')?.value.trim(),
        longDescription: form.elements.namedItem('longDescription')?.value.trim(),
        includes: (form.elements.namedItem('includes')?.value || '').split('\n').map((t) => t.trim()).filter(Boolean),
        notIncludes: (form.elements.namedItem('notIncludes')?.value || '').split('\n').map((t) => t.trim()).filter(Boolean),
        days: $$('input[name="days"]:checked', form).map((input) => Number(input.value)),
        active: form.elements.namedItem('active')?.checked !== false,
        featured: Boolean(form.elements.namedItem('featured')?.checked)
      };
      if (!data.name || data.name.length < 3) {
        toast('El nombre del tour debe tener al menos 3 caracteres.');
        return;
      }
      if (!data.times.length) {
        toast('Agrega al menos un horario en formato HH:MM.');
        return;
      }
      if (!data.days.length) {
        toast('Selecciona al menos un día de operación.');
        return;
      }
      if (!Number.isFinite(data.price) || data.price <= 0) {
        toast('El precio debe ser mayor a cero.');
        return;
      }
      busy(save, true);
      try {
        if (editing) {
          await api(`/api/admin/tours/${encodeURIComponent(tour.id)}`, { method: 'PUT', body: JSON.stringify(data) });
          toast('Tour actualizado.');
        } else {
          await api('/api/admin/tours', { method: 'POST', body: JSON.stringify(data) });
          toast('Tour creado.');
        }
        closeModal();
        loadTours();
      } catch (error) {
        handleError(error);
      } finally {
        busy(save, false);
      }
    });

    openModal(editing ? tour.name : 'Nuevo tour', form, { kicker: 'Catálogo de experiencias', wide: true });
  }

  /* ====================================================================
     Contenido
     ==================================================================== */

  const CONTENT_TABS = [
    ['brand', 'Marca'],
    ['hero', 'Portada'],
    ['history', 'Historia'],
    ['sections', 'Secciones'],
    ['map', 'Mapa'],
    ['visitors', 'Visitantes'],
    ['contact', 'Contacto']
  ];

  async function loadContent() {
    setSync(true);
    try {
      const data = await api('/api/admin/content');
      state.content = clone(data.content);
      renderContent();
    } catch (error) {
      handleError(error);
    } finally {
      setSync(false);
    }
  }

  function renderContent() {
    if (!state.content) return;
    const tabs = $('#contentTabs');
    const panels = $('#contentPanels');
    if (!tabs || !panels) return;
    tabs.replaceChildren();
    panels.replaceChildren();
    CONTENT_TABS.forEach(([key, label]) => {
      const button = el('button', 'content-tab', label);
      button.type = 'button';
      button.dataset.contentTab = key;
      button.addEventListener('click', () => showContentTab(key));
      tabs.append(button);
    });
    CONTENT_TABS.forEach(([key]) => {
      const panel = el('div', 'content-panel');
      panel.dataset.contentPanel = key;
      panel.append(buildContentPanel(key));
      panels.append(panel);
    });
    if (!CONTENT_TABS.some(([key]) => key === state.contentTab)) state.contentTab = 'brand';
    showContentTab(state.contentTab);
  }

  function showContentTab(key) {
    state.contentTab = key;
    $$('[data-content-tab]').forEach((button) => button.classList.toggle('is-active', button.dataset.contentTab === key));
    $$('[data-content-panel]').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.contentPanel === key));
  }

  function contentField(path, label, opts = {}) {
    const wrap = el('label', `field${opts.full ? ' full' : ''}`);
    wrap.append(el('span', '', label));
    let input;
    if (opts.textarea) {
      input = el('textarea');
      input.rows = opts.rows || 3;
    } else {
      input = el('input');
      input.type = opts.type || 'text';
      if (opts.min !== undefined) input.min = String(opts.min);
      if (opts.max !== undefined) input.max = String(opts.max);
      if (opts.step !== undefined) input.step = String(opts.step);
      if (opts.placeholder) input.placeholder = opts.placeholder;
    }
    const value = getPath(state.content, path);
    input.value = opts.lines ? (Array.isArray(value) ? value.join('\n') : '') : (value == null ? '' : String(value));
    input.dataset.path = path;
    if (opts.lines) input.dataset.lines = '1';
    if (opts.type === 'number') input.dataset.number = '1';
    wrap.append(input);
    if (opts.hint) wrap.append(el('small', 'form-hint', opts.hint));
    return wrap;
  }

  function contentCard(title, description, fields) {
    const card = el('div', 'admin-card');
    const head = el('div', 'content-section-head');
    const left = el('div');
    left.append(el('h3', '', title));
    if (description) left.append(el('p', '', description));
    head.append(left);
    card.append(head);
    const grid = el('div', 'form-grid');
    fields.forEach((field) => grid.append(field));
    card.append(grid);
    return card;
  }

  function repeater(container, path, fields, blank, addLabel) {
    let items = getPath(state.content, path);
    if (!Array.isArray(items)) {
      items = [];
      setPath(state.content, path, items);
    }
    const root = el('div', 'repeater');

    function draw() {
      root.replaceChildren();
      items.forEach((item, index) => {
        const row = el('div', 'repeater-item');
        const fieldsWrap = el('div', 'repeater-fields');
        fields.forEach((field) => {
          const wrap = el('label', `field${field.full ? ' full' : ''}`);
          wrap.append(el('span', '', field.label));
          let input;
          if (field.lines || field.textarea) {
            input = el('textarea');
            input.rows = field.rows || 2;
            input.value = field.lines && Array.isArray(item[field.key]) ? item[field.key].join('\n') : (item[field.key] || '');
          } else {
            input = el('input');
            input.type = 'text';
            input.value = item[field.key] == null ? '' : String(item[field.key]);
          }
          input.addEventListener('input', () => {
            if (field.lines) {
              item[field.key] = input.value.split('\n').map((v) => v.trim()).filter(Boolean);
            } else {
              item[field.key] = input.value;
            }
          });
          wrap.append(input);
          fieldsWrap.append(wrap);
        });
        const remove = el('button', 'repeater-remove', '×');
        remove.type = 'button';
        remove.title = 'Eliminar';
        remove.addEventListener('click', () => {
          items.splice(index, 1);
          draw();
        });
        row.append(fieldsWrap, remove);
        root.append(row);
      });
      const add = el('button', 'repeater-add', addLabel || '+ Añadir');
      add.type = 'button';
      add.addEventListener('click', () => {
        items.push(clone(blank));
        draw();
      });
      root.append(add);
    }

    draw();
    container.append(root);
  }

  function buildContentPanel(key) {
    const fragment = document.createDocumentFragment();
    if (key === 'brand') {
      fragment.append(contentCard('Identidad de marca', 'Nombre, promesa y frase principal del sitio.', [
        contentField('brand.name', 'Nombre'),
        contentField('brand.sub', 'Subtítulo'),
        contentField('brand.tagline', 'Tagline'),
        contentField('brand.claim', 'Frase de marca', { textarea: true, rows: 2, full: true })
      ]));
    }

    if (key === 'hero') {
      fragment.append(contentCard('Portada principal', 'Texto e imagen de la primera pantalla. Usa una URL o una ruta de /assets/img.', [
        contentField('hero.kicker', 'Antetítulo'),
        contentField('hero.title', 'Título'),
        contentField('hero.subtitle', 'Subtítulo'),
        contentField('hero.text', 'Texto descriptivo', { textarea: true, rows: 3, full: true }),
        contentField('hero.image', 'Imagen de portada', { full: true }),
        contentField('hero.imageAlt', 'Texto alternativo de la imagen', { full: true }),
        contentField('hero.badge', 'Etiqueta de disponibilidad'),
        contentField('hero.openText', 'Horario destacado'),
        contentField('hero.rating', 'Calificación'),
        contentField('hero.reviews', 'Número de reseñas')
      ]));
    }

    if (key === 'history') {
      const introCard = contentCard('La cueva', 'Relato introductorio y fotografías.', [
        contentField('intro.kicker', 'Antetítulo'),
        contentField('intro.title', 'Título'),
        contentField('intro.lead', 'Entradilla', { textarea: true, rows: 3, full: true }),
        contentField('intro.paragraphs', 'Párrafos (uno por línea)', { textarea: true, rows: 5, full: true, lines: true }),
        contentField('intro.image', 'Imagen principal'),
        contentField('intro.image2', 'Imagen secundaria')
      ]);
      fragment.append(introCard);

      const statsContainer = el('div');
      repeater(statsContainer, 'intro.stats', [
        { key: 'value', label: 'Valor' },
        { key: 'suffix', label: 'Sufijo' },
        { key: 'label', label: 'Etiqueta', full: true }
      ], { value: '0', suffix: '', label: 'Nueva cifra' }, '+ Añadir cifra');
      const statsCard = contentCard('Cifras', 'Datos que aparecen bajo el relato.', []);
      statsCard.append(statsContainer);
      fragment.append(statsCard);

      const valuesContainer = el('div');
      repeater(valuesContainer, 'values', [
        { key: 'icon', label: 'Icono (flame, water, leaf)' },
        { key: 'title', label: 'Título' },
        { key: 'text', label: 'Texto', full: true, lines: false, textarea: true, rows: 2 }
      ], { icon: 'flame', title: 'Nuevo valor', text: '' }, '+ Añadir valor');
      const valuesCard = contentCard('Valores', 'Los tres pilares de la experiencia.', []);
      valuesCard.append(valuesContainer);
      fragment.append(valuesCard);

      const timelineContainer = el('div');
      repeater(timelineContainer, 'timeline', [
        { key: 'year', label: 'Año' },
        { key: 'title', label: 'Título' },
        { key: 'text', label: 'Texto', full: true, textarea: true, rows: 2 }
      ], { year: '', title: '', text: '' }, '+ Añadir hito');
      const timelineCard = contentCard('Línea de tiempo', 'Historia y conservación.', []);
      timelineCard.append(timelineContainer);
      fragment.append(timelineCard);
    }

    if (key === 'sections') {
      const defs = [
        ['toursIntro', 'Experiencias', 'Introducción del catálogo de tours.'],
        ['bookingIntro', 'Reserva en línea', 'Texto del bloque de reserva.'],
        ['galleryIntro', 'Galería', 'Introducción del archivo visual.'],
        ['videosIntro', 'Videos', 'Introducción de la videoteca.'],
        ['infoIntro', 'Antes de bajar', 'Introducción de requisitos y recomendaciones.'],
        ['policiesIntro', 'Políticas', 'Introducción de las políticas.']
      ];
      defs.forEach(([path, title, description]) => {
        fragment.append(contentCard(title, description, [
          contentField(`${path}.kicker`, 'Antetítulo'),
          contentField(`${path}.title`, 'Título'),
          contentField(`${path}.text`, 'Texto', { textarea: true, rows: 3, full: true })
        ]));
      });
    }

    if (key === 'map') {
      fragment.append(contentCard('Cómo llegar', 'Dirección, coordenadas y notas de acceso.', [
        contentField('mapIntro.kicker', 'Antetítulo'),
        contentField('mapIntro.title', 'Título'),
        contentField('mapIntro.text', 'Texto', { textarea: true, rows: 3, full: true }),
        contentField('mapIntro.address', 'Dirección', { full: true }),
        contentField('mapIntro.lat', 'Latitud', { type: 'number', step: 'any' }),
        contentField('mapIntro.lng', 'Longitud', { type: 'number', step: 'any' }),
        contentField('mapIntro.plusCode', 'Plus Code', { full: true }),
        contentField('mapIntro.note', 'Nota de acceso', { textarea: true, rows: 2, full: true })
      ]));
      const directionsContainer = el('div');
      repeater(directionsContainer, 'mapIntro.directions', [
        { key: 'label', label: 'Desde' },
        { key: 'value', label: 'Distancia / tiempo' }
      ], { label: 'Nuevo origen', value: '' }, '+ Añadir indicación');
      const card = contentCard('Indicaciones', 'Distancias desde los puntos de referencia.', []);
      card.append(directionsContainer);
      fragment.append(card);
    }

    if (key === 'visitors') {
      fragment.append(contentCard('Requisitos', 'Un requisito por línea.', [
        contentField('requirements', 'Requisitos de ingreso', { textarea: true, rows: 6, full: true, lines: true })
      ]));
      fragment.append(contentCard('Recomendaciones', 'Un consejo por línea.', [
        contentField('recommendations', 'Recomendaciones', { textarea: true, rows: 6, full: true, lines: true })
      ]));
      fragment.append(contentCard('Restricciones', 'Una restricción por línea.', [
        contentField('restrictions', 'Restricciones', { textarea: true, rows: 7, full: true, lines: true })
      ]));

      const policyContainer = el('div');
      repeater(policyContainer, 'policies', [
        { key: 'id', label: 'Identificador' },
        { key: 'title', label: 'Título' },
        { key: 'summary', label: 'Resumen', full: true },
        { key: 'items', label: 'Puntos (uno por línea)', full: true, lines: true, rows: 4 }
      ], { id: 'nueva-politica', title: 'Nueva política', summary: '', items: [] }, '+ Añadir política');
      const policyCard = contentCard('Políticas', 'Reserva, pagos, cancelación, clima, reembolsos y privacidad.', []);
      policyCard.append(policyContainer);
      fragment.append(policyCard);

      const faqContainer = el('div');
      repeater(faqContainer, 'faq', [
        { key: 'q', label: 'Pregunta', full: true },
        { key: 'a', label: 'Respuesta', full: true, textarea: true, rows: 3 }
      ], { q: 'Nueva pregunta', a: '' }, '+ Añadir pregunta');
      const faqCard = contentCard('Preguntas frecuentes', 'Respuestas breves para visitantes.', []);
      faqCard.append(faqContainer);
      fragment.append(faqCard);
    }

    if (key === 'contact') {
      fragment.append(contentCard('Contacto', 'Datos públicos de atención.', [
        contentField('contact.phone', 'Teléfono'),
        contentField('contact.whatsapp', 'WhatsApp (solo dígitos)'),
        contentField('contact.email', 'Correo'),
        contentField('contact.address', 'Dirección', { full: true }),
        contentField('contact.hours', 'Horario'),
        contentField('contact.instagram', 'Instagram'),
        contentField('contact.facebook', 'Facebook'),
        contentField('contact.emergency', 'Emergencias'),
        contentField('footerNote', 'Nota del pie de página', { textarea: true, rows: 3, full: true })
      ]));
    }

    return fragment;
  }

  function collectContent() {
    $$('#contentPanels [data-path]').forEach((input) => {
      let value = input.value;
      if (input.dataset.lines) value = value.split('\n').map((line) => line.trim()).filter(Boolean);
      else if (input.dataset.number) value = Number(value);
      setPath(state.content, input.dataset.path, value);
    });
  }

  async function saveContent(button) {
    if (!state.content) return;
    busy(button, true);
    try {
      collectContent();
      const data = await api('/api/admin/content', {
        method: 'PUT',
        body: JSON.stringify({ content: state.content })
      });
      state.content = clone(data.content);
      renderContent();
      toast('Contenido publicado en el sitio.');
    } catch (error) {
      handleError(error);
    } finally {
      busy(button, false);
    }
  }

  /* ====================================================================
     Galería
     ==================================================================== */

  async function loadGallery() {
    setSync(true);
    try {
      const data = await api('/api/admin/content');
      state.content = clone(data.content);
      renderGallery();
    } catch (error) {
      handleError(error);
    } finally {
      setSync(false);
    }
  }

  function renderGallery() {
    const grid = $('#galleryGrid');
    const note = $('#galleryNote');
    if (!grid) return;
    const gallery = state.content?.gallery || [];
    if (note) note.textContent = `${gallery.length} imágenes en la galería pública.`;
    grid.replaceChildren();
    if (!gallery.length) {
      grid.append(el('div', 'empty-state', 'No hay imágenes. Sube una foto o añade una URL.'));
      return;
    }
    gallery.forEach((item, index) => {
      const card = el('article', 'gallery-admin-card');
      const thumb = el('div', 'thumb');
      const img = el('img');
      img.src = item.src;
      img.alt = item.caption || '';
      img.loading = 'lazy';
      thumb.append(img);
      const body = el('div', 'gallery-admin-body');

      const caption = el('label', 'field');
      caption.append(el('span', '', 'Caption'));
      const captionInput = el('input');
      captionInput.value = item.caption || '';
      captionInput.addEventListener('input', () => { item.caption = captionInput.value; });
      caption.append(captionInput);

      const category = el('label', 'field');
      category.append(el('span', '', 'Categoría'));
      const select = el('select');
      CATEGORY_OPTIONS.forEach(([value, label]) => {
        const option = el('option', '', label);
        option.value = value;
        option.selected = item.category === value;
        select.append(option);
      });
      select.addEventListener('change', () => { item.category = select.value; });
      category.append(select);

      const credit = el('label', 'field');
      credit.append(el('span', '', 'Crédito / licencia'));
      const creditInput = el('input');
      creditInput.value = item.credit || '';
      creditInput.addEventListener('input', () => { item.credit = creditInput.value; });
      credit.append(creditInput);

      const actions = el('div', 'gallery-admin-actions');
      const preview = el('a', 'btn btn-outline', 'Ver');
      preview.href = item.src;
      preview.target = '_blank';
      preview.rel = 'noopener';
      const remove = el('button', 'btn btn-outline danger', 'Quitar');
      remove.type = 'button';
      remove.addEventListener('click', () => {
        if (!window.confirm('¿Quitar esta imagen de la galería? Se aplicará al guardar.')) return;
        state.content.gallery.splice(index, 1);
        renderGallery();
        toast('Imagen quitada. Guarda la galería para publicar.');
      });
      actions.append(preview, remove);
      body.append(caption, category, credit, actions);
      card.append(thumb, body);
      grid.append(card);
    });
  }

  function openGalleryForm(prefill = {}) {
    const form = el('form');
    const grid = el('div', 'form-grid');
    grid.append(
      formField('URL de la imagen', 'src', prefill.src || '', { full: true, placeholder: '/assets/img/foto.jpg o https://…' }),
      formField('Descripción', 'caption', prefill.caption || '', { full: true }),
      formField('Crédito / licencia', 'credit', prefill.credit || 'Wikimedia Commons')
    );
    const catWrap = el('label', 'field');
    catWrap.append(el('span', '', 'Categoría'));
    const select = el('select');
    select.name = 'category';
    CATEGORY_OPTIONS.forEach(([value, label]) => {
      const option = el('option', '', label);
      option.value = value;
      option.selected = (prefill.category || 'cueva') === value;
      select.append(option);
    });
    catWrap.append(select);
    grid.append(catWrap);
    form.append(grid);
    const actions = el('div', 'modal-actions');
    const save = el('button', 'btn btn-primary btn-compact', 'Añadir a la galería');
    save.type = 'submit';
    const cancel = el('button', 'btn btn-outline btn-compact', 'Cancelar');
    cancel.type = 'button';
    cancel.addEventListener('click', closeModal);
    actions.append(save, cancel);
    form.append(actions);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const src = form.elements.namedItem('src')?.value.trim();
      if (!src) {
        toast('La URL de la imagen es obligatoria.');
        return;
      }
      state.content.gallery = state.content.gallery || [];
      state.content.gallery.push({
        id: `img_${Date.now()}`,
        src,
        caption: form.elements.namedItem('caption')?.value.trim() || '',
        category: select.value || 'cueva',
        credit: form.elements.namedItem('credit')?.value.trim() || ''
      });
      closeModal();
      renderGallery();
      toast('Imagen añadida. Guarda la galería para publicar.');
    });

    openModal('Añadir imagen', form, { kicker: 'Galería pública' });
  }

  async function saveGallery(button) {
    busy(button, true);
    try {
      const data = await api('/api/admin/content', {
        method: 'PUT',
        body: JSON.stringify({ content: state.content })
      });
      state.content = clone(data.content);
      renderGallery();
      toast('Galería publicada.');
    } catch (error) {
      handleError(error);
    } finally {
      busy(button, false);
    }
  }

  async function uploadGallery(file) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast('La imagen supera los 8 MB.');
      return;
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setSync(true);
    try {
      const data = await api('/api/admin/media', {
        method: 'POST',
        body: JSON.stringify({ dataUrl })
      });
      openGalleryForm({ src: data.url, caption: file.name.replace(/\.[^.]+$/, ''), credit: 'Carga propia' });
      toast('Imagen subida. Completa los datos para añadirla.');
    } catch (error) {
      handleError(error);
    } finally {
      setSync(false);
      const input = $('#galleryUpload');
      if (input) input.value = '';
    }
  }

  /* ====================================================================
     Videos
     ==================================================================== */

  async function loadVideos() {
    setSync(true);
    try {
      const data = await api('/api/admin/content');
      state.content = clone(data.content);
      renderVideos();
    } catch (error) {
      handleError(error);
    } finally {
      setSync(false);
    }
  }

  function renderVideos() {
    const grid = $('#videosGrid');
    const note = $('#videosNote');
    if (!grid) return;
    const videos = state.content?.videos || [];
    if (note) note.textContent = `${videos.length} videos en la videoteca pública.`;
    grid.replaceChildren();
    if (!videos.length) {
      grid.append(el('div', 'empty-state', 'No hay videos. Añade uno con “Nuevo video”.'));
      return;
    }
    videos.forEach((video, index) => {
      const card = el('article', 'video-admin-card');
      const thumb = el('div', 'video-thumb');
      const img = el('img');
      img.src = `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`;
      img.alt = '';
      img.loading = 'lazy';
      thumb.append(img, el('span'));
      const body = el('div', 'video-admin-body');
      body.append(el('h3', '', video.title || 'Video'), el('p', '', video.description || 'Sin descripción.'));
      const meta = el('div', 'video-admin-meta');
      meta.append(el('span', '', video.category || 'General'), el('span', '', video.youtubeId || '—'));
      const actions = el('div', 'video-admin-actions');
      const edit = el('button', 'btn btn-outline', 'Editar');
      edit.type = 'button';
      edit.addEventListener('click', () => openVideoForm(video));
      const remove = el('button', 'btn btn-outline danger', 'Quitar');
      remove.type = 'button';
      remove.addEventListener('click', () => {
        if (!window.confirm('¿Quitar este video de la videoteca? Se aplicará al guardar.')) return;
        state.content.videos.splice(index, 1);
        renderVideos();
        toast('Video quitado. Guarda los videos para publicar.');
      });
      actions.append(edit, remove);
      body.append(meta, actions);
      card.append(thumb, body);
      grid.append(card);
    });
  }

  function openVideoForm(video = null) {
    const editing = Boolean(video);
    const form = el('form');
    const grid = el('div', 'form-grid');
    grid.append(
      formField('ID de YouTube', 'youtubeId', video?.youtubeId || '', { full: true, placeholder: 'kZusYOYxpA8', hint: 'Solo el identificador, no la URL completa.' }),
      formField('Título', 'title', video?.title || '', { full: true }),
      formField('Categoría', 'category', video?.category || 'Cueva'),
      formField('Descripción', 'description', video?.description || '', { textarea: true, rows: 3, full: true })
    );
    form.append(grid);
    const actions = el('div', 'modal-actions');
    const save = el('button', 'btn btn-primary btn-compact', editing ? 'Guardar cambios' : 'Añadir video');
    save.type = 'submit';
    const cancel = el('button', 'btn btn-outline btn-compact', 'Cancelar');
    cancel.type = 'button';
    cancel.addEventListener('click', closeModal);
    actions.append(save, cancel);
    form.append(actions);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const youtubeId = form.elements.namedItem('youtubeId')?.value.trim();
      if (!/^[A-Za-z0-9_-]{6,20}$/.test(youtubeId || '')) {
        toast('El ID de YouTube no es válido.');
        return;
      }
      const data = {
        id: video?.id || `vid_${Date.now()}`,
        youtubeId,
        title: form.elements.namedItem('title')?.value.trim() || 'Video',
        description: form.elements.namedItem('description')?.value.trim() || '',
        category: form.elements.namedItem('category')?.value.trim() || 'Cueva'
      };
      state.content.videos = state.content.videos || [];
      if (editing) {
        const index = state.content.videos.findIndex((v) => v.id === video.id);
        if (index >= 0) state.content.videos[index] = data;
      } else {
        state.content.videos.push(data);
      }
      closeModal();
      renderVideos();
      toast('Video actualizado. Guarda los videos para publicar.');
    });
    openModal(editing ? 'Editar video' : 'Nuevo video', form, { kicker: 'Videoteca pública' });
  }

  async function saveVideos(button) {
    busy(button, true);
    try {
      const data = await api('/api/admin/content', {
        method: 'PUT',
        body: JSON.stringify({ content: state.content })
      });
      state.content = clone(data.content);
      renderVideos();
      toast('Videos publicados.');
    } catch (error) {
      handleError(error);
    } finally {
      busy(button, false);
    }
  }

  /* ====================================================================
     Correos
     ==================================================================== */

  async function loadEmails() {
    setSync(true);
    try {
      const data = await api('/api/admin/emails?limit=200');
      state.emails = data.emails || [];
      renderEmails();
    } catch (error) {
      handleError(error);
    } finally {
      setSync(false);
    }
  }

  function renderEmails() {
    const list = $('#emailsList');
    const count = $('#emailCount');
    if (!list) return;
    if (count) count.textContent = `${state.emails.length} correos en la bandeja`;
    list.replaceChildren();
    if (!state.emails.length) {
      list.append(el('div', 'empty-state', 'La bandeja está vacía. Los correos aparecen al crear y pagar reservas.'));
      return;
    }
    state.emails.forEach((email) => {
      const item = el('div', 'email-item');
      const icon = el('div', 'email-icon');
      icon.innerHTML = '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
      const main = el('div', 'email-main');
      main.append(el('strong', '', email.subject || '(Sin asunto)'), el('span', '', `${email.to || '—'} · ${email.reservationCode || '—'} · ${email.template || '—'}`));
      const side = el('div', 'email-side');
      side.append(el('time', '', longDateTime(email.createdAt)), statusBadge(email.status, STATUS_LABEL[email.status] || email.status));
      item.append(icon, main, side);
      item.addEventListener('click', () => openEmail(email));
      list.append(item);
    });
  }

  function openEmail(email) {
    const body = el('div');
    const meta = el('div', 'email-meta');
    const entries = [
      ['Para', email.to],
      ['Plantilla', email.template],
      ['Reserva', email.reservationCode],
      ['Estado', STATUS_LABEL[email.status] || email.status],
      ['Proveedor', email.provider],
      ['Creado', longDateTime(email.createdAt)]
    ];
    entries.forEach(([label, value]) => {
      const item = el('span');
      item.append(el('b', '', `${label}: `), document.createTextNode(value || '—'));
      meta.append(item);
    });
    const preview = el('div', 'email-preview');
    const frame = el('iframe');
    frame.setAttribute('sandbox', '');
    frame.setAttribute('title', 'Vista previa del correo');
    frame.srcdoc = email.html || `<pre>${String(email.text || '').replace(/[<>&]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[ch]))}</pre>`;
    preview.append(frame);
    body.append(meta, preview);
    openModal(email.subject || 'Correo', body, { kicker: 'Bandeja de salida', wide: true });
  }

  /* ====================================================================
     Reembolsos
     ==================================================================== */

  async function loadRefunds() {
    setSync(true);
    try {
      const data = await api('/api/admin/refunds');
      state.refunds = data.refunds || [];
      renderRefundItems($('#refundsList'), state.refunds);
      const count = $('#refundCount');
      if (count) count.textContent = `${state.refunds.length} reembolsos · ${state.refunds.filter((r) => r.status === 'pending').length} pendientes`;
    } catch (error) {
      handleError(error);
    } finally {
      setSync(false);
    }
  }

  function renderRefundItems(container, refunds, { compact = false } = {}) {
    if (!container) return;
    container.replaceChildren();
    if (!refunds?.length) {
      const empty = el('div', 'empty-state');
      empty.append(el('strong', '', 'Sin reembolsos pendientes'), document.createTextNode('Las cancelaciones con importe a favor aparecerán aquí.'));
      container.append(empty);
      return;
    }
    refunds.forEach((refund) => {
      const item = el('div', 'refund-item');
      const main = el('div', 'refund-main');
      main.append(
        el('strong', '', `${refund.reservationCode || '—'} · ${refund.customerName || 'Cliente'}`),
        el('span', '', `${refund.customerEmail || '—'} · ${refund.reason || 'Sin motivo'} · ${shortDate(refund.requestedAt)}`)
      );
      const amount = el('div', 'refund-amount');
      amount.append(el('strong', '', money(refund.amount)), el('span', '', `${refund.percent || 0}% · ${refund.method || '—'}`));
      const actions = el('div', 'refund-actions');
      const view = el('button', 'btn btn-outline', 'Ver reserva');
      view.type = 'button';
      view.addEventListener('click', () => openReservation(refund.reservationCode));
      actions.append(view);
      if (refund.status === 'pending') {
        const process = el('button', 'btn btn-primary', 'Procesar');
        process.type = 'button';
        process.addEventListener('click', () => openRefundProcess(refund));
        actions.append(process);
      } else {
        actions.append(statusBadge(refund.status || 'processed', refund.status === 'processed' ? 'Procesado' : refund.status));
      }
      item.append(main, amount, actions);
      if (!compact) {
        const meta = el('div', 'refund-main');
        meta.style.flexBasis = '100%';
        meta.append(el('span', '', `Solicitado ${longDateTime(refund.requestedAt)}${refund.processedAt ? ` · procesado ${longDateTime(refund.processedAt)}` : ''}${refund.reference ? ` · referencia ${refund.reference}` : ''}`));
        item.append(meta);
      }
      container.append(item);
    });
  }

  function openRefundProcess(refund) {
    const form = el('form');
    const grid = el('div', 'form-grid');
    grid.append(
      formField('Referencia del reembolso', 'reference', refund.reference || `RF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000 + 10000))}`, { full: true }),
      formField('Método', 'method', refund.method || 'Medio de pago original', { full: true })
    );
    form.append(grid);
    const note = el('div', 'modal-note warn', `Se procesará un reembolso de ${money(refund.amount)} para ${refund.customerName} (${refund.reservationCode}). Se enviará un correo automático.`);
    form.append(note);
    const actions = el('div', 'modal-actions');
    const process = el('button', 'btn btn-primary btn-compact', 'Marcar como procesado');
    process.type = 'submit';
    const cancel = el('button', 'btn btn-outline btn-compact', 'Cancelar');
    cancel.type = 'button';
    cancel.addEventListener('click', closeModal);
    actions.append(process, cancel);
    form.append(actions);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      busy(process, true);
      try {
        await api(`/api/admin/refunds/${encodeURIComponent(refund.id)}/process`, {
          method: 'POST',
          body: JSON.stringify({
            reference: form.elements.namedItem('reference')?.value.trim(),
            method: form.elements.namedItem('method')?.value.trim()
          })
        });
        toast('Reembolso procesado y correo generado.');
        closeModal();
        loadRefunds();
        if (state.view === 'overview') loadOverview();
      } catch (error) {
        handleError(error);
      } finally {
        busy(process, false);
      }
    });
    openModal('Procesar reembolso', form, { kicker: 'Control de reembolsos' });
  }

  /* ====================================================================
     Configuración
     ==================================================================== */

  async function loadSettings() {
    setSync(true);
    try {
      const data = await api('/api/admin/settings');
      state.settings = clone(data.settings);
      renderSettings();
    } catch (error) {
      handleError(error);
    } finally {
      setSync(false);
    }
  }

  function settingsField(container, path, label, opts = {}) {
    const value = getPath(state.settings, path);
    const wrap = el('label', `field${opts.full ? ' full' : ''}`);
    wrap.append(el('span', '', label));
    let input;
    if (opts.checkbox) {
      const check = el('label', 'inline-check');
      input = el('input');
      input.type = 'checkbox';
      input.checked = Boolean(value);
      check.append(input, document.createTextNode(opts.checkboxLabel || 'Activo'));
      wrap.append(check);
    } else if (opts.select) {
      input = el('select');
      opts.select.forEach(([val, text]) => {
        const option = el('option', '', text);
        option.value = val;
        option.selected = String(value) === String(val);
        input.append(option);
      });
      wrap.append(input);
    } else {
      input = el('input');
      input.type = opts.type || 'text';
      input.value = value == null ? '' : String(value);
      if (opts.min !== undefined) input.min = String(opts.min);
      if (opts.max !== undefined) input.max = String(opts.max);
      if (opts.step !== undefined) input.step = String(opts.step);
      if (opts.placeholder) input.placeholder = opts.placeholder;
      wrap.append(input);
    }
    input.dataset.settingsPath = path;
    container.append(wrap);
  }

  function renderSettings() {
    if (!state.settings) return;
    const business = $('#settingsBusiness');
    const booking = $('#settingsBooking');
    const payments = $('#settingsPayments');
    const smtp = $('#settingsSmtp');
    if (business) {
      business.replaceChildren();
      settingsField(business, 'business.legalName', 'Razón social', { full: true });
      settingsField(business, 'business.nit', 'NIT');
      settingsField(business, 'business.phone', 'Teléfono');
      settingsField(business, 'business.email', 'Correo');
      settingsField(business, 'business.address', 'Dirección', { full: true });
    }
    if (booking) {
      booking.replaceChildren();
      settingsField(booking, 'booking.holdMinutes', 'Bloqueo de cupos (min)', { type: 'number', min: 5, max: 120 });
      settingsField(booking, 'booking.advanceDays', 'Venta anticipada (días)', { type: 'number', min: 7, max: 365 });
      settingsField(booking, 'booking.cutoffHours', 'Corte previo (horas)', { type: 'number', min: 0 });
      settingsField(booking, 'booking.exchangeRate', 'Tipo de cambio GTQ/USD', { type: 'number', min: 1, step: '0.01' });
      settingsField(booking, 'booking.currency', 'Moneda');
      settingsField(booking, 'booking.maxSeatsPerOrder', 'Máximo de asientos por orden', { type: 'number', min: 1, max: 60 });
    }
    if (payments) {
      payments.replaceChildren();
      settingsField(payments, 'payments.provider', 'Proveedor', { full: true });
      settingsField(payments, 'payments.mode', 'Modo', { select: [['sandbox', 'Sandbox'], ['live', 'Producción']] });
      settingsField(payments, 'payments.merchantId', 'Merchant ID');
      settingsField(payments, 'payments.publicKey', 'Llave pública', { full: true });
      settingsField(payments, 'payments.secretKey', 'Llave secreta', { full: true });
      settingsField(payments, 'payments.webhookSecret', 'Secreto de webhook', { full: true });
      settingsField(payments, 'payments.statement', 'Descriptor del estado de cuenta', { full: true });
    }
    if (smtp) {
      smtp.replaceChildren();
      settingsField(smtp, 'smtp.host', 'Host', { full: true, placeholder: 'smtp.ejemplo.com' });
      settingsField(smtp, 'smtp.port', 'Puerto', { type: 'number', min: 1, max: 65535 });
      settingsField(smtp, 'smtp.secure', 'Conexión segura', { checkbox: true, checkboxLabel: 'TLS/SSL' });
      settingsField(smtp, 'smtp.user', 'Usuario', { full: true });
      settingsField(smtp, 'smtp.pass', 'Contraseña', { type: 'password', full: true });
      settingsField(smtp, 'smtp.fromEmail', 'Correo remitente');
      settingsField(smtp, 'smtp.fromName', 'Nombre remitente');
    }
  }

  async function saveSettings(button) {
    if (!state.settings) return;
    $$('#settingsForm [data-settings-path]').forEach((input) => {
      let value;
      if (input.type === 'checkbox') value = input.checked;
      else if (input.type === 'number') value = Number(input.value);
      else value = input.value;
      setPath(state.settings, input.dataset.settingsPath, value);
    });
    busy(button, true);
    try {
      const data = await api('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings: state.settings })
      });
      state.settings = clone(data.settings);
      renderSettings();
      toast('Configuración guardada.');
    } catch (error) {
      handleError(error);
    } finally {
      busy(button, false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    const current = $('#currentPassword');
    const next = $('#nextPassword');
    const confirm = $('#confirmPassword');
    const error = $('#passwordError');
    const button = $('#savePassword');
    if (error) {
      error.hidden = true;
      error.textContent = '';
    }
    if (!current?.value || !next?.value) {
      showPasswordError('Completa todos los campos.');
      return;
    }
    if (next.value.length < 8) {
      showPasswordError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (next.value !== confirm?.value) {
      showPasswordError('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    busy(button, true);
    try {
      await api('/api/admin/password', {
        method: 'POST',
        body: JSON.stringify({ current: current.value, next: next.value })
      });
      current.value = '';
      next.value = '';
      if (confirm) confirm.value = '';
      toast('Contraseña actualizada.');
    } catch (err) {
      showPasswordError(err.status === 401 ? 'La contraseña actual no es correcta.' : err.message);
    } finally {
      busy(button, false);
    }
  }

  function showPasswordError(message) {
    const error = $('#passwordError');
    if (!error) {
      toast(message);
      return;
    }
    error.hidden = false;
    error.textContent = message;
  }

  /* ====================================================================
     Eventos e inicio
     ==================================================================== */

  function bind() {
    $('#loginForm')?.addEventListener('submit', login);
    $('#logoutButton')?.addEventListener('click', logout);

    $$('.nav-item').forEach((item) => {
      item.addEventListener('click', () => navigate(item.dataset.view));
    });

    $('#menuToggle')?.addEventListener('click', openSidebar);
    $('#sidebarClose')?.addEventListener('click', closeSidebar);
    $('#sidebarScrim')?.addEventListener('click', closeSidebar);

    $('#refreshButton')?.addEventListener('click', () => loadView(state.view));

    document.addEventListener('click', (event) => {
      const go = event.target.closest('[data-go]');
      if (go) navigate(go.dataset.go);
      const close = event.target.closest('[data-close-modal]');
      if (close) closeModal();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeModal();
        closeSidebar();
      }
    });

    let searchTimer;
    $('#reservationSearch')?.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(loadReservations, 320);
    });
    $('#reservationStatus')?.addEventListener('change', loadReservations);
    $('#refreshReservations')?.addEventListener('click', loadReservations);

    $('#availabilityDays')?.addEventListener('change', loadAvailability);
    $('#refreshAvailability')?.addEventListener('click', loadAvailability);
    $('#closureForm')?.addEventListener('submit', addClosure);

    $('#newTourButton')?.addEventListener('click', () => openTourForm(null));

    $('#saveContent')?.addEventListener('click', (event) => saveContent(event.currentTarget));
    $('#reloadContent')?.addEventListener('click', loadContent);

    $('#galleryAddUrl')?.addEventListener('click', () => openGalleryForm({ category: 'cueva' }));
    $('#galleryUpload')?.addEventListener('change', (event) => uploadGallery(event.target.files?.[0]));
    $('#saveGallery')?.addEventListener('click', (event) => saveGallery(event.currentTarget));

    $('#newVideoButton')?.addEventListener('click', () => openVideoForm(null));
    $('#saveVideos')?.addEventListener('click', (event) => saveVideos(event.currentTarget));

    $('#refreshEmails')?.addEventListener('click', loadEmails);
    $('#refreshRefunds')?.addEventListener('click', loadRefunds);

    $('#settingsForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      saveSettings($('#saveSettings'));
    });
    $('#passwordForm')?.addEventListener('submit', savePassword);
  }

  function init() {
    bind();
    boot();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
