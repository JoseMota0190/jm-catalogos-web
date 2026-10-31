/* =============================================
   AGUAMARINA AI — experiencia integrada
   Una asesora, un perfil, un catálogo y dos probadores.
   ============================================= */

'use strict';

(function () {
  var E = window.AguamarinaEngine;
  if (!E) {
    var stageFallback = document.getElementById('ai-stage');
    if (stageFallback) {
      stageFallback.innerHTML = '<p class="ai-empty__text">No pudimos cargar el motor de recomendación.</p>';
    }
    return;
  }

  var SESSION_KEY = 'aguamarina_ai_session_v1';
  var WA_FALLBACK = '584243286929';
  var MAX_PHOTO = 20 * 1024 * 1024;
  var MIN_PHOTO_EDGE = 320;
  var TONE_MAX_EDGE = 900;
  var VTO_MAX_EDGE = 1024;
  var TONE_POLL_MS = 2000;
  var TONE_MAX_POLLS = 15;
  var VTO_POLL_MS = 2000;
  var VTO_MAX_POLLS = 45;
  var VTO_MAX_INPUT = 9 * 1024 * 1024;

  var OCCASIONS = [
    { value: 'diario', label: 'Uso diario' },
    { value: 'especial', label: 'Ocasión especial' },
    { value: 'trabajo', label: 'Trabajo' },
    { value: 'playa', label: 'Playa / vacaciones' },
    { value: 'regalo', label: 'Un regalo' }
  ];

  var STYLES = [
    { value: 'elegante', label: 'Elegante' },
    { value: 'casual', label: 'Casual' },
    { value: 'llamativo', label: 'Llamativo' },
    { value: 'minimalista', label: 'Minimalista' },
    { value: 'bohemio', label: 'Bohemio' },
    { value: 'romantico', label: 'Romántico' }
  ];

  var PIECES = [
    { value: 'collares', label: 'Collares' },
    { value: 'pulseras', label: 'Pulseras' },
    { value: 'ambos', label: 'Ambos' }
  ];

  var METALS = [
    { value: 'dorado', label: 'Dorado' },
    { value: 'plateado', label: 'Plateado' },
    { value: 'combinado', label: 'Combinado' },
    { value: 'no-importa', label: 'No sé / mostrame opciones' }
  ];

  var BUDGETS = [
    { value: '10', label: 'Hasta 10' },
    { value: '20', label: '10 a 20' },
    { value: '40', label: '20 a 40' },
    { value: 'sin-limite', label: 'Sin límite' }
  ];

  var state = defaultState();
  var els = {};
  var booting = true;
  var busy = null;
  var toneToken = 0;
  var vtoToken = 0;
  var selfieFile = null;
  var selfiePreviewUrl = '';
  var selfieConsent = false;
  var toneStatus = '';
  var toneStatusError = false;
  var vtoFile = null;
  var vtoPreviewUrl = '';
  var vtoConsent = false;
  var vtoStatus = '';
  var vtoStatusError = false;
  var toastTimer = null;

  /* ── Estado ──────────────────────────────── */

  function defaultState() {
    return {
      step: 1,
      profile: {
        occasion: '',
        style: '',
        pieces: 'ambos',
        metal: 'no-importa',
        budget: 'sin-limite'
      },
      tone: null,
      toneNote: '',
      recommendations: [],
      recCount: 0,
      recSignature: '',
      recError: '',
      altIndex: 0,
      savedLooks: [],
      messages: [],
      flags: {},
      vto: {
        productId: '',
        resultUrl: '',
        at: ''
      }
    };
  }

  function loadState() {
    var base = defaultState();
    var saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    } catch (err) {
      saved = null;
    }

    if (saved && typeof saved === 'object') {
      state = Object.assign(base, saved);
      state.profile = Object.assign(base.profile, saved.profile || {});
      state.vto = Object.assign(base.vto, saved.vto || {});
      state.flags = saved.flags && typeof saved.flags === 'object' ? saved.flags : {};
      state.messages = Array.isArray(saved.messages) ? saved.messages.slice(-18) : [];
      state.savedLooks = Array.isArray(saved.savedLooks) ? saved.savedLooks.slice(0, 6) : [];
      state.recommendations = Array.isArray(saved.recommendations) ? saved.recommendations : [];
    }

    if (state.tone && E.PALETTES[state.tone.undertone]) {
      state.tone.palette = E.PALETTES[state.tone.undertone];
    } else {
      state.tone = null;
      state.toneNote = '';
    }

    if (!Array.isArray(state.savedLooks)) state.savedLooks = [];
    if (!Array.isArray(state.recommendations)) state.recommendations = [];
    if (!state.vto || typeof state.vto !== 'object') state.vto = base.vto;
    state.vto.productId = state.vto.productId ? String(state.vto.productId) : '';

    state.step = Math.max(1, Math.min(4, Number(state.step) || 1));
    if (state.step >= 2 && !profileReady()) state.step = 1;
    if (state.step >= 3 && !state.tone) state.step = 2;
    if (state.step === 4 && !state.recommendations.length && !state.savedLooks.length) state.step = 3;

    selfieConsent = false;
    vtoConsent = false;
    busy = null;
  }

  function persist() {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
    } catch (err) {
      // sessionStorage puede fallar en modo privado; la experiencia sigue en memoria.
    }
  }

  function ensureWelcome() {
    if (state.messages.length) return;
    state.messages.push({
      role: 'adviser',
      text: '¡Hola! Soy tu asesora de Aguamarina. Vamos a descubrir juntas qué piezas te hacen sentir bien. Empecemos por lo que buscás.',
      at: Date.now()
    });
    persist();
  }

  function profileReady() {
    var p = state.profile || {};
    return Boolean(p.occasion && p.style);
  }

  function invalidateRecommendations() {
    state.recommendations = [];
    state.recCount = 0;
    state.recSignature = '';
    state.recError = '';
    state.altIndex = 0;
    state.flags.reco = false;
    state.vto = { productId: '', resultUrl: '', at: '' };
  }

  /* ── Init ────────────────────────────────── */

  async function initAsesora() {
    cacheEls();
    loadState();
    ensureWelcome();
    bindGlobal();
    renderAll();

    try {
      var loading = [];
      if (typeof loadConfig === 'function') loading.push(loadConfig());
      if (typeof loadProducts === 'function') loading.push(loadProducts());
      await Promise.all(loading);
    } catch (err) {
      console.error('Aguamarina AI: no se pudo cargar el catálogo.', err);
    }

    if (typeof updateCartUI === 'function') updateCartUI();

    booting = false;
    if (state.step >= 3) ensureRecommendations(true);
    renderAll();
  }

  function cacheEls() {
    els = {
      navbar: document.getElementById('navbar'),
      wizard: document.querySelector('.ai-wizard'),
      stage: document.getElementById('ai-stage'),
      stepper: document.getElementById('ai-stepper'),
      messages: document.getElementById('ai-messages'),
      profile: document.getElementById('ai-profile'),
      reset: document.getElementById('ai-reset'),
      lookBtn: document.getElementById('ai-look-btn'),
      lookCount: document.getElementById('ai-look-count'),
      toast: document.getElementById('ai-toast')
    };
  }

  function bindGlobal() {
    if (els.reset) {
      els.reset.addEventListener('click', function () {
        if (!window.confirm('¿Reiniciar la experiencia? Se borra el perfil y los looks de esta pestaña.')) return;
        resetExperience();
      });
    }

    if (els.lookBtn) {
      els.lookBtn.addEventListener('click', function () {
        if (!state.savedLooks.length && !state.recommendations.length) {
          showToast('Todavía no guardaste ningún look.');
          return;
        }
        if (!state.recommendations.length && state.savedLooks.length) {
          state.step = 4;
          persist();
          renderAll();
          return;
        }
        goStep(4);
        setTimeout(function () {
          var saved = document.querySelector('.ai-saved');
          if (saved) saved.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 320);
      });
    }

    window.addEventListener('scroll', function () {
      if (!els.navbar) return;
      els.navbar.classList.toggle('navbar--scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  function resetExperience() {
    state = defaultState();
    toneToken += 1;
    vtoToken += 1;
    selfieFile = null;
    revokePreview(selfiePreviewUrl);
    selfiePreviewUrl = '';
    selfieConsent = false;
    vtoFile = null;
    revokePreview(vtoPreviewUrl);
    vtoPreviewUrl = '';
    vtoConsent = false;
    toneStatus = '';
    toneStatusError = false;
    vtoStatus = '';
    vtoStatusError = false;
    busy = null;
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (err) {}
    ensureWelcome();
    persist();
    renderAll();
    showToast('Empezamos de nuevo ✨');
  }

  /* ── Render general ──────────────────────── */

  function renderAll() {
    renderStepper();
    renderStage();
    renderMessages();
    renderProfile();
    renderLookCount();
  }

  function renderStepper() {
    if (!els.stepper) return;

    var steps = [
      { n: 1, label: 'Estilo' },
      { n: 2, label: 'Tonos' },
      { n: 3, label: 'Piezas' },
      { n: 4, label: 'Prueba virtual' }
    ];

    els.stepper.innerHTML = steps.map(function (step) {
      var active = state.step === step.n;
      var done = step.n < state.step;
      var enabled = canGo(step.n);
      return '<button type="button" class="ai-step' + (active ? ' is-active' : '') + (done ? ' is-done' : '') +
        '" data-step="' + step.n + '"' + (active ? ' aria-current="step"' : '') +
        (enabled ? '' : ' disabled') + '>' +
        '<span class="ai-step__num">' + (done ? '✓' : '0' + step.n) + '</span>' +
        '<span class="ai-step__label">' + step.label + '</span>' +
      '</button>';
    }).join('');

    els.stepper.querySelectorAll('[data-step]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        goStep(Number(btn.dataset.step));
      });
    });
  }

  function canGo(step) {
    if (step === 1) return true;
    if (step === 2) return profileReady();
    if (step === 3) return profileReady() && Boolean(state.tone);
    if (step === 4) return Boolean(state.tone && (state.recommendations.length || state.savedLooks.length));
    return false;
  }

  function goStep(step) {
    if (step === 2 && !profileReady()) {
      showToast('Primero elegí una ocasión y un estilo.');
      return;
    }
    if (step === 3) {
      if (!profileReady()) {
        showToast('Primero completá tu perfil de estilo.');
        return;
      }
      if (!state.tone) {
        showToast('Primero descubrí tu paleta o elegila a mano.');
        return;
      }
      if (!booting) ensureRecommendations(true);
    }
    if (step === 4 && !state.recommendations.length && !state.savedLooks.length) {
      showToast('Primero necesitamos tus recomendaciones.');
      return;
    }

    state.step = step;
    persist();

    if (step === 4) {
      var recs = getRecItems();
      var current = state.vto.productId ? productById(state.vto.productId) : null;
      if (!current || !recs.some(function (item) { return String(item.product.id) === String(current.id); })) {
        state.vto.productId = recs[0] ? String(recs[0].product.id) : '';
        state.vto.resultUrl = '';
        state.vto.at = '';
        persist();
      }
    }

    renderAll();

    window.requestAnimationFrame(function () {
      if (els.wizard) {
        var navH = els.navbar ? els.navbar.offsetHeight : 0;
        var top = els.wizard.getBoundingClientRect().top + window.scrollY - navH - 10;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
      var title = document.getElementById('ai-stage-title');
      if (title) title.focus({ preventScroll: true });
    });
  }

  function renderStage() {
    if (!els.stage) return;

    if (booting && state.step >= 3) {
      els.stage.innerHTML =
        '<div class="ai-empty">' +
          '<span class="ai-spinner" aria-hidden="true"></span>' +
          '<p class="ai-empty__title">Cargando el catálogo…</p>' +
          '<p class="ai-empty__text">Estamos cruzando tu perfil con las piezas de Aguamarina.</p>' +
        '</div>';
      return;
    }

    if (state.step === 1) renderStageOne();
    else if (state.step === 2) renderStageTwo();
    else if (state.step === 3) renderStageThree();
    else renderStageFour();
  }

  /* ── Etapa 01 · Estilo ───────────────────── */

  function renderStageOne() {
    var p = state.profile;
    els.stage.innerHTML =
      '<section aria-labelledby="ai-stage-title">' +
        '<header class="ai-stage__head">' +
          '<p class="ai-stage__eyebrow">Etapa 01 · Conocé tu estilo</p>' +
          '<h2 class="ai-stage__title" id="ai-stage-title" tabindex="-1">Empecemos por <em>vos</em></h2>' +
          '<p class="ai-stage__lead">No necesitás saber de moda. Contame qué buscás y la asesora arma el perfil de esta sesión.</p>' +
        '</header>' +

        '<div class="ai-field">' +
          '<p class="ai-legend">¿Para qué momento? <span>Elegí una</span></p>' +
          '<div class="ai-chips" role="group" aria-label="Ocasión">' +
            OCCASIONS.map(function (item) { return chip('occasion', item.value, item.label); }).join('') +
          '</div>' +
        '</div>' +

        '<div class="ai-field">' +
          '<p class="ai-legend">¿Qué estilo te representa? <span>Elegí uno</span></p>' +
          '<div class="ai-chips" role="group" aria-label="Estilo">' +
            STYLES.map(function (item) { return chip('style', item.value, item.label); }).join('') +
          '</div>' +
        '</div>' +

        '<div class="ai-field">' +
          '<p class="ai-legend">¿Qué piezas querés ver? <span>Podés cambiar después</span></p>' +
          '<div class="ai-chips" role="group" aria-label="Piezas">' +
            PIECES.map(function (item) { return chip('pieces', item.value, item.label); }).join('') +
          '</div>' +
        '</div>' +

        '<div class="ai-field">' +
          '<p class="ai-legend">¿Preferís algún metal? <span>Opcional</span></p>' +
          '<div class="ai-chips" role="group" aria-label="Metal preferido">' +
            METALS.map(function (item) { return chip('metal', item.value, item.label); }).join('') +
          '</div>' +
        '</div>' +

        '<div class="ai-field">' +
          '<p class="ai-legend">¿Cuánto querés invertir? <span>Opcional</span></p>' +
          '<div class="ai-chips" role="group" aria-label="Presupuesto">' +
            BUDGETS.map(function (item) { return chip('budget', item.value, item.label); }).join('') +
          '</div>' +
        '</div>' +

        '<p class="ai-note">' +
          '<strong>La asesora recuerda tus elecciones.</strong> Si después cambiás de collar a pulsera, ' +
          'el perfil, la paleta y las recomendaciones siguen acá.' +
        '</p>' +

        '<div class="ai-actions">' +
          '<button type="button" class="ai-btn ai-btn--primary" id="ai-next-1"' + (profileReady() ? '' : ' disabled') + '>Continuar →</button>' +
          '<span class="ai-hint">Paso 1 de 4 · ' + (profileReady() ? 'Perfil listo' : 'Elegí ocasión y estilo') + '</span>' +
        '</div>' +
      '</section>';

    bindStageOne();
  }

  function chip(field, value, label) {
    var selected = state.profile[field] === value;
    return '<button type="button" class="ai-chip' + (selected ? ' is-selected' : '') +
      '" data-field="' + field + '" data-value="' + value + '" aria-pressed="' + selected + '">' +
      label + '</button>';
  }

  function bindStageOne() {
    els.stage.querySelectorAll('.ai-chip[data-field]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var field = btn.dataset.field;
        var value = btn.dataset.value;
        if (!field || state.profile[field] === value) return;

        state.profile[field] = value;
        invalidateRecommendations();

        els.stage.querySelectorAll('.ai-chip[data-field="' + field + '"]').forEach(function (other) {
          var on = other.dataset.value === value;
          other.classList.toggle('is-selected', on);
          other.setAttribute('aria-pressed', on ? 'true' : 'false');
        });

        var next = document.getElementById('ai-next-1');
        if (next) next.disabled = !profileReady();
        var hint = els.stage.querySelector('.ai-actions .ai-hint');
        if (hint) hint.textContent = 'Paso 1 de 4 · ' + (profileReady() ? 'Perfil listo' : 'Elegí ocasión y estilo');

        persist();
        renderProfile();
      });
    });

    var next = document.getElementById('ai-next-1');
    if (next) {
      next.addEventListener('click', function () {
        if (!profileReady()) {
          showToast('Elegí una ocasión y un estilo para continuar.');
          return;
        }
        noteProfileChange();
        goStep(2);
      });
    }
  }

  function noteProfileChange() {
    var signature = JSON.stringify(state.profile);
    if (state.flags.profileNote === signature) return;

    addMessage(profileUserText(), 'you');
    addMessage(profileAdviserText(), 'adviser');
    state.flags.profileNote = signature;
    persist();
  }

  function profileUserText() {
    var p = state.profile;
    var text = 'Busco algo ' + E.LABELS.style[p.style] + ' para ' + E.LABELS.occasion[p.occasion] + '.';
    text += ' Me interesan ' + E.LABELS.pieces[p.pieces];
    if (p.metal && p.metal !== 'no-importa') text += ' en tono ' + E.LABELS.metal[p.metal];
    if (p.budget && p.budget !== 'sin-limite') text += ', con un presupuesto de ' + E.LABELS.budget[p.budget];
    return text + '.';
  }

  function profileAdviserText() {
    var p = state.profile;
    var text = 'Perfecto: ' + E.LABELS.style[p.style] + ' para ' + E.LABELS.occasion[p.occasion] + '.';
    text += ' Anoté que preferís ' + E.LABELS.pieces[p.pieces];
    if (p.metal && p.metal !== 'no-importa') text += ' y que el ' + E.LABELS.metal[p.metal] + ' te interesa';
    text += '. Ahora veamos qué tonos pueden favorecerte.';
    return text;
  }

  /* ── Etapa 02 · Tonos ────────────────────── */

  function renderStageTwo() {
    var tone = state.tone;
    var head =
      '<header class="ai-stage__head">' +
        '<p class="ai-stage__eyebrow">Etapa 02 · Descubrí tus tonos</p>' +
        '<h2 class="ai-stage__title" id="ai-stage-title" tabindex="-1">Tu paleta, <em>a tu manera</em></h2>' +
        '<p class="ai-stage__lead">Una selfie con buena luz nos ayuda a leer el subtono. Es una orientación estética, no una clasificación definitiva de la persona.</p>' +
      '</header>';

    if (tone) {
      els.stage.innerHTML =
        '<section aria-labelledby="ai-stage-title">' + head +
          toneResultHTML(tone) +
          manualToneHTML() +
          '<div class="ai-actions">' +
            '<button type="button" class="ai-btn ai-btn--primary" id="ai-next-2">Ver mis piezas →</button>' +
            '<button type="button" class="ai-btn ai-btn--ghost" id="ai-retake">Analizar otra selfie</button>' +
          '</div>' +
        '</section>';
    } else {
      els.stage.innerHTML =
        '<section aria-labelledby="ai-stage-title">' + head +
          '<p class="ai-note ai-note--warm">' +
            '<strong>Para que la lectura sea más útil:</strong> selfie de frente, rostro grande, sin lentes oscuros y con luz pareja. ' +
            'Evitá contraluz o filtros fuertes.' +
          '</p>' +

          '<div class="ai-consent">' +
            '<input type="checkbox" id="ai-consent-selfie"' + (selfieConsent ? ' checked' : '') + '>' +
            '<label for="ai-consent-selfie"><strong>Autorizo el uso de esta selfie</strong> para estimar mi paleta en esta sesión. ' +
            'Se procesa localmente y, si el análisis avanzado está disponible, se envía a YouCam (Perfect Corp) solo para este análisis. ' +
            'No se guarda en el catálogo ni se usa para otro fin.</label>' +
          '</div>' +

          '<label class="ai-drop" id="ai-selfie-drop" for="ai-selfie-input">' +
            '<span class="ai-drop__icon" aria-hidden="true">' +
              '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>' +
                '<circle cx="12" cy="13" r="4"/>' +
              '</svg>' +
            '</span>' +
            '<span class="ai-drop__title">Subí tu selfie</span>' +
            '<span class="ai-drop__hint" id="ai-selfie-drop-text">' +
              (selfieFile ? escapeHtml(selfieFile.name) : 'JPG o PNG · se reduce automáticamente antes de analizarla') +
            '</span>' +
            '<input type="file" id="ai-selfie-input" accept="image/jpeg,image/png">' +
          '</label>' +

          '<div id="ai-selfie-preview">' + selfiePreviewHTML() + '</div>' +
          '<p class="ai-status' + (toneStatusError ? ' is-error' : '') + '" id="ai-tone-status" role="status" aria-live="polite">' +
            (busy === 'tone' ? '<span class="ai-spinner" aria-hidden="true"></span>' : '') + escapeHtml(toneStatus) +
          '</p>' +

          '<div class="ai-actions">' +
            '<button type="button" class="ai-btn ai-btn--primary" id="ai-tone-run"' +
              (!selfieFile || !selfieConsent || busy === 'tone' ? ' disabled' : '') + '>Analizar mi selfie</button>' +
            '<span class="ai-hint">También podés elegir tu paleta a mano, más abajo.</span>' +
          '</div>' +

          manualToneHTML() +
        '</section>';
    }

    bindStageTwo();
  }

  function selfiePreviewHTML() {
    if (!selfiePreviewUrl) return '';
    return '<div class="ai-preview">' +
      '<span class="ai-preview__tag">Tu selfie</span>' +
      '<img src="' + escapeHtml(selfiePreviewUrl) + '" alt="Vista previa de tu selfie">' +
    '</div>';
  }

  function toneResultHTML(tone) {
    var palette = tone.palette || E.PALETTES[tone.undertone] || E.PALETTES.neutro;
    var swatches = [];

    if (Array.isArray(tone.colors) && tone.colors.length) {
      swatches = tone.colors.map(function (item) {
        return { label: item.label, hex: item.hex };
      }).filter(function (item) { return item.hex; });
    }
    if (!swatches.length) {
      swatches = palette.swatches.map(function (hex, index) {
        return { label: palette.colors[index] || '', hex: hex };
      });
    }

    var source = tone.source || 'local';
    var sourceLabel = source === 'youcam' ? 'YouCam API' : source === 'manual' ? 'Elección manual' : 'Lectura local';
    var badgeClass = source === 'youcam' ? ' ai-badge--youcam' : source === 'manual' ? '' : ' ai-badge--local';
    var title = source === 'manual'
      ? 'Paleta ' + palette.short + ' · elegida a mano'
      : 'Paleta ' + palette.short + (tone.depth ? ' · piel ' + tone.depth : '');

    var note = state.toneNote || defaultToneNote(tone);

    return '<div class="ai-tone ai-tone--' + palette.key + '">' +
      '<div class="ai-tone__top">' +
        '<div>' +
          '<p class="ai-tone__eyebrow">Tu paleta orientativa</p>' +
          '<h3 class="ai-tone__title">' + escapeHtml(title) + '</h3>' +
        '</div>' +
        '<span class="ai-badge' + badgeClass + '">' + escapeHtml(sourceLabel) + '</span>' +
      '</div>' +
      '<p class="ai-tone__text">' + escapeHtml(palette.text) + '</p>' +
      '<div class="ai-palette">' +
        swatches.map(function (item) {
          return '<span class="ai-swatch" title="' + escapeHtml(item.label) + '">' +
            '<span class="ai-swatch__dot" style="background:' + escapeHtml(item.hex) + '"></span>' +
            '<span class="ai-swatch__label">' + escapeHtml(item.label) + '</span>' +
          '</span>';
        }).join('') +
      '</div>' +
      '<div class="ai-metal-list">' +
        palette.metals.map(function (metal) {
          return '<span class="ai-metal">' + escapeHtml(metal) + '</span>';
        }).join('') +
      '</div>' +
      '<div class="ai-tone__foot">' +
        '<span>' + escapeHtml(note) + '</span>' +
      '</div>' +
    '</div>';
  }

  function defaultToneNote(tone) {
    if (tone.source === 'youcam') {
      return 'Colores leídos por YouCam API. La recomendación cruza esa lectura con los tonos del catálogo.';
    }
    if (tone.source === 'manual') {
      return 'Elegiste esta paleta vos. La asesora la usa como punto de partida, no como una etiqueta.';
    }
    return 'Lectura local orientativa. La luz y el encuadre pueden influir: si no te representa, ajustá la paleta a mano.';
  }

  function manualToneHTML() {
    var options = ['calido', 'neutro', 'frio'];
    var current = state.tone ? state.tone.undertone : '';

    return '<div class="ai-manual">' +
      '<p class="ai-manual__title">' + (state.tone ? 'Ajustá la paleta' : 'O elegí tu paleta a mano') + '</p>' +
      '<p class="ai-manual__hint">' +
        (state.tone
          ? 'Si la luz de la foto te cambió el tono, elegí la lectura que mejor te represente.'
          : 'No hace falta subir una foto para continuar. Elegí la paleta con la que te sientas más vos.') +
      '</p>' +
      '<div class="ai-tone-options" role="group" aria-label="Elegir paleta a mano">' +
        options.map(function (key) {
          var palette = E.PALETTES[key];
          var selected = current === key;
          return '<button type="button" class="ai-tone-option' + (selected ? ' is-selected' : '') +
            '" data-tone="' + key + '" aria-pressed="' + selected + '">' +
            '<span class="ai-tone-option__swatches" aria-hidden="true">' +
              palette.swatches.slice(0, 3).map(function (hex) {
                return '<span class="ai-tone-option__dot" style="background:' + hex + '"></span>';
              }).join('') +
            '</span>' +
            '<span class="ai-tone-option__name">' + palette.label + '</span>' +
            '<span class="ai-tone-option__desc">' + palette.metals.slice(0, 2).join(' · ') + '</span>' +
          '</button>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  function bindStageTwo() {
    var input = document.getElementById('ai-selfie-input');
    var drop = document.getElementById('ai-selfie-drop');
    var consent = document.getElementById('ai-consent-selfie');
    var run = document.getElementById('ai-tone-run');

    if (consent) {
      consent.addEventListener('change', function () {
        selfieConsent = consent.checked;
        if (run) run.disabled = !selfieFile || !selfieConsent || busy === 'tone';
      });
    }

    if (input) {
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        selectSelfie(file);
      });
    }

    if (drop) {
      ['dragenter', 'dragover'].forEach(function (eventName) {
        drop.addEventListener(eventName, function (event) {
          event.preventDefault();
          drop.classList.add('is-dragover');
        });
      });
      ['dragleave', 'drop'].forEach(function (eventName) {
        drop.addEventListener(eventName, function (event) {
          event.preventDefault();
          drop.classList.remove('is-dragover');
        });
      });
      drop.addEventListener('drop', function (event) {
        var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
        if (file) selectSelfie(file);
      });
    }

    if (run) {
      run.addEventListener('click', function () {
        if (!selfieFile) {
          showToast('Elegí una selfie primero.');
          return;
        }
        if (!selfieConsent) {
          showToast('Marcá el consentimiento para analizar la selfie.');
          return;
        }
        runToneAnalysis();
      });
    }

    var retake = document.getElementById('ai-retake');
    if (retake) {
      retake.addEventListener('click', function () {
        toneToken += 1;
        state.tone = null;
        state.toneNote = '';
        toneStatus = '';
        toneStatusError = false;
        selfieFile = null;
        revokePreview(selfiePreviewUrl);
        selfiePreviewUrl = '';
        selfieConsent = false;
        busy = null;
        invalidateRecommendations();
        persist();
        renderStage();
        renderProfile();
      });
    }

    var next = document.getElementById('ai-next-2');
    if (next) {
      next.addEventListener('click', function () {
        if (!state.tone) {
          showToast('Primero descubrí tu paleta o elegila a mano.');
          return;
        }
        if (state.flags.toneNote !== state.tone.undertone + '|' + state.tone.source) {
          addMessage('Listo: tomé tu paleta ' + state.tone.palette.short + ' como punto de partida. La podés ajustar cuando quieras.', 'adviser');
          state.flags.toneNote = state.tone.undertone + '|' + state.tone.source;
          persist();
        }
        goStep(3);
      });
    }

    els.stage.querySelectorAll('[data-tone]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        chooseManualTone(btn.dataset.tone);
      });
    });
  }

  function selectSelfie(file) {
    try {
      validatePhoto(file, MAX_PHOTO);
    } catch (err) {
      showToast(err.message);
      return;
    }

    toneToken += 1;
    selfieFile = file;
    revokePreview(selfiePreviewUrl);
    selfiePreviewUrl = URL.createObjectURL(file);
    toneStatus = '';
    toneStatusError = false;
    busy = null;
    renderStage();
  }

  async function runToneAnalysis() {
    var token = ++toneToken;
    busy = 'tone';
    toneStatus = 'Analizando tu selfie… primero una lectura local rápida.';
    toneStatusError = false;
    renderStage();

    try {
      var resized = await resizePhoto(selfieFile, TONE_MAX_EDGE);
      if (token !== toneToken) return;

      revokePreview(selfiePreviewUrl);
      selfiePreviewUrl = resized.dataUrl;

      var faceBox = await detectFaceBox(resized.canvas);
      var analysis = analyzeSelfieCanvas(resized.canvas, faceBox);
      if (token !== toneToken) return;

      state.tone = analysis.tone;
      state.toneNote = analysis.note;
      invalidateRecommendations();
      persist();

      addMessage(toneAdviserMessage(analysis.tone), 'adviser');
      busy = null;
      toneStatus = '';
      toneStatusError = false;
      renderStage();
      renderProfile();

      // Refinamiento opcional con YouCam: la lectura local ya está visible.
      refineToneWithYouCam(resized.blob, token);
    } catch (err) {
      if (token !== toneToken) return;
      busy = null;
      toneStatus = err && err.message ? err.message : 'No pudimos analizar la foto. Probá con otra selfie.';
      toneStatusError = true;
      renderStage();
    }
  }

  function chooseManualTone(key) {
    var palette = E.PALETTES[key];
    if (!palette) return;

    toneToken += 1;
    state.tone = {
      undertone: key,
      palette: palette,
      depth: '',
      skinHex: '',
      source: 'manual',
      confidence: 'manual',
      colors: []
    };
    state.toneNote = 'Elegiste esta paleta a mano. La asesora la usa como punto de partida, no como una etiqueta.';
    invalidateRecommendations();
    persist();

    addMessage('Perfecto: partimos de una paleta ' + palette.short + '. Si querés, después podés probar con una selfie.', 'adviser');
    toneStatus = '';
    toneStatusError = false;
    busy = null;
    renderStage();
    renderProfile();
  }

  function toneAdviserMessage(tone) {
    var palette = tone.palette || E.PALETTES.neutro;
    return 'Por lo que veo en tu foto, tu paleta se inclina a tonos ' + palette.plural +
      '. Es una orientación, no una etiqueta: si la luz te cambió el tono, podés ajustarla a mano. ' +
      'Con esto ya puedo pensar en piezas concretas.';
  }

  /* ── Etapa 03 · Piezas ───────────────────── */

  function renderStageThree() {
    var recs = getRecItems();

    if (state.recError) {
      els.stage.innerHTML =
        '<section aria-labelledby="ai-stage-title">' +
          '<header class="ai-stage__head">' +
            '<p class="ai-stage__eyebrow">Etapa 03 · Encontrá tus accesorios</p>' +
            '<h2 class="ai-stage__title" id="ai-stage-title" tabindex="-1">No pudimos ver el <em>catálogo</em></h2>' +
          '</header>' +
          '<div class="ai-empty">' +
            '<div class="ai-empty__icon" aria-hidden="true">💎</div>' +
            '<p class="ai-empty__title">El catálogo no respondió</p>' +
            '<p class="ai-empty__text">Revisá tu conexión y volvé a intentar. Tu perfil y tu paleta siguen guardados.</p>' +
            '<div class="ai-actions ai-actions--end">' +
              '<button type="button" class="ai-btn ai-btn--primary" id="ai-retry-products">Reintentar</button>' +
            '</div>' +
          '</div>' +
        '</section>';
      var retry = document.getElementById('ai-retry-products');
      if (retry) {
        retry.addEventListener('click', async function () {
          try {
            if (typeof loadProducts === 'function') await loadProducts();
            state.recError = '';
            ensureRecommendations(true);
            renderStage();
          } catch (err) {
            showToast('Seguimos sin poder cargar el catálogo.');
          }
        });
      }
      return;
    }

    if (!recs.length) {
      els.stage.innerHTML =
        '<section aria-labelledby="ai-stage-title">' +
          '<header class="ai-stage__head">' +
            '<p class="ai-stage__eyebrow">Etapa 03 · Encontrá tus accesorios</p>' +
            '<h2 class="ai-stage__title" id="ai-stage-title" tabindex="-1">Busquemos otra <em>combinación</em></h2>' +
          '</header>' +
          '<div class="ai-empty">' +
            '<div class="ai-empty__icon" aria-hidden="true">✨</div>' +
            '<p class="ai-empty__title">No encontramos piezas con ese filtro</p>' +
            '<p class="ai-empty__text">Probá ampliar el presupuesto o elegir “ambos” en el paso 1.</p>' +
            '<div class="ai-actions ai-actions--end">' +
              '<button type="button" class="ai-btn ai-btn--ghost" data-goto="1">Ajustar mi perfil</button>' +
            '</div>' +
          '</div>' +
        '</section>';
      els.stage.querySelectorAll('[data-goto]').forEach(function (btn) {
        btn.addEventListener('click', function () { goStep(Number(btn.dataset.goto)); });
      });
      return;
    }

    var p = state.profile;
    var tone = state.tone;
    var summary = 'tu estilo ' + E.LABELS.style[p.style] + ', ' + E.LABELS.occasion[p.occasion] +
      (tone ? ' y tu paleta ' + tone.palette.short : '');

    els.stage.innerHTML =
      '<section aria-labelledby="ai-stage-title">' +
        '<header class="ai-stage__head">' +
          '<p class="ai-stage__eyebrow">Etapa 03 · Encontrá tus accesorios</p>' +
          '<h2 class="ai-stage__title" id="ai-stage-title" tabindex="-1">Tres piezas, <em>una razón</em></h2>' +
          '<p class="ai-stage__lead">Crucé ' + escapeHtml(summary) + ' con ' + state.recCount +
            ' piezas del catálogo real. Estas son las que mejor combinan; podés probártelas ahora mismo.</p>' +
        '</header>' +

        '<div class="ai-recos">' +
          recs.map(function (item) { return recoCardHTML(item); }).join('') +
        '</div>' +
        '<p class="ai-hint" style="margin-top:12px">El metal exacto de cada pieza se confirma en la ficha o por WhatsApp.</p>' +

        '<div class="ai-actions">' +
          '<button type="button" class="ai-btn ai-btn--primary" id="ai-next-3">Probar ' + escapeHtml(recs[0].product.name) + ' →</button>' +
          '<button type="button" class="ai-btn ai-btn--ghost" id="ai-other-recos">Ver otras propuestas</button>' +
        '</div>' +
      '</section>';

    bindStageThree();
  }

  function recoCardHTML(item) {
    var product = item.product;
    var image = productImage(product, 400);
    var category = product.category === 'collares' ? 'Collar' : 'Pulsera';
    var why = item.why || E.whyFor(item);

    return '<article class="ai-reco">' +
      '<div class="ai-reco__media">' +
        '<img class="ai-reco__img" src="' + escapeHtml(image) + '" alt="' + escapeHtml(product.name) + '" loading="eager" ' +
          'onerror="this.src=\'https://placehold.co/400x400/D6F2EE/1A8A78?text=%E2%9C%A8\'">' +
        '<span class="ai-reco__cat">' + category + '</span>' +
      '</div>' +
      '<div class="ai-reco__body">' +
        '<h3 class="ai-reco__name">' + escapeHtml(product.name) + '</h3>' +
        '<p class="ai-reco__price">' + escapeHtml(priceLabel(product.price)) + '</p>' +
        '<p class="ai-reco__why">' + escapeHtml(why) + '</p>' +
        '<div class="ai-reco__actions">' +
          '<button type="button" class="ai-mini ai-mini--try" data-try="' + escapeHtml(product.id) + '">Probar</button>' +
          '<a class="ai-mini ai-mini--ghost" href="product.html?id=' + encodeURIComponent(product.id) + '">Ficha</a>' +
          '<button type="button" class="ai-mini ai-mini--save" data-save="' + escapeHtml(product.id) + '">Guardar</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function bindStageThree() {
    els.stage.querySelectorAll('[data-try]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectVtoProduct(btn.dataset.try);
        goStep(4);
      });
    });

    els.stage.querySelectorAll('[data-save]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var product = productById(btn.dataset.save);
        if (!product) return;
        saveLook(product, '');
        btn.textContent = 'Guardado ✓';
        btn.disabled = true;
      });
    });

    var next = document.getElementById('ai-next-3');
    if (next) {
      next.addEventListener('click', function () {
        var recs = getRecItems();
        if (!recs.length) return;
        selectVtoProduct(recs[0].product.id);
        goStep(4);
      });
    }

    var other = document.getElementById('ai-other-recos');
    if (other) {
      other.addEventListener('click', function () {
        state.altIndex += 3;
        generateRecommendations(false);
        persist();
        renderStage();
      });
    }
  }

  function signature() {
    return JSON.stringify({
      profile: state.profile,
      tone: state.tone ? state.tone.undertone + '|' + state.tone.source : '',
      alt: state.altIndex
    });
  }

  function ensureRecommendations(announce) {
    if (!profileReady() || !state.tone || booting) return;

    var sig = signature();
    var valid = state.recommendations.length && state.recommendations.every(function (rec) {
      return Boolean(productById(rec.productId));
    });

    if (!valid || state.recSignature !== sig) {
      generateRecommendations(announce);
    }
  }

  function generateRecommendations(announce) {
    var products = getProducts();
    if (!products.length) {
      state.recommendations = [];
      state.recError = 'No pudimos cargar el catálogo.';
      persist();
      return;
    }

    var ranked = E.rankProducts(products, state.profile, state.tone);
    var picked = E.pickRecommendations(ranked, state.profile, 3, state.altIndex);

    state.recommendations = picked.map(function (item) {
      return {
        productId: String(item.product.id),
        reasons: item.reasons,
        why: E.whyFor(item),
        score: item.score
      };
    });
    state.recCount = ranked.length;
    state.recSignature = signature();
    state.recError = '';
    persist();

    if (announce && !state.flags.reco) {
      addMessage(
        'Crucé tu perfil con ' + ranked.length + ' piezas del catálogo. Te propongo ' +
        picked.length + ' opciones concretas, con el porqué de cada una. ¿Querés probártelas?',
        'adviser'
      );
      state.flags.reco = true;
      persist();
    }
  }

  function getRecItems() {
    return state.recommendations.map(function (rec) {
      var product = productById(rec.productId);
      if (!product) return null;
      return {
        product: product,
        reasons: rec.reasons || [],
        why: rec.why || '',
        score: rec.score || 0
      };
    }).filter(Boolean);
  }

  /* ── Etapa 04 · Probador ─────────────────── */

  function renderStageFour() {
    var recs = getRecItems();
    var saved = savedLooksHTML();

    if (!recs.length) {
      els.stage.innerHTML =
        '<section aria-labelledby="ai-stage-title">' +
          '<header class="ai-stage__head">' +
            '<p class="ai-stage__eyebrow">Etapa 04 · Probátelos virtualmente</p>' +
            '<h2 class="ai-stage__title" id="ai-stage-title" tabindex="-1">Tu look <em>guardado</em></h2>' +
            '<p class="ai-stage__lead">Todavía no hay recomendaciones activas, pero podés consultar lo que ya guardaste.</p>' +
          '</header>' +
          saved +
          '<div class="ai-actions">' +
            '<button type="button" class="ai-btn ai-btn--primary" data-goto="3">Volver a mis recomendaciones</button>' +
            '<a class="ai-btn ai-btn--ghost" href="index.html">Ver catálogo</a>' +
          '</div>' +
        '</section>';
      bindStageFour();
      return;
    }

    var product = selectedVtoProduct();
    if (!product) product = recs[0].product;
    var category = product.category === 'collares' ? 'Collar' : 'Pulsera';
    var canTry = canTryOn(product);
    var hasResult = Boolean(state.vto.resultUrl && String(state.vto.productId) === String(product.id));

    els.stage.innerHTML =
      '<section aria-labelledby="ai-stage-title">' +
        '<header class="ai-stage__head">' +
          '<p class="ai-stage__eyebrow">Etapa 04 · Probátelos virtualmente</p>' +
          '<h2 class="ai-stage__title" id="ai-stage-title" tabindex="-1">Mirá cómo te <em>queda</em></h2>' +
          '<p class="ai-stage__lead">Elegí una de tus piezas y subí la foto que corresponda. YouCam genera la visualización; la foto se usa solo para esta prueba.</p>' +
        '</header>' +

        '<div class="ai-vto__picker" role="group" aria-label="Elegir pieza para probar">' +
          recs.map(function (item) {
            var p = item.product;
            var selected = String(p.id) === String(product.id);
            return '<button type="button" class="ai-vto-pick' + (selected ? ' is-selected' : '') +
              '" data-vto-pick="' + escapeHtml(p.id) + '">' +
              '<img src="' + escapeHtml(productImage(p, 120)) + '" alt="" loading="eager" ' +
                'onerror="this.src=\'https://placehold.co/120x120/D6F2EE/1A8A78?text=%E2%9C%A8\'">' +
              '<span>' + escapeHtml(p.name) + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +

        '<div class="ai-vto__product">' +
          '<img src="' + escapeHtml(productImage(product, 160)) + '" alt="' + escapeHtml(product.name) + '" ' +
            'onerror="this.src=\'https://placehold.co/160x160/D6F2EE/1A8A78?text=%E2%9C%A8\'">' +
          '<div>' +
            '<div class="ai-vto__product-name">' + category + ' · ' + escapeHtml(product.name) + '</div>' +
            '<div class="ai-vto__product-price">' + escapeHtml(priceLabel(product.price)) + '</div>' +
          '</div>' +
        '</div>' +

        (canTry ? vtoPanelHTML(product, hasResult) : vtoUnavailableHTML(product)) +
        saved +
      '</section>';

    bindStageFour();
  }

  function vtoPanelHTML(product, hasResult) {
    var category = product.category === 'collares' ? 'necklace' : 'bracelet';
    var instructions = category === 'necklace'
      ? 'Selfie de frente, con cuello y hombros visibles. Despejá el cabello del escote y buscá luz pareja.'
      : 'Foto del dorso de la mano y la muñeca, con los dedos visibles. Sin anillos que estorben y con fondo liso.';

    if (hasResult) {
      return '<div class="ai-vto__result">' +
        '<img class="ai-vto__result-img" src="' + escapeHtml(state.vto.resultUrl) + '" alt="Prueba virtual de ' + escapeHtml(product.name) + '">' +
        '<div class="ai-vto__result-bar">' +
          '<span class="ai-result-badge">✦ YouCam API</span>' +
          '<span class="ai-hint">La imagen de la prueba puede expirar.</span>' +
        '</div>' +
        '<div class="ai-actions">' +
          '<button type="button" class="ai-btn ai-btn--primary" id="ai-save-vto">Guardar look</button>' +
          '<a class="ai-btn ai-btn--wa" href="' + escapeHtml(whatsappProductUrl(product, 'consulta')) + '" target="_blank" rel="noopener noreferrer">Consultar disponibilidad</a>' +
          '<a class="ai-btn ai-btn--ghost" href="' + escapeHtml(whatsappProductUrl(product, 'compra')) + '" target="_blank" rel="noopener noreferrer">Comprar por WhatsApp</a>' +
          '<button type="button" class="ai-btn ai-btn--ghost" id="ai-retry-vto">Probar con otra foto</button>' +
        '</div>' +
      '</div>';
    }

    return '<div class="ai-vto__grid">' +
      '<div>' +
        '<div class="ai-consent">' +
          '<input type="checkbox" id="ai-consent-vto"' + (vtoConsent ? ' checked' : '') + '>' +
          '<label for="ai-consent-vto"><strong>Autorizo el uso de esta foto</strong> para generar la prueba virtual de esta pieza con YouCam (Perfect Corp). ' +
          'No se guarda en el catálogo ni se usa para otro fin.</label>' +
        '</div>' +

        '<label class="ai-drop" id="ai-vto-drop" for="ai-vto-input" style="margin-top:12px">' +
          '<span class="ai-drop__icon" aria-hidden="true">' +
            '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>' +
              '<circle cx="12" cy="13" r="4"/>' +
            '</svg>' +
          '</span>' +
          '<span class="ai-drop__title">Subí tu foto</span>' +
          '<span class="ai-drop__hint" id="ai-vto-drop-text">' +
            (vtoFile ? escapeHtml(vtoFile.name) : 'JPG o PNG · se reduce automáticamente antes de enviarla') +
          '</span>' +
          '<input type="file" id="ai-vto-input" accept="image/jpeg,image/png">' +
        '</label>' +
        '<div id="ai-vto-preview">' + vtoPreviewHTML() + '</div>' +
      '</div>' +
      '<div class="ai-vto__instructions">' +
        '<strong>Para ' + (category === 'necklace' ? 'un collar' : 'una pulsera') + '</strong>' +
        instructions +
        '<p class="ai-hint" style="margin-top:8px">Esta foto se pide recién ahora, cuando hace falta.</p>' +
      '</div>' +
    '</div>' +

    '<p class="ai-status' + (vtoStatusError ? ' is-error' : '') + '" id="ai-vto-status" role="status" aria-live="polite">' +
      (busy === 'vto' ? '<span class="ai-spinner" aria-hidden="true"></span>' : '') + escapeHtml(vtoStatus) +
    '</p>' +

    '<div class="ai-actions">' +
      '<button type="button" class="ai-btn ai-btn--primary" id="ai-vto-run"' +
        (!vtoFile || !vtoConsent || busy === 'vto' ? ' disabled' : '') + '>Probar virtualmente</button>' +
      '<a class="ai-btn ai-btn--ghost" href="' + escapeHtml(whatsappProductUrl(product, 'consulta')) + '" target="_blank" rel="noopener noreferrer">Consultar disponibilidad</a>' +
    '</div>';
  }

  function vtoUnavailableHTML(product) {
    return '<div class="ai-note ai-note--warm">' +
      '<strong>El probador no está disponible para esta pieza.</strong> Necesitamos una foto del catálogo en un host habilitado. ' +
      'Mientras tanto, podés consultar disponibilidad por WhatsApp.' +
      '<div class="ai-actions">' +
        '<a class="ai-btn ai-btn--wa" href="' + escapeHtml(whatsappProductUrl(product, 'consulta')) + '" target="_blank" rel="noopener noreferrer">Consultar por WhatsApp</a>' +
      '</div>' +
    '</div>';
  }

  function vtoPreviewHTML() {
    if (!vtoPreviewUrl) return '';
    return '<div class="ai-preview">' +
      '<span class="ai-preview__tag">Tu foto</span>' +
      '<img src="' + escapeHtml(vtoPreviewUrl) + '" alt="Vista previa de tu foto para la prueba virtual">' +
    '</div>';
  }

  function bindStageFour() {
    els.stage.querySelectorAll('[data-goto]').forEach(function (btn) {
      btn.addEventListener('click', function () { goStep(Number(btn.dataset.goto)); });
    });

    els.stage.querySelectorAll('[data-vto-pick]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectVtoProduct(btn.dataset.vtoPick);
        renderStage();
        renderProfile();
      });
    });

    var consent = document.getElementById('ai-consent-vto');
    var run = document.getElementById('ai-vto-run');
    if (consent) {
      consent.addEventListener('change', function () {
        vtoConsent = consent.checked;
        if (run) run.disabled = !vtoFile || !vtoConsent || busy === 'vto';
      });
    }

    var input = document.getElementById('ai-vto-input');
    var drop = document.getElementById('ai-vto-drop');
    if (input) {
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        selectVtoFile(file);
      });
    }
    if (drop) {
      ['dragenter', 'dragover'].forEach(function (eventName) {
        drop.addEventListener(eventName, function (event) {
          event.preventDefault();
          drop.classList.add('is-dragover');
        });
      });
      ['dragleave', 'drop'].forEach(function (eventName) {
        drop.addEventListener(eventName, function (event) {
          event.preventDefault();
          drop.classList.remove('is-dragover');
        });
      });
      drop.addEventListener('drop', function (event) {
        var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
        if (file) selectVtoFile(file);
      });
    }

    if (run) {
      run.addEventListener('click', function () {
        if (!vtoFile) {
          showToast('Elegí una foto primero.');
          return;
        }
        if (!vtoConsent) {
          showToast('Marcá el consentimiento para probar la pieza.');
          return;
        }
        runVto();
      });
    }

    var save = document.getElementById('ai-save-vto');
    if (save) {
      save.addEventListener('click', function () {
        var product = selectedVtoProduct();
        if (!product) return;
        saveLook(product, state.vto.resultUrl);
        renderStage();
      });
    }

    var retry = document.getElementById('ai-retry-vto');
    if (retry) {
      retry.addEventListener('click', function () {
        vtoToken += 1;
        state.vto.resultUrl = '';
        state.vto.at = '';
        vtoStatus = '';
        vtoStatusError = false;
        vtoFile = null;
        revokePreview(vtoPreviewUrl);
        vtoPreviewUrl = '';
        vtoConsent = false;
        busy = null;
        persist();
        renderStage();
      });
    }

    els.stage.querySelectorAll('[data-remove-look]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        removeLook(btn.dataset.removeLook);
      });
    });
  }

  function selectVtoProduct(id) {
    if (!id) return;
    var nextId = String(id);
    if (state.vto.productId === nextId) return;

    vtoToken += 1;
    state.vto.productId = nextId;
    state.vto.resultUrl = '';
    state.vto.at = '';
    vtoFile = null;
    revokePreview(vtoPreviewUrl);
    vtoPreviewUrl = '';
    vtoConsent = false;
    vtoStatus = '';
    vtoStatusError = false;
    busy = null;
    persist();
  }

  function selectVtoFile(file) {
    try {
      validatePhoto(file, MAX_PHOTO);
    } catch (err) {
      showToast(err.message);
      return;
    }

    vtoToken += 1;
    vtoFile = file;
    revokePreview(vtoPreviewUrl);
    vtoPreviewUrl = URL.createObjectURL(file);
    vtoStatus = '';
    vtoStatusError = false;
    busy = null;
    renderStage();
  }

  function selectedVtoProduct() {
    var product = state.vto.productId ? productById(state.vto.productId) : null;
    if (product) return product;
    var recs = getRecItems();
    return recs[0] ? recs[0].product : null;
  }

  async function runVto() {
    var product = selectedVtoProduct();
    if (!product) return;

    var category = product.category === 'collares' ? 'necklace' : 'bracelet';
    var token = ++vtoToken;
    busy = 'vto';
    vtoStatus = 'Preparando tu foto…';
    vtoStatusError = false;
    renderStage();

    try {
      var resized = await resizePhoto(vtoFile, VTO_MAX_EDGE, VTO_MAX_INPUT);
      if (token !== vtoToken) return;

      revokePreview(vtoPreviewUrl);
      vtoPreviewUrl = resized.dataUrl;

      var url = await requestVto(product, resized.blob, category, token);
      if (token !== vtoToken || !url) return;

      state.vto.resultUrl = url;
      state.vto.at = Date.now();
      state.vto.productId = String(product.id);
      persist();

      addMessage('¡Mirá qué bien queda! Podés guardar el look o consultar disponibilidad por WhatsApp. Si querés, probá otra pieza: tu perfil sigue acá.', 'adviser');
      busy = null;
      vtoStatus = '';
      vtoStatusError = false;
      renderStage();
      renderProfile();
    } catch (err) {
      if (token !== vtoToken) return;
      busy = null;
      vtoStatus = err && err.message ? err.message : 'No pudimos generar la prueba virtual.';
      vtoStatusError = true;
      renderStage();
    }
  }

  async function requestVto(product, blob, category, token) {
    if (!/^https?:$/.test(window.location.protocol)) {
      throw new Error('El probador virtual necesita el sitio servido desde Cloudflare Pages o un servidor local. Abrir el HTML con doble clic no habilita /api/vto.');
    }
    if (!canTryOn(product)) {
      throw new Error('Esta pieza no tiene una imagen compatible con el probador.');
    }

    var form = new FormData();
    form.append('photo', blob, 'photo.jpg');
    form.append('category', category);
    form.append('product_img', vtoRefImage(product));

    var post = await fetchWithTimeout('/api/vto', { method: 'POST', body: form }, 30000);
    var data = await post.json().catch(function () { return {}; });
    if (!post.ok || !data.taskId) {
      throw new Error(data.error || 'El servicio de prueba virtual no está disponible.');
    }

    for (var attempt = 0; attempt < VTO_MAX_POLLS; attempt += 1) {
      await sleep(VTO_POLL_MS);
      if (token !== vtoToken) return null;

      var elapsed = Math.round(((attempt + 1) * VTO_POLL_MS) / 1000);
      setVtoStatus('Generando la prueba virtual… ' + elapsed + ' s');

      var res = await fetchWithTimeout(
        '/api/vto?taskId=' + encodeURIComponent(data.taskId) + '&category=' + encodeURIComponent(category),
        {},
        15000
      );
      var payload = await res.json().catch(function () { return {}; });

      if (payload.status === 'success' && payload.url) return payload.url;
      if (payload.status === 'error') {
        throw new Error(payload.error || 'La tarea de prueba virtual falló.');
      }
      if (!res.ok && !payload.status) {
        throw new Error(payload.error || 'Error consultando la prueba virtual.');
      }
    }

    throw new Error('La prueba virtual está tardando más de lo normal. Probá de nuevo con otra foto.');
  }

  /* ── Looks guardados ─────────────────────── */

  function saveLook(product, resultUrl) {
    if (!product) return;

    var index = state.savedLooks.findIndex(function (item) { return item.productId === String(product.id); });
    var previous = index >= 0 ? state.savedLooks[index] : null;

    var look = {
      productId: String(product.id),
      name: product.name,
      price: product.price,
      image: product.image || '',
      category: product.category,
      resultUrl: resultUrl || (previous && previous.resultUrl) || '',
      toneLabel: state.tone ? state.tone.palette.short : '',
      at: Date.now()
    };

    if (index >= 0) state.savedLooks[index] = look;
    else state.savedLooks.unshift(look);

    state.savedLooks = state.savedLooks.slice(0, 6);
    persist();
    renderLookCount();
    addMessage('Guardé ' + product.name + ' en tu look. Podés enviarlo por WhatsApp cuando quieras.', 'adviser');
    showToast('Look guardado ✓');
  }

  function removeLook(id) {
    state.savedLooks = state.savedLooks.filter(function (item) { return String(item.productId) !== String(id); });
    persist();
    renderLookCount();
    renderStage();
    showToast('Pieza quitada de tu look.');
  }

  function savedLooksHTML() {
    if (!state.savedLooks.length) return '';

    return '<div class="ai-saved">' +
      '<div class="ai-saved__head">' +
        '<h3 class="ai-saved__title">Tu look guardado</h3>' +
        '<span class="ai-saved__count">' + state.savedLooks.length +
          (state.savedLooks.length === 1 ? ' pieza' : ' piezas') + '</span>' +
      '</div>' +
      '<div class="ai-saved__grid">' +
        state.savedLooks.map(function (look) {
          var product = productById(look.productId);
          var image = look.resultUrl || (product ? productImage(product, 300) : look.image);
          var category = look.category === 'collares' ? 'Collar' : 'Pulsera';
          var consultUrl = product ? whatsappProductUrl(product, 'consulta') : whatsappLookUrl();
          return '<article class="ai-saved-card">' +
            '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(look.name) + '" loading="lazy" ' +
              'onerror="this.src=\'https://placehold.co/300x300/D6F2EE/1A8A78?text=%E2%9C%A8\'">' +
            '<div class="ai-saved-card__body">' +
              '<div class="ai-saved-card__name">' + escapeHtml(look.name) + '</div>' +
              '<div class="ai-saved-card__meta">' + category +
                (look.toneLabel ? ' · Paleta ' + escapeHtml(look.toneLabel.toLowerCase()) : '') +
                '</div>' +
              '<div class="ai-saved-card__actions">' +
                (product ? '<a class="ai-mini ai-mini--ghost" href="product.html?id=' + encodeURIComponent(product.id) + '">Ficha</a>' : '') +
                '<a class="ai-mini ai-mini--ghost" href="' + escapeHtml(consultUrl) + '" target="_blank" rel="noopener noreferrer">Consultar</a>' +
                '<button type="button" class="ai-mini ai-mini--ghost" data-remove-look="' + escapeHtml(look.productId) + '">Quitar</button>' +
              '</div>' +
            '</div>' +
          '</article>';
        }).join('') +
      '</div>' +
      '<div class="ai-actions">' +
        '<a class="ai-btn ai-btn--wa" href="' + escapeHtml(whatsappLookUrl()) + '" target="_blank" rel="noopener noreferrer">Enviar mi look por WhatsApp</a>' +
        '<a class="ai-btn ai-btn--ghost" href="index.html">Seguir explorando</a>' +
      '</div>' +
    '</div>';
  }

  /* ── Asesora y perfil ────────────────────── */

  function renderMessages() {
    if (!els.messages) return;

    els.messages.innerHTML = state.messages.map(function (message) {
      var role = message.role === 'you' ? 'you' : 'adviser';
      var time = '';
      try {
        time = new Date(message.at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
      } catch (err) {}
      return '<div class="ai-msg ai-msg--' + role + '">' +
        '<div class="ai-msg__bubble">' + escapeHtml(message.text) + '</div>' +
        (time ? '<time class="ai-msg__time">' + time + '</time>' : '') +
      '</div>';
    }).join('');

    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function renderProfile() {
    if (!els.profile) return;

    var p = state.profile;
    var chips = [];

    if (p.style) chips.push({ text: 'Estilo: ' + E.LABELS.style[p.style] });
    else chips.push({ text: 'Estilo sin definir', empty: true });

    if (p.occasion) chips.push({ text: 'Ocasión: ' + E.LABELS.occasion[p.occasion] });
    else chips.push({ text: 'Ocasión sin definir', empty: true });

    if (p.pieces) chips.push({ text: 'Piezas: ' + E.LABELS.pieces[p.pieces] });

    if (p.metal && p.metal !== 'no-importa') chips.push({ text: 'Metal: ' + E.LABELS.metal[p.metal] });

    if (p.budget && p.budget !== 'sin-limite') chips.push({ text: 'Presupuesto: ' + E.LABELS.budget[p.budget] });

    if (state.tone) {
      var palette = state.tone.palette || E.PALETTES[state.tone.undertone];
      var source = state.tone.source === 'youcam' ? 'YouCam' : state.tone.source === 'manual' ? 'manual' : 'local';
      chips.push({
        text: 'Paleta ' + palette.short + ' · ' + source,
        dot: palette.swatches[0]
      });
    } else {
      chips.push({ text: 'Paleta sin definir', empty: true });
    }

    els.profile.innerHTML = chips.map(function (item) {
      return '<span class="ai-profile__chip' + (item.empty ? ' ai-profile__chip--empty' : '') + '">' +
        (item.dot ? '<i style="background:' + escapeHtml(item.dot) + '"></i>' : '') +
        escapeHtml(item.text) +
      '</span>';
    }).join('');
  }

  function addMessage(text, role) {
    if (!text) return;
    state.messages.push({
      role: role === 'you' ? 'you' : 'adviser',
      text: String(text),
      at: Date.now()
    });
    state.messages = state.messages.slice(-18);
    persist();
    renderMessages();
  }

  function renderLookCount() {
    if (els.lookCount) els.lookCount.textContent = String(state.savedLooks.length);
  }

  /* ── Fotos ───────────────────────────────── */

  function validatePhoto(file, maxBytes) {
    if (!file) throw new Error('Elegí una foto primero.');
    if (file.size > maxBytes) {
      throw new Error('La foto es demasiado grande (máximo ' + Math.round(maxBytes / 1024 / 1024) + ' MB).');
    }
    if (!/^image\/(jpeg|jpg|png)$/.test(file.type)) {
      throw new Error('Formato no soportado. Subí una foto JPG o PNG (las HEIC de iPhone no son compatibles).');
    }
  }

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('No pudimos leer esa imagen. Probá con una foto JPG o PNG.'));
      };
      img.src = url;
    });
  }

  function resizePhoto(file, maxEdge, maxBytes) {
    return new Promise(function (resolve, reject) {
      try {
        validatePhoto(file, maxBytes || MAX_PHOTO);
      } catch (err) {
        reject(err);
        return;
      }

      loadImage(file).then(function (img) {
        var edge = Math.max(img.width, img.height);
        if (edge < MIN_PHOTO_EDGE) {
          reject(new Error('La foto es muy pequeña. Usá una de al menos ' + MIN_PHOTO_EDGE + ' px.'));
          return;
        }

        var scale = Math.min(1, maxEdge / edge);
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(function (blob) {
          if (!blob) {
            reject(new Error('No pudimos procesar la foto.'));
            return;
          }
          resolve({
            blob: blob,
            canvas: canvas,
            dataUrl: canvas.toDataURL('image/jpeg', 0.78)
          });
        }, 'image/jpeg', 0.9);
      }).catch(reject);
    });
  }

  function revokePreview(url) {
    if (url && url.indexOf('blob:') === 0) {
      try { URL.revokeObjectURL(url); } catch (err) {}
    }
  }

  /* ── Lectura local de tono ───────────────── */

  async function detectFaceBox(canvas) {
    if (!('FaceDetector' in window)) return null;
    try {
      var detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      var faces = await detector.detect(canvas);
      if (faces && faces[0] && faces[0].boundingBox && faces[0].boundingBox.width >= 60) {
        return faces[0].boundingBox;
      }
    } catch (err) {}
    return null;
  }

  function analyzeSelfieCanvas(canvas, faceBox) {
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var width = canvas.width;
    var height = canvas.height;
    var regions = faceBox ? faceRegions(faceBox, width, height) : centerRegions();
    var pixels = collectSkinPixels(ctx, regions, width, height);

    if (pixels.length < 220) {
      pixels = collectSkinPixels(ctx, [{ x: 0.16, y: 0.16, w: 0.68, h: 0.68 }], width, height);
    }
    if (pixels.length < 220) {
      throw new Error('No pudimos leer la piel en la foto. Probá con una selfie de frente, rostro grande y buena luz.');
    }

    var r = median(pixels.map(function (pixel) { return pixel[0]; }));
    var g = median(pixels.map(function (pixel) { return pixel[1]; }));
    var b = median(pixels.map(function (pixel) { return pixel[2]; }));

    var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (luminance < 0.12) {
      throw new Error('La foto está muy oscura. Buscá una luz pareja de frente y volvé a intentar.');
    }
    if (luminance > 0.96) {
      throw new Error('La foto está muy expuesta. Evitá el flash directo o el contraluz fuerte.');
    }

    var confidence = pixels.length >= 1800 && luminance > 0.2 && luminance < 0.9 ? 'alta' : 'media';
    var tone = E.toneFromRgb({ r: r, g: g, b: b }, { source: 'local', confidence: confidence });

    var note = confidence === 'alta'
      ? 'Lectura local clara. Igual podés ajustar la paleta si la luz te cambió el tono.'
      : 'Lectura local orientativa: el encuadre o la luz pueden influir. Revisá la paleta y ajustala si no te representa.';

    return {
      tone: tone,
      note: note,
      sampleCount: pixels.length
    };
  }

  function centerRegions() {
    return [
      { x: 0.30, y: 0.22, w: 0.40, h: 0.18 },
      { x: 0.22, y: 0.38, w: 0.24, h: 0.24 },
      { x: 0.54, y: 0.38, w: 0.24, h: 0.24 },
      { x: 0.32, y: 0.60, w: 0.36, h: 0.18 }
    ];
  }

  function faceRegions(box, width, height) {
    var x = box.x / width;
    var y = box.y / height;
    var w = box.width / width;
    var h = box.height / height;
    return [
      { x: x + w * 0.24, y: y + h * 0.10, w: w * 0.52, h: h * 0.18 },
      { x: x + w * 0.10, y: y + h * 0.36, w: w * 0.30, h: h * 0.26 },
      { x: x + w * 0.60, y: y + h * 0.36, w: w * 0.30, h: h * 0.26 },
      { x: x + w * 0.28, y: y + h * 0.62, w: w * 0.44, h: h * 0.16 }
    ];
  }

  function collectSkinPixels(ctx, regions, width, height) {
    var pixels = [];
    regions.forEach(function (region) {
      var x0 = Math.max(0, Math.floor(region.x * width));
      var y0 = Math.max(0, Math.floor(region.y * height));
      var x1 = Math.min(width, Math.ceil((region.x + region.w) * width));
      var y1 = Math.min(height, Math.ceil((region.y + region.h) * height));
      if (x1 <= x0 || y1 <= y0) return;

      var data;
      try {
        data = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      } catch (err) {
        return;
      }

      for (var y = 0; y < y1 - y0; y += 2) {
        for (var x = 0; x < x1 - x0; x += 2) {
          var index = (y * (x1 - x0) + x) * 4;
          var r = data[index];
          var g = data[index + 1];
          var b = data[index + 2];
          var a = data[index + 3];
          if (a < 200) continue;
          if (isSkinPixel(r, g, b)) pixels.push([r, g, b]);
        }
      }
    });
    return pixels;
  }

  function isSkinPixel(r, g, b) {
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    if (max < 30 || min > 248) return false;
    if (r < g || r < b) return false;
    if (max - min < 9) return false;
    if (r - b < 4) return false;

    var cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    var cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    return cb >= 75 && cb <= 137 && cr >= 128 && cr <= 182;
  }

  function median(values) {
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2) return sorted[middle];
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  /* ── YouCam: análisis de tono ────────────── */

  async function refineToneWithYouCam(blob, token) {
    if (!/^https?:$/.test(window.location.protocol)) return;

    try {
      setToneStatus('Refinando la lectura con YouCam…');
      var color = await requestYouCamTone(blob, token);
      if (!color || token !== toneToken) return;
      if (state.step > 2 || !state.tone || state.tone.source !== 'local') return;

      state.tone = E.toneFromYouCam(color);
      state.toneNote = 'YouCam leyó los colores de tu rostro. La paleta sigue siendo una orientación estética, no una etiqueta.';
      invalidateRecommendations();
      persist();
      addMessage('Refiné la lectura con YouCam: tu paleta se inclina a tonos ' + state.tone.palette.plural + '. Si no te representa, podés ajustarla a mano.', 'adviser');
      toneStatus = '';
      toneStatusError = false;
      renderStage();
      renderProfile();
    } catch (err) {
      if (token !== toneToken) return;
      state.toneNote = 'El análisis avanzado de YouCam no está disponible en este entorno. Queda la lectura local orientativa; podés ajustar la paleta a mano.';
      persist();
      if (state.step === 2) {
        setToneStatus(state.toneNote);
        renderStage();
      }
    }
  }

  async function requestYouCamTone(blob, token) {
    var form = new FormData();
    form.append('photo', blob, 'selfie.jpg');

    var post = await fetchWithTimeout('/api/tono', { method: 'POST', body: form }, 25000);
    var data = await post.json().catch(function () { return {}; });
    if (!post.ok || !data.taskId) {
      throw new Error(data.error || 'El análisis avanzado no está disponible.');
    }

    for (var attempt = 0; attempt < TONE_MAX_POLLS; attempt += 1) {
      await sleep(TONE_POLL_MS);
      if (token !== toneToken) return null;

      var res = await fetchWithTimeout('/api/tono?taskId=' + encodeURIComponent(data.taskId), {}, 15000);
      var payload = await res.json().catch(function () { return {}; });

      if (payload.status === 'success' && payload.color) return payload.color;
      if (payload.status === 'error') {
        throw new Error(payload.error || 'La tarea de análisis falló.');
      }
      if (!res.ok && !payload.status) {
        throw new Error(payload.error || 'Error consultando el análisis.');
      }
    }

    throw new Error('El análisis avanzado tardó demasiado.');
  }

  function setToneStatus(message) {
    toneStatus = message || '';
    var status = document.getElementById('ai-tone-status');
    if (status && state.step === 2 && !state.tone) {
      status.className = 'ai-status';
      status.innerHTML = escapeHtml(toneStatus);
    }
  }

  function setVtoStatus(message) {
    vtoStatus = message || '';
    var status = document.getElementById('ai-vto-status');
    if (status && state.step === 4 && !state.vto.resultUrl) {
      status.className = 'ai-status';
      status.innerHTML = '<span class="ai-spinner" aria-hidden="true"></span>' + escapeHtml(vtoStatus);
    }
  }

  /* ── Utilidades ──────────────────────────── */

  function getProducts() {
    if (typeof PRODUCTS === 'undefined' || !Array.isArray(PRODUCTS)) return [];
    return PRODUCTS.filter(function (product) {
      return product && product.activo !== false && product.category !== 'mayoristas';
    });
  }

  function productById(id) {
    if (typeof getProductById === 'function') {
      var direct = getProductById(id);
      if (direct) return direct;
    }
    var products = getProducts();
    for (var i = 0; i < products.length; i += 1) {
      if (String(products[i].id) === String(id)) return products[i];
    }
    return null;
  }

  function productImage(product, size) {
    if (!product) return '';
    var url = product.image || '';
    if (url && typeof cloudinaryThumb === 'function') {
      try { return cloudinaryThumb(url, size || 400) || url; } catch (err) {}
    }
    return url || 'https://placehold.co/400x400/D6F2EE/1A8A78?text=%E2%9C%A8';
  }

  function vtoRefImage(product) {
    var url = (product && product.image) || '';
    if (url.indexOf('cloudinary') !== -1 && url.indexOf('/upload/') !== -1) {
      return url.replace('/upload/', '/upload/w_1024,c_limit,f_jpg,q_auto/');
    }
    return url;
  }

  function canTryOn(product) {
    if (!product || (product.category !== 'collares' && product.category !== 'pulseras')) return false;
    try {
      var url = new URL(product.image, window.location.href);
      return url.protocol === 'https:' && (url.hostname === 'res.cloudinary.com' || url.hostname === 'i.ibb.co');
    } catch (err) {
      return false;
    }
  }

  function priceLabel(value) {
    if (typeof formatPrice === 'function') {
      try { return formatPrice(value); } catch (err) {}
    }
    var symbol = (typeof CONFIG === 'object' && CONFIG && CONFIG.currencySymbol) || '$';
    return 'Ref. ' + Math.round(Number(value) || 0) + symbol;
  }

  function whatsappNumber() {
    var number = (typeof CONFIG === 'object' && CONFIG && CONFIG.whatsappNumber) || WA_FALLBACK;
    return String(number).replace(/\D/g, '') || WA_FALLBACK;
  }

  function profileLine() {
    var p = state.profile;
    var parts = [];
    if (p.style) parts.push('estilo ' + E.LABELS.style[p.style]);
    if (p.occasion) parts.push(E.LABELS.occasion[p.occasion]);
    if (state.tone) parts.push('paleta ' + state.tone.palette.short);
    return parts.join(', ');
  }

  function whatsappProductUrl(product, mode) {
    var intro = mode === 'compra'
      ? 'Hola! Quiero comprar '
      : 'Hola! Quiero consultar disponibilidad de ';
    var message = intro + '*' + product.name + '* (' + product.id + ') — ' + priceLabel(product.price) + '.\n\n' +
      'Usé Aguamarina AI. Mi perfil: ' + profileLine() + '.\n\n' +
      '¿Me confirmás disponibilidad y coordinamos el envío?';
    return 'https://wa.me/' + whatsappNumber() + '?text=' + encodeURIComponent(message);
  }

  function whatsappLookUrl() {
    if (!state.savedLooks.length) return 'https://wa.me/' + whatsappNumber();
    var lines = state.savedLooks.map(function (look) {
      return '• ' + look.name + ' (' + look.productId + ') — ' + priceLabel(look.price);
    }).join('\n');
    var message = 'Hola! Usé Aguamarina AI y guardé este look:\n\n' + lines + '\n\n' +
      (profileLine() ? 'Mi perfil: ' + profileLine() + '.\n\n' : '') +
      '¿Me confirmás disponibilidad y coordinamos el envío?';
    return 'https://wa.me/' + whatsappNumber() + '?text=' + encodeURIComponent(message);
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, timeoutMs || 20000);
    var opts = Object.assign({}, options || {}, { signal: controller.signal });
    return fetch(url, opts).then(function (response) {
      clearTimeout(timer);
      return response;
    }).catch(function (err) {
      clearTimeout(timer);
      if (err && err.name === 'AbortError') {
        throw new Error('La conexión tardó demasiado. Probá de nuevo.');
      }
      throw new Error('No pudimos conectar con el servicio. Revisá tu conexión.');
    });
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toast.classList.remove('is-visible');
    }, 2800);
  }

  window.initAsesora = initAsesora;
})();
