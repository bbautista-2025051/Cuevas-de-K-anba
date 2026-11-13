/* ==========================================================================
   K’anba · Cuevas Vivas — lógica del sitio público
   ========================================================================== */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const ICONS = {
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M16 5.4a3 3 0 0 1 0 5.6M17.5 14.3c1.7.6 2.8 2.2 3.1 4.7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="10" r="2.4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5-10-6.5Z" fill="currentColor"/></svg>',
    zoom: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 4 4M11 8v6M8 11h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c1.2 4.3-3.5 5.6-3.5 9.4A3.5 3.5 0 0 0 12 16a3.5 3.5 0 0 0 3.5-3.6c0-1.4-.6-2.6-1.4-3.8-.5 1.2-1.1 1.9-2 2.3.7-2.8.3-5.9-.1-7.9Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 16v5M7 21h10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    water: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s6 6.4 6 10.6A6 6 0 0 1 6 13.6C6 9.4 12 3 12 3Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9.5 14.2c.3 1.3 1.3 2.1 2.6 2.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4C11 4 5 8.2 5 14.5 5 17.5 7.2 20 10.4 20c6 0 9.6-6.2 9.6-16Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M4 21c1.5-5.4 4.8-9 9.5-11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3Z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m8.5 12 2.4 2.4 4.6-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 9.5h17M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    ticket: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8.5V6h18v2.5a3.5 3.5 0 0 0 0 7V18H3v-2.5a3.5 3.5 0 0 0 0-7Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 6v12" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 3"/></svg>'
  };

  const icon = (name) => ICONS[name] || '';

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                         */
  /* ------------------------------------------------------------------ */

  function el(tag, options = {}, children = []) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined && options.text !== null) node.textContent = options.text;
    if (options.html) node.innerHTML = options.html;
    if (options.attrs) {
      for (const [key, value] of Object.entries(options.attrs)) {
        if (value === undefined || value === null || value === false) continue;
        node.setAttribute(key, value === true ? '' : String(value));
      }
    }
    if (options.dataset) {
      for (const [key, value] of Object.entries(options.dataset)) node.dataset[key] = value;
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  async function api(url, options = {}) {
    const opts = { ...options };
    opts.headers = { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
    const res = await fetch(url, opts);
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

  const money = (value) => `Q${Number(value || 0).toFixed(2)}`;

  function dateObj(date) {
    return new Date(`${date}T12:00:00`);
  }

  function formatLong(date) {
    if (!date) return '—';
    return new Intl.DateTimeFormat('es-GT', { weekday: 'long', day: 'numeric', month: 'long' }).format(dateObj(date));
  }

  function formatFull(date) {
    if (!date) return '—';
    return new Intl.DateTimeFormat('es-GT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(dateObj(date));
  }

  function formatShort(date) {
    return new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: 'short' }).format(dateObj(date));
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node && value !== undefined && value !== null) node.textContent = value;
  }

  function setAttr(id, name, value) {
    const node = document.getElementById(id);
    if (node && value !== undefined && value !== null) node.setAttribute(name, value);
  }

  const CATEGORY_LABELS = { cueva: 'Cueva', rio: 'Río Cahabón', selva: 'Selva', semuc: 'Semuc Champey' };

  let toastTimer = null;
  function toast(message) {
    const node = $('#toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 3600);
  }

  function busy(button, on) {
    if (!button) return;
    button.classList.toggle('is-loading', Boolean(on));
    button.disabled = Boolean(on);
  }

  /* ------------------------------------------------------------------ */
  /* Estado del sitio                                                    */
  /* ------------------------------------------------------------------ */

  const state = {
    site: null,
    tours: [],
    tourId: null,
    availability: [],
    date: null,
    time: null,
    pax: 2,
    step: 1,
    gallery: [],
    galleryFilter: 'all',
    galleryIndex: 0,
    videos: [],
    map: null,
    mapReady: false
  };

  const DEFAULT_WHATSAPP = '50240002026';

  /* ------------------------------------------------------------------ */
  /* Header, navegación y detalles                                         */
  /* ------------------------------------------------------------------ */

  function setupHeader() {
    const header = $('#siteHeader');
    const nav = $('#mainNav');
    const toggle = $('#navToggle');
    if (header) {
      const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    if (!nav || !toggle) return;
    const close = () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
    };
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('no-scroll', open);
    });
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('open')) close();
    });
  }

  function setupReveal() {
    const targets = $$('.section-head, .value-card, .tour-card, .info-card, .video-card, .safety-item, .cta-inner, .location-info');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((node) => node.classList.add('in'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach((node) => {
      node.classList.add('reveal');
      observer.observe(node);
    });
  }

  function animateCount(node, target) {
    const raw = String(target);
    const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
    const end = Number(target);
    if (!Number.isFinite(end)) { node.textContent = raw; return; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.textContent = end.toFixed(decimals);
      return;
    }
    const start = performance.now();
    const duration = 1100;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = (end * eased).toFixed(decimals);
      if (progress < 1) requestAnimationFrame(tick);
      else node.textContent = end.toFixed(decimals);
    };
    requestAnimationFrame(tick);
  }

  function setupStatCounters() {
    const stats = $$('#stats .stat-value');
    if (!stats.length) return;
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target, entry.target.dataset.count);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    stats.forEach((node) => observer.observe(node));
  }

  /* ------------------------------------------------------------------ */
  /* Contenido                                                          */
  /* ------------------------------------------------------------------ */

  function applyContent(site) {
    state.site = site;
    state.tours = Array.isArray(site.tours) ? site.tours : [];
    state.gallery = Array.isArray(site.gallery) ? site.gallery : [];
    state.videos = Array.isArray(site.videos) ? site.videos : [];

    const { brand, hero, intro, values, timeline, toursIntro, bookingIntro, galleryIntro, videosIntro, mapIntro, infoIntro, policiesIntro, contact } = site;


    if (hero) {
      setText('heroKicker', hero.kicker);
      setText('heroTitle', hero.title);
      setText('heroSubtitle', hero.subtitle);
      setText('heroText', hero.text);
      setText('heroRating', hero.rating);
      setText('heroReviews', hero.reviews);
      setText('heroOpen', hero.openText);
      const img = $('#heroImage');
      if (img && hero.image) { img.src = hero.image; img.alt = hero.imageAlt || img.alt; }
    }

    if (intro) {
      setText('introKicker', intro.kicker);
      setText('introTitle', intro.title);
      setText('introLead', intro.lead);
      const paragraphs = $('#introParagraphs');
      if (paragraphs) {
        paragraphs.replaceChildren();
        (intro.paragraphs || []).forEach((text) => paragraphs.append(el('p', { text })));
      }
      const img1 = $('#introImage');
      const img2 = $('#introImage2');
      if (img1 && intro.image) img1.src = intro.image;
      if (img2 && intro.image2) img2.src = intro.image2;
      const stats = $('#stats');
      if (stats && Array.isArray(intro.stats)) {
        const STAT_ICONS = [
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20v-7a9 9 0 0 1 18 0v7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 20v-4.5a4 4 0 0 1 8 0V20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
          '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="19" r="2.2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="19" cy="5" r="2.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7.3 17.2 16.7 6.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="1.6 3"/></svg>',
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s5.6 6 5.6 10.2a5.6 5.6 0 0 1-11.2 0C6.4 9 12 3 12 3Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
          '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.1" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3.6 19c.6-3.1 2.7-4.9 5.4-4.9s4.8 1.8 5.4 4.9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M15.5 5.4a3 3 0 0 1 0 5.7M17 14.4c1.7.6 2.8 2.2 3 4.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
        ];
        stats.replaceChildren();
        intro.stats.forEach((stat, index) => {
          const unit = String(stat.suffix || '').trim();
          stats.append(el('div', { className: 'stat' }, [
            el('span', { className: 'stat-icon', html: STAT_ICONS[index] || STAT_ICONS[0] }),
            el('div', { className: 'stat-main' }, [
              el('span', { className: 'stat-value', text: stat.value, dataset: { count: stat.value } }),
              el('span', { className: 'stat-unit', text: unit }),
              el('span', { className: 'stat-label', text: stat.label })
            ])
          ]));
        });
        setupStatCounters();
      }
    }

    if (Array.isArray(timeline)) {
      const wrap = $('#timeline');
      if (wrap) {
        wrap.replaceChildren();
        timeline.forEach((item) => {
          wrap.append(el('div', { className: 'timeline-item' }, [
            el('span', { className: 'timeline-year', text: item.year }),
            el('h4', { text: item.title }),
            el('p', { text: item.text })
          ]));
        });
      }
    }

    if (Array.isArray(values)) {
      const wrap = $('#valuesGrid');
      if (wrap) {
        wrap.replaceChildren();
        values.forEach((value, index) => {
          wrap.append(el('article', { className: 'value-card' }, [
            el('span', { className: 'value-num', text: String(index + 1).padStart(2, '0') }),
            el('div', { className: 'value-icon', html: icon(value.icon === 'water' ? 'water' : value.icon === 'leaf' ? 'leaf' : 'flame') }),
            el('h3', { text: value.title }),
            el('p', { text: value.text })
          ]));
        });
      }
    }

    if (toursIntro) {
      setText('toursKicker', toursIntro.kicker);
      setText('toursTitle', toursIntro.title);
      setText('toursText', toursIntro.text);
    }
    if (bookingIntro) {
      setText('bookingKicker', bookingIntro.kicker);
      setText('bookingTitle', bookingIntro.title);
      setText('bookingText', bookingIntro.text);
    }
    if (galleryIntro) {
      setText('galleryKicker', galleryIntro.kicker);
      setText('galleryTitle', galleryIntro.title);
      setText('galleryText', galleryIntro.text);
    }
    if (videosIntro) {
      setText('videosKicker', videosIntro.kicker);
      setText('videosTitle', videosIntro.title);
      setText('videosText', videosIntro.text);
    }
    if (mapIntro) {
      setText('mapKicker', mapIntro.kicker);
      setText('mapTitle', mapIntro.title);
      setText('mapText', mapIntro.text);
      setText('mapAddress', mapIntro.address);
      setText('mapPlus', mapIntro.plusCode);
      setText('mapCoords', `${mapIntro.lat}, ${mapIntro.lng}`);
      setText('mapNote', mapIntro.note);
      const note = $('#mapNote');
      if (note && mapIntro.note) {
        note.replaceChildren();
        note.append(el('strong', { text: 'Importante: ' }), document.createTextNode(mapIntro.note));
      }
      const directions = $('#directionList');
      if (directions) {
        directions.replaceChildren();
        (mapIntro.directions || []).forEach((item) => {
          directions.append(el('div', {}, [el('dt', { text: item.label }), el('dd', { text: item.value })]));
        });
      }
      const google = $('#googleMapsBtn');
      const waze = $('#wazeBtn');
      if (google) google.href = `https://www.google.com/maps/dir/?api=1&destination=${mapIntro.lat},${mapIntro.lng}`;
      if (waze) waze.href = `https://waze.com/ul?ll=${mapIntro.lat},${mapIntro.lng}&navigate=yes`;
      setupMap(mapIntro);
    }
    if (infoIntro) {
      setText('infoTitle', infoIntro.title);
      setText('infoText', infoIntro.text);
    }
    if (policiesIntro) {
      setText('policiesKicker', policiesIntro.kicker);
      setText('policiesTitle', policiesIntro.title);
      setText('policiesText', policiesIntro.text);
    }
    if (contact) {
      setText('footerPhone', contact.phone);
      setText('footerEmail', contact.email);
      setText('footerAddress', contact.address);
      setText('footerHours', contact.hours);
      const phone = $('#footerPhone');
      const email = $('#footerEmail');
      if (phone) phone.href = `tel:${String(contact.phone || '').replace(/[^\d+]/g, '')}`;
      if (email) email.href = `mailto:${contact.email}`;
      const wa = String(contact.whatsapp || DEFAULT_WHATSAPP).replace(/\D/g, '');
      $$('a[href*="wa.me"]').forEach((link) => { link.href = `https://wa.me/${wa}`; });
    }
    setText('footerNote', site.footerNote);

    const holdMinutes = Number(site.settings?.booking?.holdMinutes || 20);
    setText('holdMinutesText', holdMinutes);
    $$('#bookingSummary .summary-hold strong, #bookingForm .form-legal strong').forEach((node) => { node.textContent = holdMinutes; });

    renderList('requirementsList', site.requirements);
    renderList('recommendationsList', site.recommendations);
    renderList('restrictionsList', site.restrictions);

    renderTours();
    renderTourOptions();
    renderGalleryFilters();
    renderGallery('all');
    renderVideos();
    renderAccordions('policiesAccordion', site.policies, true);
    renderAccordions('faqAccordion', site.faq, false);
    renderSummary();
    setupReveal();
  }

  function renderList(id, items) {
    const wrap = document.getElementById(id);
    if (!wrap || !Array.isArray(items)) return;
    wrap.replaceChildren();
    items.forEach((text) => wrap.append(el('li', { text })));
  }

  /* ------------------------------------------------------------------ */
  /* Tours                                                              */
  /* ------------------------------------------------------------------ */

  function renderTours() {
    const grid = $('#toursGrid');
    if (!grid) return;
    grid.replaceChildren();
    if (!state.tours.length) {
      grid.append(el('p', { className: 'loading-line', text: 'Pronto publicaremos nuestras experiencias.' }));
      return;
    }
    state.tours.forEach((tour) => {
      const featured = Boolean(tour.featured);
      const card = el('article', { className: `tour-card${featured ? ' is-featured' : ''}` });
      const media = el('div', { className: 'tour-media' }, [
        el('img', { attrs: { src: tour.image, alt: tour.name, loading: 'lazy' } }),
        el('span', { className: `tour-badge${tour.badge && /vendido|clásico|completo/i.test(tour.badge) ? ' hot' : ''}`, text: tour.badge || 'Experiencia' }),
        el('div', { className: 'tour-media-meta' }, [
          el('span', {}, [el('span', { html: icon('clock') }), document.createTextNode(tour.duration)]),
          el('span', {}, [el('span', { html: icon('users') }), document.createTextNode(`máx. ${tour.maxParticipants}`)])
        ]),
        el('span', { className: 'tour-price-chip' }, [
          document.createTextNode(money(tour.price)),
          el('small', { text: 'por persona' })
        ])
      ]);
      const body = el('div', { className: 'tour-body' }, [
        el('p', { className: 'tour-topline' }, [
          document.createTextNode(tour.difficulty || 'Aventura'),
          el('span', { className: 'dot' }),
          document.createTextNode(`desde ${tour.minAge} años`)
        ]),
        el('h3', { text: tour.name }),
        el('p', { className: 'tour-desc', text: tour.description }),
        el('div', { className: 'tour-includes' }, (tour.includes || []).slice(0, 3).map((item) => el('span', { text: item }))),
        el('div', { className: 'tour-schedule' }, [
          el('span', { className: 'label', text: 'Horarios de salida' }),
          ...(tour.times || []).map((time) => el('span', { className: 'time-pill', text: time }))
        ]),
        el('div', { className: 'tour-foot' }, [
          el('span', { className: 'tour-seats' }, [el('i'), document.createTextNode(`Hasta ${tour.capacity} por grupo`)]),
          el('button', {
            className: 'btn btn-dark',
            attrs: { type: 'button' },
            text: 'Reservar',
            dataset: { tour: tour.id }
          })
        ])
      ]);
      card.append(media, body);
      const button = $('button[data-tour]', body);
      if (button) {
        button.addEventListener('click', () => {
          selectTour(tour.id, { scroll: true });
        });
      }
      grid.append(card);
    });
  }

  function renderTourOptions() {
    const wrap = $('#tourOptions');
    if (!wrap) return;
    wrap.replaceChildren();
    state.tours.forEach((tour) => {
      const button = el('button', {
        className: `tour-option${state.tourId === tour.id ? ' selected' : ''}`,
        attrs: { type: 'button', 'aria-pressed': String(state.tourId === tour.id) },
        dataset: { tour: tour.id }
      }, [
        el('span', { className: 'tour-option-radio' }),
        el('img', { attrs: { src: tour.image, alt: '' } }),
        el('span', { className: 'tour-option-info' }, [
          el('strong', { text: tour.name }),
          el('span', { text: `${tour.duration} · ${tour.difficulty}` })
        ]),
        el('span', { className: 'tour-option-price' }, [
          document.createTextNode(money(tour.price)),
          el('small', { text: 'por persona' })
        ])
      ]);
      button.addEventListener('click', () => selectTour(tour.id));
      wrap.append(button);
    });
  }

  async function selectTour(tourId, { scroll = false } = {}) {
    const tour = state.tours.find((item) => item.id === tourId);
    if (!tour) return;
    state.tourId = tourId;
    state.date = null;
    state.time = null;
    state.pax = Math.min(Math.max(tour.minParticipants || 1, 2), tour.maxParticipants || 12);
    renderTourOptions();
    updatePaxControls();
    renderSummary();

    if (scroll) {
      window.location.href = `/reservar.html?tour=${encodeURIComponent(tourId)}`;
      return;
    }

    try {
      const data = await api(`/api/availability?tour=${encodeURIComponent(tourId)}&days=30`);
      state.availability = data.daysList || [];
      renderDates();
      const first = state.availability.find(dayHasSeats);
      if (first) selectDate(first.date);
      else {
        renderTimes();
        showAvailabilityNote('No hay cupos disponibles para este tour en los próximos 30 días. Escríbenos y buscamos una alternativa.');
      }
    } catch (error) {
      state.availability = [];
      renderDates();
      renderTimes();
      showAvailabilityNote(error.message);
    }
  }

  function dayHasSeats(day) {
    const entry = (day.tours || []).find((item) => item.tourId === state.tourId);
    return Boolean(entry && entry.departures.some((departure) => departure.left > 0 && !['past', 'closed', 'soldout'].includes(departure.status)));
  }

  function tourEntryFor(date) {
    const day = state.availability.find((item) => item.date === date);
    if (!day) return null;
    return (day.tours || []).find((item) => item.tourId === state.tourId) || null;
  }

  function renderDates() {
    const strip = $('#dateStrip');
    if (!strip) return;
    strip.replaceChildren();
    const today = state.site?.today;
    state.availability.forEach((day) => {
      const entry = (day.tours || []).find((item) => item.tourId === state.tourId);
      const available = dayHasSeats(day);
      const date = dateObj(day.date);
      const dow = new Intl.DateTimeFormat('es-GT', { weekday: 'short' }).format(date).replace('.', '');
      const month = new Intl.DateTimeFormat('es-GT', { month: 'short' }).format(date).replace('.', '');
      const button = el('button', {
        className: `date-btn${state.date === day.date ? ' selected' : ''}${day.date === today ? ' today' : ''}`,
        attrs: { type: 'button', disabled: !available, 'aria-pressed': String(state.date === day.date) },
        dataset: { date: day.date }
      }, [
        el('span', { className: 'dow', text: dow }),
        el('span', { className: 'day', text: String(date.getDate()) }),
        el('span', { className: 'month', text: month })
      ]);
      button.addEventListener('click', () => selectDate(day.date));
      strip.append(button);
    });
    const selected = $('.date-btn.selected', strip);
    if (selected) selected.scrollIntoView({ block: 'nearest', inline: 'center' });
    updateDateArrows();
  }

  function updateDateArrows() {
    const strip = $('#dateStrip');
    if (!strip) return;
    const prev = $('#datePrev');
    const next = $('#dateNext');
    if (prev) prev.disabled = strip.scrollLeft <= 2;
    if (next) next.disabled = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 2;
  }

  function selectDate(date) {
    const day = state.availability.find((item) => item.date === date);
    if (!day || !dayHasSeats(day)) {
      showAvailabilityNote('Ese día no tiene cupos disponibles. Elige otra fecha.');
      return;
    }
    state.date = date;
    state.time = null;
    renderDates();
    renderTimes();
    renderSummary();
    updateToStep3();
    const entry = tourEntryFor(date);
    if (entry && entry.closed) showAvailabilityNote('La cueva está cerrada ese día por mantenimiento o clima. Elige otra fecha.');
    else hideAvailabilityNote();
    setText('selectedDateLabel', `· ${formatLong(date)}`);
    if (day && entry && !entry.departures.some((item) => item.left > 0)) {
      showAvailabilityNote('No quedan cupos en esta fecha. Prueba otro día.');
    }
  }

  function renderTimes() {
    const wrap = $('#timeSlots');
    if (!wrap) return;
    wrap.replaceChildren();
    if (!state.date) {
      wrap.append(el('p', { className: 'loading-line', text: 'Elige una fecha para ver los horarios.' }));
      return;
    }
    const entry = tourEntryFor(state.date);
    if (!entry) {
      wrap.append(el('p', { className: 'loading-line', text: 'No hay horarios para esta fecha.' }));
      return;
    }
    entry.departures.forEach((departure) => {
      const disabled = departure.left <= 0 || ['past', 'closed', 'soldout'].includes(departure.status);
      let label = `${departure.left} cupos`;
      if (departure.status === 'past') label = 'Ya pasó';
      else if (departure.status === 'closed') label = 'Cerrado';
      else if (departure.status === 'soldout' || departure.left <= 0) label = 'Agotado';
      else if (departure.status === 'last') label = `Últimos ${departure.left}`;
      const button = el('button', {
        className: `time-slot${state.time === departure.time ? ' selected' : ''}`,
        attrs: { type: 'button', disabled, 'aria-pressed': String(state.time === departure.time) },
        dataset: { time: departure.time }
      }, [
        el('strong', { text: departure.time }),
        el('small', { text: label })
      ]);
      if (!disabled) {
        button.addEventListener('click', () => selectTime(departure.time));
      }
      wrap.append(button);
    });
  }

  function selectTime(time) {
    state.time = time;
    const entry = tourEntryFor(state.date);
    const departure = entry?.departures.find((item) => item.time === time);
    const tour = currentTour();
    if (departure && tour) {
      const max = Math.max(1, Math.min(tour.maxParticipants || 12, departure.left));
      if (state.pax > max) state.pax = max;
    }
    renderTimes();
    updatePaxControls();
    renderSummary();
    updateToStep3();
    if (departure && tour && departure.left < tour.minParticipants) {
      showAvailabilityNote(`Este horario tiene ${departure.left} cupo(s) y el tour requiere un mínimo de ${tour.minParticipants}.`);
    } else {
      hideAvailabilityNote();
    }
  }

  function currentTour() {
    return state.tours.find((item) => item.id === state.tourId) || null;
  }

  function showAvailabilityNote(message) {
    const note = $('#availabilityNote');
    if (!note) return;
    note.textContent = message;
    note.hidden = false;
  }

  function hideAvailabilityNote() {
    const note = $('#availabilityNote');
    if (note) note.hidden = true;
  }

  function selectedDepartureLeft() {
    const entry = state.date ? tourEntryFor(state.date) : null;
    const departure = entry?.departures.find((item) => item.time === state.time);
    return departure ? Number(departure.left) : null;
  }

  function updatePaxControls() {
    const tour = currentTour();
    const output = $('#paxValue');
    const minus = $('#minusPax');
    const plus = $('#plusPax');
    const help = $('#participantHelp');
    if (!tour || !output) return;
    const left = selectedDepartureLeft();
    const max = Math.max(1, Math.min(tour.maxParticipants || 12, left === null ? tour.maxParticipants || 12 : left));
    const min = Math.max(1, Math.min(tour.minParticipants || 1, max));
    state.pax = Math.min(Math.max(state.pax, min), max);
    output.textContent = String(state.pax);
    if (minus) minus.disabled = state.pax <= min;
    if (plus) plus.disabled = state.pax >= max;
    if (help) {
      help.textContent = left !== null
        ? `Este horario tiene ${left} cupos libres. Este tour admite de ${tour.minParticipants} a ${tour.maxParticipants} personas.`
        : `Máximo ${tour.maxParticipants} por grupo · mínimo ${tour.minParticipants}.`;
    }
  }

  function updateToStep3() {
    const button = $('#toStep3');
    if (!button) return;
    const tour = currentTour();
    const left = selectedDepartureLeft();
    const valid = Boolean(tour && state.date && state.time && left !== null && left >= state.pax && state.pax >= (tour.minParticipants || 1));
    button.disabled = !valid;
    if (tour && left !== null && left < state.pax) {
      showAvailabilityNote(`Solo quedan ${left} cupos en ese horario. Reduce los participantes o elige otro horario.`);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Resumen de reserva                                                 */
  /* ------------------------------------------------------------------ */

  function renderSummary() {
    const tour = currentTour();
    const empty = $('#summaryEmpty');
    const content = $('#summaryContent');
    const status = $('#summaryStatus');
    if (!tour) {
      if (empty) empty.hidden = false;
      if (content) content.hidden = true;
      if (status) { status.textContent = 'Sin iniciar'; status.classList.remove('live'); }
      return;
    }
    if (empty) empty.hidden = true;
    if (content) content.hidden = false;
    if (status) {
      status.textContent = state.time ? 'Cupos disponibles' : state.date ? 'Fecha elegida' : 'En proceso';
      status.classList.toggle('live', Boolean(state.time));
    }
    const image = $('#summaryImage');
    if (image) { image.src = tour.image; image.alt = tour.name; }
    setText('summaryTourName', tour.name);
    setText('summaryTourMeta', `${tour.duration} · ${tour.difficulty}`);
    setText('summaryDate', state.date ? formatShort(state.date) : 'Por elegir');
    setText('summaryTime', state.time || 'Por elegir');
    setText('summaryPax', String(state.pax));
    setText('summaryUnit', `${money(tour.price)} × ${state.pax}`);
    setText('summaryTotal', money(tour.price * state.pax));
    updatePaxControls();
  }

  /* ------------------------------------------------------------------ */
  /* Asistente de reserva                                               */
  /* ------------------------------------------------------------------ */

  function goStep(step) {
    state.step = step;
    $$('.wizard-panel').forEach((panel) => { panel.hidden = Number(panel.dataset.panel) !== step; });
    $$('[data-step-indicator]').forEach((indicator) => {
      const value = Number(indicator.dataset.stepIndicator);
      indicator.classList.toggle('active', value === step);
      indicator.classList.toggle('done', value < step);
    });
    if (step === 2) {
      setText('selectedDateLabel', state.date ? `· ${formatLong(state.date)}` : '');
      renderDates();
      renderTimes();
      updateToStep3();
    }
    if (step === 3) {
      updatePaxControls();
      renderSummary();
    }
  }

  function setupWizard() {
    $$('[data-next]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = Number(button.dataset.next);
        if (target === 2 && !state.tourId) {
          toast('Elige una experiencia para continuar.');
          return;
        }
        if (target === 3) {
          if (!state.date || !state.time) { toast('Elige fecha y horario.'); return; }
          const left = selectedDepartureLeft();
          if (left !== null && left < state.pax) { toast('No hay suficientes cupos en ese horario.'); return; }
        }
        goStep(target);
      });
    });
    $$('[data-prev]').forEach((button) => {
      button.addEventListener('click', () => goStep(Number(button.dataset.prev)));
    });

    const minus = $('#minusPax');
    const plus = $('#plusPax');
    if (minus) minus.addEventListener('click', () => {
      const tour = currentTour();
      if (!tour) return;
      const left = selectedDepartureLeft();
      const min = Math.max(1, Math.min(tour.minParticipants || 1, left === null ? tour.maxParticipants : left));
      state.pax = Math.max(min, state.pax - 1);
      renderSummary();
      updateToStep3();
    });
    if (plus) plus.addEventListener('click', () => {
      const tour = currentTour();
      if (!tour) return;
      const left = selectedDepartureLeft();
      const max = Math.max(1, Math.min(tour.maxParticipants || 12, left === null ? tour.maxParticipants || 12 : left));
      state.pax = Math.min(max, state.pax + 1);
      renderSummary();
      updateToStep3();
    });

    const strip = $('#dateStrip');
    const prev = $('#datePrev');
    const next = $('#dateNext');
    if (prev && strip) prev.addEventListener('click', () => strip.scrollBy({ left: -260, behavior: 'smooth' }));
    if (next && strip) next.addEventListener('click', () => strip.scrollBy({ left: 260, behavior: 'smooth' }));
    if (strip) {
      strip.addEventListener('scroll', updateDateArrows, { passive: true });
      window.addEventListener('resize', updateDateArrows);
    }

    $('#bookingForm')?.addEventListener('submit', submitBooking);
    $$('#bookingForm input, #bookingForm textarea').forEach((input) => {
      input.addEventListener('input', () => clearFieldError(input.name));
    });
  }

  function clearFieldError(name) {
    if (!name) return;
    const field = $(`[data-error="${name}"]`);
    if (field) field.textContent = '';
    const input = $(`#bookingForm [name="${name}"]`);
    if (input) input.classList.remove('invalid');
  }

  function setFieldError(name, message) {
    const field = $(`[data-error="${name}"]`);
    if (field) field.textContent = message;
    const input = $(`#bookingForm [name="${name}"]`);
    if (input) input.classList.add('invalid');
  }

  function validateBookingForm(form) {
    const fields = [
      ['name', 'Escribe tu nombre completo.'],
      ['email', 'Escribe un correo válido.'],
      ['phone', 'Escribe un teléfono de contacto.'],
      ['country', 'Indica tu país.']
    ];
    let valid = true;
    let firstInvalid = null;
    fields.forEach(([name, message]) => {
      clearFieldError(name);
      const input = form.elements[name];
      const value = String(input?.value || '').trim();
      if (!value) {
        setFieldError(name, message);
        valid = false;
        if (!firstInvalid) firstInvalid = input;
      } else if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        setFieldError(name, 'Correo electrónico inválido.');
        valid = false;
        if (!firstInvalid) firstInvalid = input;
      } else if (name === 'phone' && value.replace(/\D/g, '').length < 7) {
        setFieldError(name, 'El teléfono debe tener al menos 7 dígitos.');
        valid = false;
        if (!firstInvalid) firstInvalid = input;
      }
    });

    const error = $('#bookingError');
    if (!form.elements.acceptPolicies.checked) {
      valid = false;
      if (error) { error.textContent = 'Debes aceptar las políticas de reserva y cancelación.'; error.hidden = false; }
    } else if (!form.elements.acceptTerms.checked) {
      valid = false;
      if (error) { error.textContent = 'Debes aceptar los requisitos y la carta de responsabilidad.'; error.hidden = false; }
    }

    if (valid && firstInvalid) {
      valid = false;
    }
    if (firstInvalid) {
      firstInvalid.focus({ preventScroll: false });
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (!valid && error && error.hidden) {
      error.textContent = 'Revisa los datos marcados antes de continuar.';
      error.hidden = false;
    }
    return valid;
  }

  async function submitBooking(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const errorBox = $('#bookingError');
    if (errorBox) errorBox.hidden = true;
    if (!validateBookingForm(form)) return;

    const tour = currentTour();
    if (!tour || !state.date || !state.time) {
      toast('Vuelve a elegir experiencia, fecha y horario.');
      goStep(1);
      return;
    }

    const button = $('#submitBooking');
    busy(button, true);
    try {
      const customer = {
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(),
        country: form.elements.country.value.trim(),
        document: form.elements.document.value.trim(),
        notes: form.elements.notes.value.trim(),
        acceptPolicies: form.elements.acceptPolicies.checked,
        acceptTerms: form.elements.acceptTerms.checked
      };
      const data = await api('/api/reservations', {
        method: 'POST',
        body: JSON.stringify({
          tourId: tour.id,
          date: state.date,
          time: state.time,
          participants: state.pax,
          customer
        })
      });
      sessionStorage.setItem(`kanba:${data.code}`, JSON.stringify({ code: data.code, token: data.token }));
      window.location.href = data.paymentUrl;
    } catch (error) {
      if (errorBox) {
        errorBox.textContent = error.message;
        errorBox.hidden = false;
        errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (error.fields) {
        Object.entries(error.fields).forEach(([name, message]) => setFieldError(name, message));
      }
      busy(button, false);
      if (error.status === 409) toast(error.message);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Galería                                                            */
  /* ------------------------------------------------------------------ */

  function renderGalleryFilters() {
    const wrap = $('#galleryFilters');
    if (!wrap) return;
    $$('button', wrap).forEach((button) => {
      button.addEventListener('click', () => {
        const filter = button.dataset.filter || 'all';
        state.galleryFilter = filter;
        $$('button', wrap).forEach((item) => {
          const active = item === button;
          item.classList.toggle('active', active);
          item.setAttribute('aria-selected', String(active));
        });
        renderGallery(filter);
      });
    });
  }

  function galleryItems(filter) {
    return state.gallery.filter((item) => filter === 'all' || item.category === filter);
  }

  function renderGallery(filter) {
    const grid = $('#galleryGrid');
    if (!grid) return;
    const items = galleryItems(filter);
    grid.replaceChildren();
    items.forEach((item, index) => {
      const button = el('button', {
        className: 'gallery-item',
        attrs: { type: 'button', 'aria-label': `Ampliar: ${item.caption}` },
        dataset: { index: String(index) }
      }, [
        el('img', { attrs: { src: item.src, alt: item.caption, loading: 'lazy', decoding: 'async' } }),
        el('span', { className: 'zoom', html: icon('zoom') }),
        el('figcaption', {}, [
          el('strong', { text: item.caption }),
          el('span', { text: CATEGORY_LABELS[item.category] || item.category })
        ])
      ]);
      button.addEventListener('click', () => openLightbox(items, index));
      grid.append(button);
    });
    setText('photoCount', `${items.length} ${items.length === 1 ? 'fotografía' : 'fotografías'}`);
  }

  let lightboxItems = [];
  let lightboxIndex = 0;

  function openLightbox(items, index) {
    lightboxItems = items;
    lightboxIndex = index;
    renderLightbox();
    const box = $('#lightbox');
    if (!box) return;
    box.hidden = false;
    document.body.classList.add('no-scroll');
    $('#lightboxClose')?.focus();
  }

  function renderLightbox() {
    const item = lightboxItems[lightboxIndex];
    if (!item) return;
    const image = $('#lightboxImage');
    if (image) { image.src = item.src; image.alt = item.caption; }
    setText('lightboxCaption', item.caption);
    setText('lightboxCredit', item.credit);
    setText('lightboxCounter', `${lightboxIndex + 1} / ${lightboxItems.length}`);
  }

  function moveLightbox(delta) {
    if (!lightboxItems.length) return;
    lightboxIndex = (lightboxIndex + delta + lightboxItems.length) % lightboxItems.length;
    renderLightbox();
  }

  function closeLightbox() {
    const box = $('#lightbox');
    if (box) box.hidden = true;
    document.body.classList.remove('no-scroll');
  }

  function setupLightbox() {
    $('#lightboxClose')?.addEventListener('click', closeLightbox);
    $('#lightboxPrev')?.addEventListener('click', () => moveLightbox(-1));
    $('#lightboxNext')?.addEventListener('click', () => moveLightbox(1));
    $('#lightbox')?.addEventListener('click', (event) => {
      if (event.target.id === 'lightbox') closeLightbox();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Videos                                                             */
  /* ------------------------------------------------------------------ */

  function renderVideos() {
    const grid = $('#videosGrid');
    if (!grid) return;
    grid.replaceChildren();
    state.videos.forEach((video) => {
      const button = el('button', {
        className: 'video-card',
        attrs: { type: 'button', 'aria-label': `Reproducir: ${video.title}` }
      }, [
        el('span', { className: 'video-thumb' }, [
          el('img', { attrs: { src: `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`, alt: video.title, loading: 'lazy', decoding: 'async' } }),
          el('span', { className: 'video-cat', text: video.category }),
          el('span', { className: 'video-play', html: icon('play') })
        ]),
        el('span', { className: 'video-body' }, [
          el('h3', { text: video.title }),
          el('p', { text: video.description })
        ])
      ]);
      button.addEventListener('click', () => openVideo(video));
      grid.append(button);
    });
  }

  function openVideo(video) {
    const modal = $('#videoModal');
    const embed = $('#videoEmbed');
    if (!modal || !embed) return;
    embed.replaceChildren();
    const iframe = el('iframe', {
      attrs: {
        src: `https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`,
        title: video.title,
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        allowfullscreen: true
      }
    });
    embed.append(iframe);
    setText('videoTitle', video.title);
    setText('videoDesc', video.description);
    modal.hidden = false;
    document.body.classList.add('no-scroll');
    $('#videoClose')?.focus();
  }

  function closeVideo() {
    const modal = $('#videoModal');
    if (modal) modal.hidden = true;
    const embed = $('#videoEmbed');
    if (embed) embed.replaceChildren();
    document.body.classList.remove('no-scroll');
  }

  function setupVideoModal() {
    $('#videoClose')?.addEventListener('click', closeVideo);
    $('#videoModal')?.addEventListener('click', (event) => {
      if (event.target.id === 'videoModal') closeVideo();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Acordeones                                                         */
  /* ------------------------------------------------------------------ */

  function renderAccordions(id, items, dark) {
    const wrap = document.getElementById(id);
    if (!wrap || !Array.isArray(items)) return;
    wrap.replaceChildren();
    if (dark) wrap.classList.add('accordion-dark');
    items.forEach((item, index) => {
      const title = item.title || item.q || '';
      const meta = item.summary || '';
      const bullets = Array.isArray(item.items) ? item.items : null;
      const body = el('div', { className: 'accordion-body' });
      if (item.a) body.append(el('p', { text: item.a }));
      if (bullets) body.append(el('ul', {}, bullets.map((entry) => el('li', { text: entry }))));
      const panel = el('div', { className: 'accordion-panel' }, [body]);
      const trigger = el('button', {
        className: 'accordion-trigger',
        attrs: { type: 'button', 'aria-expanded': 'false' }
      }, [
        el('span', {}, [
          el('h3', { text: title }),
          meta ? el('span', { className: 'trigger-meta', text: meta }) : null
        ]),
        el('span', { className: 'accordion-icon' })
      ]);
      const wrapper = el('div', { className: 'accordion-item' }, [trigger, panel]);
      trigger.addEventListener('click', () => toggleAccordion(wrapper));
      wrap.append(wrapper);
      if (index === 0) toggleAccordion(wrapper, true);
    });
  }

  function toggleAccordion(item, forceOpen = false) {
    const trigger = $('.accordion-trigger', item);
    const panel = $('.accordion-panel', item);
    if (!trigger || !panel) return;
    const open = forceOpen || !item.classList.contains('open');
    if (open) {
      $$('.accordion-item.open', item.parentElement).forEach((other) => {
        if (other === item) return;
        other.classList.remove('open');
        $('.accordion-trigger', other)?.setAttribute('aria-expanded', 'false');
        const otherPanel = $('.accordion-panel', other);
        if (otherPanel) otherPanel.style.maxHeight = '0px';
      });
    }
    item.classList.toggle('open', open);
    trigger.setAttribute('aria-expanded', String(open));
    panel.style.maxHeight = open ? `${panel.scrollHeight}px` : '0px';
  }

  /* ------------------------------------------------------------------ */
  /* Mapa                                                               */
  /* ------------------------------------------------------------------ */

  function setupMap(mapIntro) {
    const node = $('#map');
    const fallback = $('#mapFallback');
    if (!node) return;
    const showFallback = () => {
      if (fallback) fallback.hidden = false;
      if (node) node.style.display = 'none';
    };
    if (!window.L) {
      showFallback();
      return;
    }
    try {
      if (state.map) {
        state.map.remove();
        state.map = null;
      }
      const lat = Number(mapIntro.lat);
      const lng = Number(mapIntro.lng);
      const map = window.L.map(node, { scrollWheelZoom: false, zoomControl: true }).setView([lat, lng], 13);
      state.map = map;
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
      }).addTo(map);

      const kanbaIcon = window.L.divIcon({ className: '', html: '<span class="kanba-pin" aria-hidden="true"></span>', iconSize: [18, 18], iconAnchor: [9, 9] });
      const semucIcon = window.L.divIcon({ className: '', html: '<span class="semuc-pin" aria-hidden="true"></span>', iconSize: [11, 11], iconAnchor: [5, 5] });
      const lanquinIcon = window.L.divIcon({ className: '', html: '<span class="lanquin-pin" aria-hidden="true"></span>', iconSize: [11, 11], iconAnchor: [5, 5] });

      const popup = (title, subtitle) => {
        const wrap = el('div');
        wrap.append(el('strong', { text: title }), el('span', { text: subtitle }));
        return wrap;
      };

      window.L.marker([lat, lng], { icon: kanbaIcon, title: 'K’anba' })
        .addTo(map)
        .bindPopup(popup('K’anba · Cuevas Vivas', mapIntro.address || 'Lanquín, Alta Verapaz'))
        .openPopup();
      window.L.marker([15.5333, -89.9667], { icon: semucIcon })
        .addTo(map)
        .bindPopup(popup('Semuc Champey', 'Pozas y mirador · 10 min'));
      window.L.marker([15.575, -89.99], { icon: lanquinIcon })
        .addTo(map)
        .bindPopup(popup('Lanquín', 'Salida de pickups y tuk-tuks'));

      if (fallback) fallback.hidden = true;
      if (node) node.style.display = '';
      state.mapReady = true;
      setTimeout(() => map.invalidateSize(), 500);
    } catch (error) {
      showFallback();
    }
  }

  function setupMapButtons() {
    const copy = $('#copyCoords');
    if (!copy) return;
    copy.addEventListener('click', async () => {
      const lat = state.site?.mapIntro?.lat ?? 15.537628;
      const lng = state.site?.mapIntro?.lng ?? -89.955361;
      const text = `${lat}, ${lng}`;
      try {
        await navigator.clipboard.writeText(text);
        toast('Coordenadas copiadas.');
      } catch {
        toast(`Coordenadas: ${text}`);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Barra de progreso de scroll                                          */
  /* ------------------------------------------------------------------ */

  function setupScrollProgress() {
    if (document.querySelector('.scroll-progress')) return;
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('i');
    bar.append(inner);
    document.body.append(bar);
    let ticking = false;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      inner.style.transform = `scaleX(${max > 0 ? Math.min(1, doc.scrollTop / max) : 0})`;
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ------------------------------------------------------------------ */
  /* Cafetería · flipbook del menú                                        */
  /* ------------------------------------------------------------------ */

  const FB_NAMES = ['Desayunos', 'Almuerzos', 'Cenas', 'Postres', 'Café', 'Frías & cosas de la casa', 'Alcohólicas'];

  function fbClamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function fbEndpaper() {
    const back = document.createElement('div');
    back.className = 'flip-back';
    back.innerHTML = '<div class="flip-back-inner"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 35V20a15 15 0 0 1 30 0v15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M20 31c-4.7-3.6-7-6.8-7-10.4a7 7 0 0 1 14 0c0 3.6-2.3 6.8-7 10.4Z" fill="currentColor"/></svg><strong>EL SENDERO</strong><span>café de la cueva · est. 2019</span></div>';
    return back;
  }

  function setupFlipbook() {
    const wrap = document.getElementById('flipbook');
    if (!wrap) return;
    const surface = document.getElementById('bookSurface');
    const pages = Array.from(surface.querySelectorAll('.flip-page'));
    if (!pages.length) return;
    const prevBtn = document.getElementById('bookPrev');
    const nextBtn = document.getElementById('bookNext');
    const dots = Array.from(wrap.querySelectorAll('.book-dot'));
    const nameEl = document.getElementById('bookName');
    const nowEl = document.getElementById('bookNow');

    /* Número de página grabado en cada hoja */
    pages.forEach((page, i) => {
      const num = document.createElement('span');
      num.className = 'page-number';
      num.textContent = `— ${i + 1} —`;
      page.append(num);
    });

    let index = 0;
    let animating = false;

    function render() {
      pages.forEach((page, i) => {
        page.hidden = i !== index;
        page.classList.toggle('is-current', i === index);
      });
      dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === index);
        dot.setAttribute('aria-selected', String(i === index));
      });
      if (nameEl) nameEl.textContent = FB_NAMES[index] || '';
      if (nowEl) nowEl.textContent = String(index + 1);
      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index === pages.length - 1;
    }

    function createLeaf() {
      const leaf = document.createElement('div');
      leaf.className = 'flip-leaf';
      leaf.setAttribute('aria-hidden', 'true');
      const front = pages[index].cloneNode(true);
      front.hidden = false;
      front.classList.add('flip-front');
      front.classList.remove('is-current');
      front.removeAttribute('data-page');
      front.removeAttribute('id');
      front.setAttribute('aria-hidden', 'true');
      leaf.append(front, fbEndpaper());
      surface.append(leaf);
      return leaf;
    }

    function flipTo(target) {
      target = fbClamp(target, 0, pages.length - 1);
      if (animating || target === index) return;
      animating = true;
      const direction = target > index ? 'next' : 'prev';
      const sign = direction === 'next' ? -1 : 1;
      const leaf = createLeaf();
      index = target;
      render();
      // Forzar flujo de estilos y aplicar el giro (con respaldo si rAF no corre)
      const apply = () => {
        leaf.classList.add('flipping');
        leaf.style.transform = `rotateY(${sign * 180}deg)`;
      };
      requestAnimationFrame(apply);
      window.setTimeout(apply, 60);
      window.setTimeout(() => { leaf.remove(); animating = false; }, 720);
    }

    if (prevBtn) prevBtn.addEventListener('click', () => flipTo(index - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => flipTo(index + 1));
    dots.forEach((dot) => dot.addEventListener('click', () => flipTo(Number(dot.dataset.goto))));

    surface.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); flipTo(index + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); flipTo(index - 1); }
    });

    /* Arrastre con mouse o dedo */
    const drag = { active: false, decided: false, direction: null, target: index, startX: 0, startY: 0, width: 1, leaf: null, progress: 0 };

    surface.addEventListener('pointerdown', (event) => {
      if (animating) return;
      if (event.target.closest('button, a, input, select, textarea')) return;
      drag.active = true;
      drag.decided = false;
      drag.direction = null;
      drag.leaf = null;
      drag.progress = 0;
      drag.startX = event.clientX;
      drag.startY = event.clientY;
      try { surface.setPointerCapture(event.pointerId); } catch { /* no crítico */ }
    });

    surface.addEventListener('pointermove', (event) => {
      if (!drag.active) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.decided) {
        if (Math.abs(dx) < 14 && Math.abs(dy) < 14) return;
        if (Math.abs(dy) >= Math.abs(dx)) { drag.active = false; return; }
        drag.direction = dx < 0 ? 'next' : 'prev';
        drag.target = drag.direction === 'next' ? index + 1 : index - 1;
        if (drag.target < 0 || drag.target >= pages.length) { drag.active = false; return; }
        drag.width = Math.max(160, surface.clientWidth);
        drag.leaf = createLeaf();
        drag.decided = true;
      }
      event.preventDefault();
      const sign = drag.direction === 'next' ? -1 : 1;
      drag.progress = fbClamp(Math.abs(dx) / drag.width, 0, 1);
      drag.leaf.style.transition = 'none';
      drag.leaf.style.transform = `rotateY(${sign * drag.progress * 180}deg)`;
    });

    const endDrag = () => {
      if (!drag.active) return;
      drag.active = false;
      if (!drag.decided) return;
      const { leaf, target, direction, progress } = drag;
      const sign = direction === 'next' ? -1 : 1;
      const complete = progress > 0.36;
      animating = true;
      leaf.style.transition = '';
      leaf.classList.add('flipping');
      leaf.style.transform = complete ? `rotateY(${sign * 180}deg)` : 'rotateY(0deg)';
      if (complete) { index = target; render(); }
      window.setTimeout(() => { leaf.remove(); animating = false; }, 620);
    };
    surface.addEventListener('pointerup', endDrag);
    surface.addEventListener('pointercancel', endDrag);

    render();
  }

  /* ------------------------------------------------------------------ */
  /* Teclado global                                                     */
  /* ------------------------------------------------------------------ */

  function setupKeyboard() {
    document.addEventListener('keydown', (event) => {
      const lightbox = $('#lightbox');
      const video = $('#videoModal');
      if (event.key === 'Escape') {
        if (lightbox && !lightbox.hidden) closeLightbox();
        if (video && !video.hidden) closeVideo();
      }
      if (lightbox && !lightbox.hidden) {
        if (event.key === 'ArrowLeft') { event.preventDefault(); moveLightbox(-1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); moveLightbox(1); }
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Arranque                                                           */
  /* ------------------------------------------------------------------ */

  async function init() {
    setupHeader();
    setupWizard();
    setupScrollProgress();
    setupFlipbook();
    setupLightbox();
    setupVideoModal();
    setupMapButtons();
    setupKeyboard();
    setText('year', String(new Date().getFullYear()));

    try {
      const site = await api('/api/site');
      applyContent(site);
      const presetTour = new URLSearchParams(window.location.search).get('tour');
      if (presetTour && state.tours.some((t) => t.id === presetTour) && $('#tourOptions')) {
        await selectTour(presetTour);
      }
    } catch (error) {
      const tours = $('#toursGrid');
      if (tours) tours.replaceChildren(el('p', { className: 'loading-line', text: 'No pudimos cargar el contenido. Verifica tu conexión y recarga la página.' }));
      const gallery = $('#galleryGrid');
      if (gallery) gallery.replaceChildren(el('p', { className: 'loading-line', text: 'La galería no está disponible en este momento.' }));
      toast('No pudimos cargar el contenido del sitio.');
      console.error(error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
