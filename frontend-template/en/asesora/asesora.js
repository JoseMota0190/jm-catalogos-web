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
      stageFallback.innerHTML = '<p class="ai-empty__text">We couldn’t load the recommendation engine.</p>';
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
    { value: 'diario', label: 'Everyday', hint: 'For everyday wear', image: 'Set Sencillo "Beige"', icon: 'sun' },
    { value: 'especial', label: 'Special occasion', hint: 'Make a statement', image: 'Aura de Sol', icon: 'sparkles' },
    { value: 'trabajo', label: 'Work', hint: 'From day to office', image: 'Cadenas', icon: 'briefcase' },
    { value: 'playa', label: 'Beach / vacation', hint: 'Light and natural', image: 'Collar Playero', icon: 'wave' },
    { value: 'regalo', label: 'A gift', hint: 'For someone special', image: 'Set Corazón Tejido', icon: 'gift' }
  ];

  var STYLES = [
    { value: 'elegante', label: 'Elegant', hint: 'Sophisticated and timeless', image: 'Collar Cristal Checo', icon: 'diamond' },
    { value: 'casual', label: 'Casual', hint: 'Relaxed, for daytime', image: 'Set Sencillo "Aguamarina"', icon: 'sun' },
    { value: 'llamativo', label: 'Bold', hint: 'Bold and shiny', image: 'Set Brillo Absoluto', icon: 'sparkles' },
    { value: 'minimalista', label: 'Minimalist', hint: 'Simple, fine lines', image: 'Cadenitas', icon: 'line' },
    { value: 'bohemio', label: 'Bohemian', hint: 'Natural and handmade', image: 'Caracoles Naturales Set', icon: 'leaf' },
    { value: 'romantico', label: 'Romantic', hint: 'Delicate and feminine', image: 'Corazón Real', icon: 'heart' }
  ];

  var PIECES = [
    { value: 'collares', label: 'Necklaces', hint: 'Close to the face', image: 'Encanto Marino', icon: 'necklace' },
    { value: 'pulseras', label: 'Bracelets', hint: 'For the wrist', image: 'Set Aura de Nácar', icon: 'bracelet' },
    { value: 'ambos', label: 'Both', hint: 'A complete look', images: ['Encanto Marino', 'Set Aura de Nácar'], icon: 'sparkles' }
  ];

  var METALS = [
    { value: 'dorado', label: 'Gold', hint: 'Warm and luminous', swatch: 'dorado' },
    { value: 'plateado', label: 'Silver', hint: 'Cool and luminous', swatch: 'plateado' },
    { value: 'combinado', label: 'Mixed', hint: 'Mix metals', swatch: 'combinado' },
    { value: 'no-importa', label: 'I’m not sure yet', hint: 'Surprise me', swatch: 'no-importa' }
  ];

  var CHOICE_ICONS = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    sparkles: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/><path d="M19 16v3M17.5 17.5h3"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',
    wave: '<path d="M2 12c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M2 17c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/>',
    gift: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18"/><path d="M12 8H7.5a2.5 2.5 0 1 1 0-5C10 3 12 8 12 8Z"/><path d="M12 8h4.5a2.5 2.5 0 1 0 0-5C14 3 12 8 12 8Z"/>',
    diamond: '<path d="m12 3 7 6-7 12L5 9l7-6Z"/><path d="M5 9h14M9 3 7 9l5 12 5-12-2-6"/>',
    line: '<path d="M4 12h16"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/>',
    leaf: '<path d="M20 4C10 4 4 9 4 16c0 2 1 4 1 4s2-4 6-6c3-1.5 6-2 9-2"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    necklace: '<path d="M5 4c0 8 3 11 7 11s7-3 7-11"/><circle cx="12" cy="18" r="2.5"/>',
    bracelet: '<ellipse cx="12" cy="12" rx="7" ry="9"/><path d="M5 12h14"/>'
  };

  function iconSvg(name) {
    if (!name || !CHOICE_ICONS[name]) return '';
    return '<span class="ai-choice__icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      CHOICE_ICONS[name] + '</svg></span>';
  }

  var state = defaultState();
  var els = {};
  var booting = true;
  var busy = null;
  var toneToken = 0;
  var vtoToken = 0;
  var photoFiles = { necklace: null, bracelet: null };
  var photoConsentGiven = false;
  var cameraStream = null;
  var cameraCategory = '';
  var simAutoPending = false;
  var toneStatus = '';
  var toneStatusError = false;
  var vtoFile = null;
  var vtoPreviewUrl = '';
  var vtoConsent = false;
  var vtoPhotoSource = '';
  var vtoPhotoCategory = '';
  var vtoPhotoLabel = '';
  var vtoStatus = '';
  var vtoStatusError = false;
  var DEMO_MODELS = {
    necklace: { src: '/img/modelo/selfie.jpg', label: 'Model · selfie', hint: 'Neck and shoulders visible' },
    bracelet: { src: '/img/modelo/mano.jpg', label: 'Model · hand', hint: 'Back of the hand and wrist' }
  };
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
        budget: 'sin-limite',
        budgetMax: null,
        budgetLabel: 'No limit'
      },
      tone: null,
      toneNote: '',
      photoMode: '',
      recommendations: [],
      recCount: 0,
      recSignature: '',
      recError: '',
      altIndex: 0,
      savedLooks: [],
      chat: { editField: '' },
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
      state.chat = Object.assign({ editField: '' }, saved.chat || {});
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
    if (!state.chat || typeof state.chat !== 'object') state.chat = { editField: '' };
    if (!state.chat.editField) state.chat.editField = '';
    if (!state.flags || typeof state.flags !== 'object') state.flags = {};
    if (!state.flags.touched || typeof state.flags.touched !== 'object') state.flags.touched = {};
    if (!state.vto || typeof state.vto !== 'object') state.vto = base.vto;
    state.vto.productId = state.vto.productId ? String(state.vto.productId) : '';

    state.step = Math.max(1, Math.min(3, Number(state.step) || 1));
    if (state.step >= 2 && !profileReady()) state.step = 1;

    if (state.photoMode !== 'real' && state.photoMode !== 'model') state.photoMode = '';
    if (state.photoMode === 'model') {
      setStandardTone();
    } else if (state.tone && state.tone.source === 'estandar') {
      state.tone = null;
      state.toneNote = '';
    }
    if (state.step >= 3 && !state.tone) state.step = 2;

    photoConsentGiven = state.photoMode === 'model';
    vtoConsent = state.photoMode === 'model';
    if (state.photoMode === 'model') setModelPhotoEntries();
    busy = null;
  }

  function persist() {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
    } catch (err) {
      // sessionStorage puede fallar en modo privado; la experiencia sigue en memoria.
    }
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
    bindGlobal();
    renderAll();

    try {
      var loading = [];
      if (typeof loadConfig === 'function') loading.push(loadConfig());
      if (typeof loadProducts === 'function') loading.push(loadProducts());
      await Promise.all(loading);
    } catch (err) {
      console.error('Aguamarina AI: the catalog couldn’t be loaded.', err);
    }

    if (typeof updateCartUI === 'function') updateCartUI();

    booting = false;
    syncBudget();
    persist();
    if (state.step >= 3) ensureRecommendations(true);
    renderAll();
  }

  function cacheEls() {
    els = {
      navbar: document.getElementById('navbar'),
      wizard: document.querySelector('.ai-wizard'),
      stage: document.getElementById('ai-stage'),
      stepper: document.getElementById('ai-stepper'),
      profile: document.getElementById('ai-profile'),
      reset: document.getElementById('ai-reset'),
      lookBtn: document.getElementById('ai-look-btn'),
      lookCount: document.getElementById('ai-look-count'),
      toast: document.getElementById('ai-toast'),
      mobileBar: document.getElementById('ai-mobile-bar')
    };
  }

  function bindGlobal() {
    if (els.reset) {
      els.reset.addEventListener('click', function () {
        if (!window.confirm('Restart the experience? Your profile and favorites for this tab will be erased.')) return;
        resetExperience();
      });
    }

    if (els.lookBtn) {
      els.lookBtn.addEventListener('click', function () {
        if (!state.savedLooks.length && !state.recommendations.length) {
          showToast('You haven’t saved any favorites yet.');
          return;
        }
        if (!state.recommendations.length && state.savedLooks.length) {
          state.step = 3;
          persist();
          renderAll();
          return;
        }
        goStep(3);
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

  function renderMobileBar() {
    if (!els.mobileBar) return;

    var html = '';
    if (state.step === 1) {
      var chatDone = chatStep() === 'summary';
      html = '<button type="button" class="ai-mobile-bar__primary" data-mobile-action="next-1"' +
        (chatDone ? '' : ' disabled') + '>' + (chatDone ? 'Continue to photo →' : 'Continue the conversation') + '</button>';
    } else if (state.step === 2) {
      if (photoStepReady()) {
        html = '<button type="button" class="ai-mobile-bar__primary" data-mobile-action="next-2">See my pieces →</button>';
      } else if (!state.photoMode) {
        html = '<button type="button" class="ai-mobile-bar__primary" data-mobile-action="focus-photo">Choose photo path</button>';
      } else if (state.photoMode === 'real' && (!state.tone || state.tone.source !== 'youcam')) {
        html = '<button type="button" class="ai-mobile-bar__primary" data-mobile-action="focus-tone">Analyze my tone</button>';
      } else {
        html = '<button type="button" class="ai-mobile-bar__primary" data-mobile-action="focus-photo">Complete photo</button>';
      }
    } else if (state.step === 3) {
      var recs = getRecItems();
      html = recs.length
        ? '<button type="button" class="ai-mobile-bar__primary" data-mobile-action="next-3">Simulate ' +
            escapeHtml(recs[0].product.name) + ' →</button>'
        : '<button type="button" class="ai-mobile-bar__primary" data-mobile-action="goto-1">Adjust my profile</button>';
    } else {
      var selected = selectedVtoProduct();
      if (selected && !canTryOn(selected)) {
        html = '<a class="ai-mobile-bar__primary" href="' + escapeHtml(whatsappProductUrl(selected, 'consulta')) +
          '" target="_blank" rel="noopener noreferrer">Ask on WhatsApp</a>';
      } else if (state.vto.resultUrl) {
        html = '<button type="button" class="ai-mobile-bar__primary" data-mobile-action="save-look">Save to favorites</button>';
      } else {
        html = '<button type="button" class="ai-mobile-bar__primary" data-mobile-action="vto-run"' +
          (!vtoFile || !vtoConsent || busy === 'vto' || busy === 'model' ? ' disabled' : '') + '>Try on virtually</button>';
      }
    }

    els.mobileBar.innerHTML = html;
    els.mobileBar.querySelectorAll('[data-mobile-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleMobileAction(btn.dataset.mobileAction);
      });
    });
  }

  function handleMobileAction(action) {
    if (action === 'next-1') {
      advanceFromProfile();
      return;
    }
    if (action === 'next-2') {
      advanceFromPhoto();
      return;
    }
    if (action === 'next-3') {
      var recs = getRecItems();
      if (recs.length) simulateProduct(recs[0].product.id);
      return;
    }
    if (action === 'focus-photo') {
      var focusPhoto = document.querySelector('.ai-photo-mode, .ai-photo-grid, .ai-photo-real');
      if (focusPhoto) focusPhoto.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (action === 'focus-tone') {
      var toneButton = document.getElementById('ai-tone-run');
      if (toneButton) {
        toneButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        toneButton.focus({ preventScroll: true });
      }
      return;
    }
    if (action === 'choose-tone') {
      var manual = document.querySelector('.ai-manual');
      if (manual) {
        manual.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var first = manual.querySelector('[data-tone]');
        if (first) first.focus({ preventScroll: true });
      }
      return;
    }
    if (action === 'goto-1') {
      goStep(1);
      return;
    }
    if (action === 'save-look') {
      var product = selectedVtoProduct();
      if (product) {
        saveLook(product, state.vto.resultUrl);
        renderStage();
        renderMobileBar();
      }
      return;
    }
    if (action === 'vto-run') {
      var run = document.getElementById('ai-vto-run');
      if (run && !run.disabled) {
        run.click();
      } else {
        showToast('Complete the photo and consent to try on the piece.');
        var consent = document.getElementById('ai-consent-vto');
        if (consent) consent.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
  }

  function advanceFromProfile() {
    if (!profileReady()) {
      showToast('Finish the conversation to continue.');
      return;
    }
    goStep(2);
  }

  function resetExperience() {
    state = defaultState();
    cancelChatTyping();
    toneToken += 1;
    vtoToken += 1;
    stopCamera();
    photoFiles.necklace = null;
    photoFiles.bracelet = null;
    photoConsentGiven = false;
    vtoFile = null;
    vtoPhotoSource = '';
    vtoPhotoCategory = '';
    vtoPhotoLabel = '';
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
    persist();
    renderAll();
    showToast('Starting over ✨');
  }

  /* ── Render general ──────────────────────── */

  function renderAll() {
    renderStepper();
    renderStage();
    renderProfile();
    renderLookCount();
    renderMobileBar();
  }

  function renderStepper() {
    if (!els.stepper) return;

    var steps = [
      { n: 1, label: 'Style' },
      { n: 2, label: 'Photo' },
      { n: 3, label: 'Pieces' }
    ];

    var progress = ((state.step - 1) / (steps.length - 1)) * 100;

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
    }).join('') +
    '<span class="ai-stepper__progress" style="width:' + progress + '%" aria-hidden="true"></span>';

    els.stepper.querySelectorAll('[data-step]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        goStep(Number(btn.dataset.step));
      });
    });
  }

  function canGo(step) {
    if (step === 1) return true;
    if (step === 2) return profileReady();
    if (step === 3) return profileReady() && photoStepReady();
    return false;
  }

  function goStep(step) {
    if (step === 2 && !profileReady()) {
      showToast('First choose an occasion and a style.');
      return;
    }
    if (step === 3) {
      if (!profileReady()) {
        showToast('First complete your style profile.');
        return;
      }
      if (!photoStepReady()) {
        showToast(state.photoMode === 'real'
          ? 'Analyze your tone with YouCam or use a model to continue.'
          : 'Complete the photo to continue.');
        return;
      }
      if (!booting) ensureRecommendations(true);
    }
    state.step = Math.max(1, Math.min(3, step));
    cancelChatTyping();
    persist();

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
    renderMobileBar();

    if (booting && state.step >= 3) {
      els.stage.innerHTML =
        '<div class="ai-empty">' +
          '<span class="ai-spinner" aria-hidden="true"></span>' +
          '<p class="ai-empty__title">Loading the catalog…</p>' +
          '<p class="ai-empty__text">We’re matching your profile with Aguamarina pieces.</p>' +
        '</div>';
      return;
    }

    if (state.step === 1) renderStageOne();
    else if (state.step === 2) renderStageTwo();
    else renderStageThree();

    if (lastRenderedStep !== state.step) {
      lastRenderedStep = state.step;
      els.stage.classList.remove('is-stage-enter');
      void els.stage.offsetWidth;
      els.stage.classList.add('is-stage-enter');
    }
  }

  /* ── Etapa 01 · Estilo conversacional ───── */

  var CHAT_FIELDS = ['occasion', 'style', 'pieces', 'budget'];
  var chatScrollPending = false;
  var chatTyping = false;
  var chatReveal = false;
  var chatTypingTimer = null;
  var lastRenderedStep = null;
  var prefersReducedMotion = false;
  try {
    prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (err) {}

  function chatStep() {
    var p = state.profile || {};
    var touched = state.flags.touched || {};

    if (state.chat && state.chat.editField) return state.chat.editField;
    if (!p.occasion) return 'occasion';
    if (!p.style) return 'style';
    if (!touched.pieces) return 'pieces';
    if (!touched.budget) return 'budget';
    return 'summary';
  }

  function chatAnswered(field) {
    if (field === 'occasion' || field === 'style') return Boolean(state.profile[field]);
    return Boolean((state.flags.touched || {})[field]);
  }

  function renderStageOne() {
    var step = chatStep();
    var summary = step === 'summary';

    els.stage.innerHTML =
      '<section class="ai-chat" aria-labelledby="ai-stage-title">' +
        '<header class="ai-stage__head ai-chat__head">' +
          '<p class="ai-stage__eyebrow">Stage 01 · Know your style</p>' +
          '<h2 class="ai-stage__title" id="ai-stage-title" tabindex="-1">Let’s talk about <em>you</em></h2>' +
          '<p class="ai-stage__lead">A short conversation, one question at a time. The advisor builds your profile from what you tell her.</p>' +
        '</header>' +
        '<div class="ai-chat__thread" id="ai-chat-thread" role="log" aria-label="Conversation with the advisor">' +
          chatThreadHTML(step) +
        '</div>' +
        (chatTyping ? '' : (summary ? chatSummaryHTML() : chatOptionsHTML(step))) +
        (chatTyping ? '' :
          '<p class="ai-chat__status" id="ai-chat-status" role="status" aria-live="polite">' +
            escapeHtml(chatStatusText(step)) +
          '</p>') +
      '</section>';

    bindStageOne();

    if (chatScrollPending) {
      chatScrollPending = false;
      setTimeout(scrollChatToLatest, 60);
    }
  }

  function chatThreadHTML(step) {
    var html = chatBubbleHTML('ai', 'Hi! I’m your Aguamarina advisor. Let’s find pieces that make you feel good. I’ll ask a few short questions and build your profile.');

    if (state.chat && state.chat.editField) {
      return html + chatBubbleHTML('ai', chatQuestionText(step));
    }

    var lastAnsweredField = null;
    for (var j = 0; j < CHAT_FIELDS.length; j += 1) {
      if (!chatAnswered(CHAT_FIELDS[j])) break;
      lastAnsweredField = CHAT_FIELDS[j];
    }

    for (var i = 0; i < CHAT_FIELDS.length; i += 1) {
      var field = CHAT_FIELDS[i];
      if (field === step) break;
      if (!chatAnswered(field)) break;
      html += chatBubbleHTML('ai', chatQuestionText(field));
      html += chatBubbleHTML('you', chatAnswerText(field), chatTyping && field === lastAnsweredField);
    }

    if (chatTyping) {
      html += chatTypingHTML();
    } else if (step === 'summary') {
      html += chatBubbleHTML('ai', chatSummaryText(), chatReveal);
    } else {
      html += chatBubbleHTML('ai', chatQuestionText(step), chatReveal);
    }

    return html;
  }

  function chatTypingHTML() {
    return '<div class="ai-chat-bubble ai-chat-bubble--ai ai-chat-bubble--typing" aria-label="The advisor is typing">' +
      '<span class="ai-chat-bubble__avatar" aria-hidden="true">A</span>' +
      '<div class="ai-chat-bubble__body">' +
        '<span class="ai-typing" aria-hidden="true"><i></i><i></i><i></i></span>' +
      '</div>' +
    '</div>';
  }

  function chatBubbleHTML(role, text, fresh) {
    var freshClass = fresh ? ' is-fresh' : '';
    if (role === 'you') {
      return '<div class="ai-chat-bubble ai-chat-bubble--you' + freshClass + '">' +
        '<div class="ai-chat-bubble__body">' + escapeHtml(text) + '</div>' +
      '</div>';
    }
    return '<div class="ai-chat-bubble ai-chat-bubble--ai' + freshClass + '">' +
      '<span class="ai-chat-bubble__avatar" aria-hidden="true">A</span>' +
      '<div class="ai-chat-bubble__body">' + escapeHtml(text) + '</div>' +
    '</div>';
  }

  function chatQuestionText(field) {
    if (field === 'occasion') return 'To start, what occasion are you looking for?';
    if (field === 'style') {
      return 'Perfect: ' + chatAnswerNatural('occasion') + '. Which style represents you best?';
    }
    if (field === 'pieces') {
      return 'I like: ' + chatAnswerNatural('style') + '. Are you looking for a necklace, a bracelet, or a complete look?';
    }
    if (field === 'budget') return 'Almost there. How much do you have in mind? You can pick a range or let me surprise you.';
    if (field === 'summary') return chatSummaryText();
    return '';
  }

  function chatAnswerNatural(field) {
    if (field === 'pieces' && state.profile && state.profile.pieces === 'ambos') return 'a complete look';
    if (field === 'metal' && state.profile && state.profile.metal === 'no-importa') return 'no preference';
    return lowerFirst(chatAnswerText(field));
  }

  function typingDelay(field) {
    var text = chatQuestionText(field) || '';
    var ms = 420 + text.length * 9;
    return Math.max(450, Math.min(1050, ms));
  }

  function chatAnswerText(field) {
    var p = state.profile || {};
    if (field === 'occasion') return labelFromList(OCCASIONS, p.occasion);
    if (field === 'style') return labelFromList(STYLES, p.style);
    if (field === 'pieces') return labelFromList(PIECES, p.pieces);
    if (field === 'metal') return labelFromList(METALS, p.metal);
    if (field === 'budget') {
      return p.budgetLabel || (p.budget === 'sin-limite' ? 'No limit' : p.budget);
    }
    return '';
  }

  function labelFromList(list, value) {
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].value === value) return list[i].label;
    }
    return value || '';
  }

  function lowerFirst(text) {
    text = String(text || '');
    return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
  }

  function chatSummaryText() {
    var p = state.profile || {};
    var text = 'All set. You’ll see ' + E.LABELS.pieces[p.pieces] +
      ' in ' + E.LABELS.style[p.style] +
      ' style for ' + E.LABELS.occasion[p.occasion];

    if (p.budget && p.budget !== 'sin-limite') {
      if (p.budgetMax != null) {
        text += ', with a cap of ' + priceLabel(p.budgetMax);
      } else {
        text += ', with ' + (p.budgetLabel || 'your budget');
      }
    }

    return text + '. Shall we continue with your photo?';
  }

  function chatStatusText(step) {
    if (step === 'summary') return 'Profile ready. Let us continue with your photo.';
    return chatQuestionText(step);
  }

  function chatOptionsHTML(field) {
    if (field === 'occasion' || field === 'style' || field === 'pieces') {
      var items = field === 'occasion' ? OCCASIONS : field === 'style' ? STYLES : PIECES;
      var labels = { occasion: 'Occasion', style: 'Style', pieces: 'Pieces' };
      return '<div class="ai-chat__options ai-chat__options--visual' + (chatReveal ? ' is-revealing' : '') + '" role="group" aria-label="' + labels[field] + '">' +
        items.map(function (item) { return chatVisualOption(field, item); }).join('') +
      '</div>';
    }

    if (field === 'budget') {
      var options = getBudgetOptions();
      var loading = '';
      if (!options.length) {
        options = [{ value: 'sin-limite', max: null, label: 'No limit' }];
        loading = '<span class="ai-chat__loading"><span class="ai-spinner" aria-hidden="true"></span> Calculating ranges from the catalog…</span>';
      }
      return '<div class="ai-chat__options ai-chat__options--chips' + (chatReveal ? ' is-revealing' : '') + '" role="group" aria-label="Budget">' +
        options.map(function (option) { return chatBudgetOption(option); }).join('') +
        loading +
      '</div>';
    }

    return '';
  }

  function chatVisualOption(field, item) {
    var selected = chatAnswered(field) && state.profile[field] === item.value;
    var imageName = item.images && item.images.length ? item.images[0] : item.image;
    var image = visualFor(imageName);

    return '<button type="button" class="ai-chat-opt' + (selected ? ' is-selected' : '') +
      '" data-field="' + field + '" data-value="' + escapeHtml(item.value) +
      '" aria-pressed="' + selected + '">' +
      '<span class="ai-chat-opt__media">' +
        '<span class="ai-chat-opt__bg ai-choice__bg--' + escapeHtml(item.value) + '" aria-hidden="true"></span>' +
        (image ? '<img src="' + escapeHtml(image) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '') +
      '</span>' +
      '<span class="ai-chat-opt__copy">' +
        '<strong>' + escapeHtml(item.label) + '</strong>' +
        '<small>' + escapeHtml(item.hint || '') + '</small>' +
      '</span>' +
    '</button>';
  }

  function chatMetalOption(item) {
    var selected = Boolean(state.flags.touched.metal) && state.profile.metal === item.value;
    return '<button type="button" class="ai-chat-chip' + (selected ? ' is-selected' : '') +
      '" data-field="metal" data-value="' + escapeHtml(item.value) +
      '" aria-pressed="' + selected + '">' +
      '<span class="ai-choice__swatch ai-choice__swatch--' + escapeHtml(item.swatch) + '" aria-hidden="true"></span>' +
      '<span>' + escapeHtml(item.label) + '</span>' +
    '</button>';
  }

  function chatBudgetOption(option) {
    var selected = Boolean(state.flags.touched.budget) && state.profile.budget === option.value;
    return '<button type="button" class="ai-chat-chip ai-chat-chip--budget' + (selected ? ' is-selected' : '') +
      '" data-field="budget" data-value="' + escapeHtml(option.value) +
      '" data-budget-max="' + (option.max == null ? '' : escapeHtml(String(option.max))) +
      '" data-budget-label="' + escapeHtml(option.label) +
      '" aria-pressed="' + selected + '">' +
      '<span class="ai-chat-chip__dot" aria-hidden="true"></span>' +
      '<span>' + escapeHtml(option.label) + '</span>' +
    '</button>';
  }

  function chatSummaryHTML() {
    return '<div class="ai-chat__finish" id="ai-chat-finish">' +
      '<button type="button" class="ai-btn ai-btn--primary" id="ai-next-1">Continue to photo →</button>' +
      '<span class="ai-hint">Tap a chip in your profile if you want to change an answer.</span>' +
    '</div>';
  }

  function bindStageOne() {
    els.stage.querySelectorAll('[data-field]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var field = btn.dataset.field;
        var value = btn.dataset.value;
        if (!field || !value) return;
        applyChatAnswer(field, value, btn);
      });
    });

    var next = document.getElementById('ai-next-1');
    if (next) next.addEventListener('click', advanceFromProfile);
  }

  function applyChatAnswer(field, value, btn) {
    if (chatTyping) return;
    var changed = state.profile[field] !== value;
    state.profile[field] = value;

    if (field === 'budget') {
      state.profile.budgetMax = btn && btn.dataset.budgetMax ? Number(btn.dataset.budgetMax) : null;
      state.profile.budgetLabel = btn && btn.dataset.budgetLabel ? btn.dataset.budgetLabel : 'No limit';
    }

    state.flags.touched = state.flags.touched || {};
    state.flags.touched[field] = true;

    if (changed) invalidateRecommendations();
    if (state.chat && state.chat.editField === field) state.chat.editField = '';

    persist();
    chatScrollPending = true;

    if (prefersReducedMotion) {
      renderAll();
      return;
    }

    chatTyping = true;
    chatReveal = false;
    renderAll();

    var nextStep = chatStep();
    clearTimeout(chatTypingTimer);
    chatTypingTimer = setTimeout(function () {
      chatTyping = false;
      chatReveal = true;
      chatScrollPending = true;
      renderAll();
      chatTypingTimer = setTimeout(function () { chatReveal = false; }, 700);
    }, typingDelay(nextStep));
  }

  function cancelChatTyping() {
    chatTyping = false;
    chatReveal = false;
    clearTimeout(chatTypingTimer);
    chatTypingTimer = null;
  }

  function editChatField(field) {
    if (!field) return;
    cancelChatTyping();
    state.chat.editField = field;
    state.step = 1;
    persist();
    chatScrollPending = true;
    renderAll();
  }

  function scrollChatToLatest() {
    var target = document.querySelector('.ai-chat-bubble--typing') ||
      document.getElementById('ai-chat-options') ||
      document.getElementById('ai-chat-finish') ||
      document.getElementById('ai-chat-thread');
    if (!target) return;
    var navH = els.navbar ? els.navbar.offsetHeight : 0;
    var top = target.getBoundingClientRect().top + window.scrollY - navH - 18;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  function visualFor(name) {
    var products = getProducts();
    for (var i = 0; i < products.length; i += 1) {
      if (products[i].name === name) return productImage(products[i], 600);
    }
    return '';
  }

  /* ── Etapa 02 · Tonos ────────────────────── */

  function adviserGuideHTML(text) {
    if (!text) return '';
    return '<div class="ai-guide">' +
      '<span class="ai-guide__avatar" aria-hidden="true">A</span>' +
      '<div class="ai-guide__body">' +
        '<strong>Aguamarina Advisor</strong>' +
        '<p>' + escapeHtml(text) + '</p>' +
      '</div>' +
    '</div>';
  }

  /* ── Stage 02 · Photo ─────────────────────── */

  function standardTone() {
    var palette = E.PALETTES.neutro;
    return {
      undertone: 'neutro',
      palette: palette,
      depth: '',
      skinHex: '',
      source: 'estandar',
      confidence: 'standard',
      colors: []
    };
  }

  function setStandardTone() {
    state.tone = standardTone();
    state.toneNote = 'Neutral standard palette for the model path. The model’s skin was not analyzed.';
  }

  function hasPhoto(category) {
    if (category) return Boolean(photoFiles[category]);
    if (state.photoMode === 'model') return true;
    return Boolean(photoFiles.necklace || photoFiles.bracelet);
  }

  function photoConsent() {
    return state.photoMode === 'model' ? true : photoConsentGiven;
  }

  function photoStepReady() {
    if (!state.photoMode) return false;
    if (state.photoMode === 'model') {
      return Boolean(state.tone && state.tone.source === 'estandar');
    }
    return Boolean(state.tone && state.tone.source === 'youcam');
  }

  function advanceFromPhoto() {
    if (!state.photoMode) {
      showToast('First choose whether to use your photos or a model.');
      return;
    }
    if (state.photoMode === 'real') {
      if (!state.tone || state.tone.source !== 'youcam') {
        showToast('Analyze your tone with YouCam to continue with your photos.');
        return;
      }
    }
    if (!photoStepReady()) {
      showToast('Complete the photo to continue.');
      return;
    }
    simAutoPending = true;
    goStep(3);
  }

  function setPhotoMode(mode) {
    if (mode !== 'real' && mode !== 'model') return;
    if (state.photoMode === mode) return;

    stopCamera();
    toneToken += 1;
    vtoToken += 1;
    state.photoMode = mode;
    photoConsentGiven = mode === 'model';
    vtoConsent = mode === 'model';
    toneStatus = '';
    toneStatusError = false;
    vtoStatus = '';
    vtoStatusError = false;
    busy = null;

    if (mode === 'model') {
      setStandardTone();
      setModelPhotoEntries();
    } else {
      clearPhotoFiles();
      state.tone = null;
      state.toneNote = '';
    }

    resetSimulation();
    invalidateRecommendations();
    persist();
    renderAll();
  }

  function setModelPhotoEntries() {
    photoFiles.necklace = {
      file: null,
      previewUrl: DEMO_MODELS.necklace.src,
      source: 'model',
      label: DEMO_MODELS.necklace.label
    };
    photoFiles.bracelet = {
      file: null,
      previewUrl: DEMO_MODELS.bracelet.src,
      source: 'model',
      label: DEMO_MODELS.bracelet.label
    };
    syncActivePhoto();
    loadModelPhotos();
  }

  async function loadModelPhotos() {
    try {
      var pair = await Promise.all([
        loadSampleAsFile(DEMO_MODELS.necklace.src),
        loadSampleAsFile(DEMO_MODELS.bracelet.src)
      ]);
      if (state.photoMode !== 'model') return;
      if (photoFiles.necklace && photoFiles.necklace.source === 'model') {
        photoFiles.necklace.file = new File([pair[0]], 'model-necklace.jpg', { type: pair[0].type || 'image/jpeg' });
      }
      if (photoFiles.bracelet && photoFiles.bracelet.source === 'model') {
        photoFiles.bracelet.file = new File([pair[1]], 'model-bracelet.jpg', { type: 'image/jpeg' });
      }
      syncActivePhoto();
    } catch (err) {
      console.warn('Could not preload the model photos.', err);
    }
  }

  function clearPhotoFiles() {
    photoFiles.necklace = null;
    photoFiles.bracelet = null;
    syncActivePhoto();
  }

  function syncActivePhoto() {
    var product = selectedVtoProduct();
    var category = vtoCategoryOf(product);
    var entry = photoFiles[category];
    vtoFile = entry && entry.file ? entry.file : null;
    vtoPreviewUrl = entry && entry.previewUrl ? entry.previewUrl : '';
    vtoPhotoSource = entry && entry.source ? entry.source : '';
    vtoPhotoCategory = entry ? category : '';
    vtoPhotoLabel = entry && entry.label ? entry.label : '';
  }

  function renderStageTwo() {
    var head =
      '<header class="ai-stage__head">' +
        '<p class="ai-stage__eyebrow">Stage 02 · Your photo</p>' +
        '<h2 class="ai-stage__title" id="ai-stage-title" tabindex="-1">Choose how you want to <em>try them on</em></h2>' +
        '<p class="ai-stage__lead">Use your own photos or a model. The model path uses a neutral standard palette and does not analyze the model’s skin.</p>' +
      '</header>';

    if (!state.photoMode) {
      els.stage.innerHTML =
        '<section aria-labelledby="ai-stage-title">' + head +
          adviserGuideHTML('First choose a path. With your photos we analyze your real tone with YouCam; with a model we use ready-to-use photos and a neutral standard palette.') +
          photoModeCardsHTML() +
        '</section>';
      bindStageTwo();
      return;
    }

    if (state.photoMode === 'model') {
      els.stage.innerHTML =
        '<section aria-labelledby="ai-stage-title">' + head +
          adviserGuideHTML('These two photos are ready for the YouCam virtual try-on. The neutral palette is standard for the demo: the model’s skin is not analyzed.') +
          modelPanelHTML() +
        '</section>';
      bindStageTwo();
      return;
    }

    els.stage.innerHTML =
      '<section aria-labelledby="ai-stage-title">' + head +
        adviserGuideHTML('Upload a selfie and a photo of your wrist. The selfie is analyzed with YouCam and is required to continue; the wrist photo is only used for bracelets.') +
        realPanelHTML() +
      '</section>';
    bindStageTwo();
  }

  function photoModeCardsHTML() {
    return '<div class="ai-photo-mode">' +
      '<button type="button" class="ai-photo-mode__card" data-photo-mode="real">' +
        '<span class="ai-photo-mode__icon" aria-hidden="true">' +
          '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
            '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="12" cy="11" r="3.2"/><path d="M8 16.8c1-1.6 2.3-2.4 4-2.4s3 .8 4 2.4"/>' +
          '</svg>' +
        '</span>' +
        '<strong>Use my photos</strong>' +
        '<span>We analyze your tone with YouCam and use your photos in the try-on.</span>' +
        '<small>Selfie + hand</small>' +
      '</button>' +
      '<button type="button" class="ai-photo-mode__card" data-photo-mode="model">' +
        '<span class="ai-photo-mode__icon" aria-hidden="true">' +
          '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
            '<circle cx="12" cy="8" r="3.1"/><path d="M4.8 20c.7-3.7 3.2-5.6 7.2-5.6s6.5 1.9 7.2 5.6"/><path d="M3 8.5 5.5 6M21 8.5 18.5 6"/>' +
          '</svg>' +
        '</span>' +
        '<strong>Use a model</strong>' +
        '<span>Demo photos ready to simulate and a neutral standard palette.</span>' +
        '<small>No skin analysis</small>' +
      '</button>' +
    '</div>' +
    '<p class="ai-hint ai-photo-mode__hint">You can switch paths at any time. The model palette does not recolor the photo: it only guides recommendations.</p>';
  }

  function realPanelHTML() {
    var toneReady = Boolean(state.tone && state.tone.source === 'youcam');
    return '<div class="ai-photo-real">' +
      photoTipsHTML() +
      '<div class="ai-photo-grid">' +
        photoCardHTML('necklace', 'Selfie for necklaces', 'Front face, neck and shoulders visible.') +
        photoCardHTML('bracelet', 'Hand for bracelets', 'Back of the hand and full wrist.') +
      '</div>' +

      '<div class="ai-consent">' +
        '<input type="checkbox" id="ai-consent-selfie"' + (photoConsentGiven ? ' checked' : '') + '>' +
        '<label for="ai-consent-selfie"><strong>I authorize the use of these photos</strong> for tone analysis and try-on simulations with YouCam (Perfect Corp). They are not saved to the catalog or used for any other purpose.</label>' +
      '</div>' +

      (busy === 'tone' ? analysisStepsHTML() : '') +
      toneStatusHTML() +
      (toneReady ? toneResultHTML(state.tone) : '') +

      '<div class="ai-actions">' +
        '<button type="button" class="ai-btn ai-btn--primary" id="ai-next-2"' + (!photoStepReady() ? ' disabled' : '') + '>See my pieces →</button>' +
        '<button type="button" class="ai-btn ai-btn--ghost" id="ai-tone-run"' +
          (!photoFiles.necklace || !photoConsentGiven || busy === 'tone' || busy === 'photo' ? ' disabled' : '') + '>' +
          (toneReady ? 'Analyze my tone again' : 'Analyze my tone with YouCam') +
        '</button>' +
      '</div>' +

      '<p class="ai-hint">' + (toneReady
        ? 'Your tone has already been analyzed. You can change the selfie, but you will need to analyze it again.'
        : 'Tone analysis is required on the real-photo path. If it does not work, you can use a model.') + '</p>' +
      photoModeSwitchHTML('real') +
    '</div>';
  }

  function modelPanelHTML() {
    var tone = state.tone && state.tone.source === 'estandar' ? state.tone : standardTone();
    return '<div class="ai-model-panel">' +
      '<div class="ai-model-grid">' +
        modelPreviewHTML('necklace') +
        modelPreviewHTML('bracelet') +
      '</div>' +
      '<p class="ai-hint">The necklace and bracelet models are demo photos for the try-on. Their skin is not analyzed.</p>' +
      toneResultHTML(tone) +
      '<div class="ai-actions">' +
        '<button type="button" class="ai-btn ai-btn--primary" id="ai-next-2">See my pieces →</button>' +
      '</div>' +
      photoModeSwitchHTML('model') +
    '</div>';
  }

  function modelPreviewHTML(category) {
    var model = DEMO_MODELS[category];
    return '<figure class="ai-model-preview">' +
      '<img src="' + escapeHtml(model.src) + '" alt="' + escapeHtml(model.label) + '" loading="lazy">' +
      '<figcaption><strong>' + escapeHtml(model.label) + '</strong><span>' + escapeHtml(model.hint) + '</span></figcaption>' +
    '</figure>';
  }

  function photoModeSwitchHTML(active) {
    var other = active === 'real' ? 'model' : 'real';
    var label = other === 'model' ? 'Switch to a model' : 'Switch to my photos';
    return '<div class="ai-mode-switch">' +
      '<span>You are using ' + (active === 'real' ? 'your photos' : 'a model') + '.</span>' +
      '<button type="button" class="ai-btn ai-btn--ghost ai-btn--sm" data-photo-mode="' + other + '">' + label + '</button>' +
    '</div>';
  }

  function photoCardHTML(category, title, hint) {
    var entry = photoFiles[category];
    var preview = entry && entry.previewUrl;
    var sourceLabel = entry
      ? (entry.source === 'camera' ? 'Just taken' : entry.source === 'gallery' ? 'Gallery' : entry.source === 'model' ? 'Model' : 'Photo')
      : '';
    var outline = category === 'necklace'
      ? '<span class="ai-face-outline" aria-hidden="true"><span class="ai-face-outline__eyes"></span><span class="ai-face-outline__smile"></span></span>'
      : '<span class="ai-hand-outline" aria-hidden="true"><svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 12V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M14 12V7.5a1.5 1.5 0 0 1 3 0V14"/><path d="M17 11.5a1.5 1.5 0 0 1 3 0V16a5 5 0 0 1-5 5h-2.5a5 5 0 0 1-4.3-2.5L5 14.2a1.6 1.6 0 0 1 2.6-1.8L9 14"/></svg></span>';

    return '<article class="ai-photo-card' + (entry ? ' has-photo' : '') + '">' +
      '<div class="ai-photo-card__media">' +
        (entry && entry.previewUrl
          ? '<img src="' + escapeHtml(entry.previewUrl) + '" alt="' + escapeHtml(hint) + '">'
          : '<span class="ai-photo-card__empty">' + outline + '<span>Add a photo</span></span>') +
        (entry ? '<span class="ai-photo-card__tag">' + escapeHtml(sourceLabel) + '</span>' : '') +
      '</div>' +
      '<div class="ai-photo-card__body">' +
        '<h3>' + escapeHtml(category === 'necklace' ? 'Necklace selfie' : 'Bracelet photo') + '</h3>' +
        '<p>' + escapeHtml(hint) + '</p>' +
        '<div class="ai-photo-card__actions">' +
          '<label class="ai-btn ai-btn--ghost ai-btn--sm" for="ai-photo-input-' + category + '">Gallery</label>' +
          '<button type="button" class="ai-btn ai-btn--ghost ai-btn--sm" data-camera="' + category + '">Camera</button>' +
          (entry ? '<button type="button" class="ai-btn ai-btn--ghost ai-btn--sm" data-remove-photo="' + category + '">Remove</button>' : '') +
        '</div>' +
        '<input type="file" id="ai-photo-input-' + category + '" accept="image/jpeg,image/png" data-photo-input="' + category + '">' +
      '</div>' +
    '</article>';
  }

  function photoTipsHTML() {
    return '<div class="ai-photo-tips">' +
      photoTipHTML('Selfie', 'Neck and shoulders visible', 'selfie') +
      photoTipHTML('Wrist', 'Back of the hand and wrist', 'wrist') +
      photoTipHTML('Even light', 'No backlight or flash', 'light') +
      photoTipHTML('No filters', 'No dark glasses', 'filter') +
    '</div>';
  }

  function photoTipHTML(title, text, icon) {
    var icons = {
      selfie: '<circle cx="12" cy="8" r="3.2"/><path d="M5 20c.7-3.8 3-5.8 7-5.8s6.3 2 7 5.8"/>',
      wrist: '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 12V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M14 12V7.5a1.5 1.5 0 0 1 3 0V14"/><path d="M17 11.5a1.5 1.5 0 0 1 3 0V16a5 5 0 0 1-5 5h-2.5a5 5 0 0 1-4.3-2.5L5 14.2a1.6 1.6 0 0 1 2.6-1.8L9 14"/>',
      light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
      filter: '<circle cx="12" cy="12" r="8"/><path d="m5 5 14 14"/>'
    };
    return '<span class="ai-photo-tip">' +
      '<span class="ai-photo-tip__icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
        icons[icon] +
      '</svg></span>' +
      '<strong>' + escapeHtml(title) + '</strong><span>' + escapeHtml(text) + '</span>' +
    '</span>';
  }

  function toneStatusHTML() {
    if (!toneStatus) return '';
    var spinner = busy === 'tone' || busy === 'photo';
    return '<p class="ai-status' + (toneStatusError ? ' is-error' : '') + '">' +
      (spinner ? '<span class="ai-spinner" aria-hidden="true"></span> ' : '') +
      escapeHtml(toneStatus) +
      (toneStatusError ? ' <button type="button" class="ai-btn ai-btn--ghost ai-btn--sm" id="ai-tone-retry">Retry</button>' : '') +
    '</p>';
  }

  function analysisStepsHTML() {
    return '<div class="ai-analysis-steps">' +
      '<span class="is-done">1 · Photo</span>' +
      '<span class="is-active"><span class="ai-spinner"></span>2 · Tone</span>' +
      '<span>3 · Palette</span>' +
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
    var sourceLabel = source === 'youcam' ? 'YouCam API' : source === 'manual' ? 'Manual choice' : source === 'estandar' ? 'Standard palette' : source === 'reference' ? 'Reference image' : 'Local reading';
    var badgeClass = source === 'youcam' ? ' ai-badge--youcam' : ' ai-badge--local';
    var title = source === 'manual'
      ? palette.short + ' palette · chosen by hand'
      : source === 'estandar'
        ? palette.short + ' palette · model standard'
        : palette.short + ' palette' + (tone.depth ? ' · ' + tone.depth + ' skin' : '');

    var note = state.toneNote || defaultToneNote(tone);
    var gradient = swatches.map(function (item) { return item.hex; }).join(', ');

    return '<div class="ai-tone ai-tone--' + palette.key + '">' +
      '<div class="ai-tone__top">' +
        '<div>' +
          '<p class="ai-tone__eyebrow">Your guiding palette</p>' +
          '<h3 class="ai-tone__title">' + escapeHtml(title) + '</h3>' +
        '</div>' +
        '<span class="ai-badge' + badgeClass + '">' + escapeHtml(sourceLabel) + '</span>' +
      '</div>' +
      '<p class="ai-tone__text">' + escapeHtml(palette.text) + '</p>' +
      '<div class="ai-palette-bar" style="background:linear-gradient(90deg, ' + escapeHtml(gradient) + ')" aria-hidden="true"></div>' +
      '<div class="ai-palette">' +
        swatches.map(function (item) {
          return '<span class="ai-swatch" title="' + escapeHtml(item.label) + '">' +
            '<span class="ai-swatch__dot" style="background:' + escapeHtml(item.hex) + '"></span>' +
            '<span class="ai-swatch__label">' + escapeHtml(item.label) + '</span>' +
          '</span>';
        }).join('') +
      '</div>' +
      '<p class="ai-tone__sub">Metals that may suit you</p>' +
      '<div class="ai-metal-list">' +
        palette.metals.map(function (metal) {
          return '<span class="ai-metal"><i style="background:' + metalSwatchColor(metal) + '"></i>' + escapeHtml(metal) + '</span>';
        }).join('') +
      '</div>' +
      '<div class="ai-tone__foot">' +
        '<span>' + escapeHtml(note) + '</span>' +
      '</div>' +
    '</div>';
  }

  function metalSwatchColor(metal) {
    var value = String(metal || '').toLowerCase();
    if (value.indexOf('rose') !== -1 || value.indexOf('rosa') !== -1) return '#D9A7A0';
    if (value.indexOf('silver') !== -1 || value.indexOf('platinum') !== -1 || value.indexOf('white') !== -1) return '#B8C6D9';
    if (value.indexOf('bronze') !== -1 || value.indexOf('copper') !== -1) return '#A9714B';
    if (value.indexOf('champagne') !== -1) return '#E3C9A8';
    return '#C9A55A';
  }

  function defaultToneNote(tone) {
    if (tone.source === 'youcam') {
      return 'Colors read by YouCam API. The recommendation cross-checks that reading with the catalog tones.';
    }
    if (tone.source === 'estandar') {
      return 'Neutral standard palette for the model path. The model’s skin was not analyzed.';
    }
    if (tone.source === 'manual') {
      return 'You chose this palette. The adviser uses it as a starting point, not a label.';
    }
    if (tone.source === 'reference') {
      return 'Reading from a reference image. Light and framing can affect the result.';
    }
    return 'Local guiding reading. Light and framing can affect it: if it does not feel right, try another image.';
  }

  function bindStageTwo() {
    els.stage.querySelectorAll('[data-photo-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () { setPhotoMode(btn.dataset.photoMode); });
    });

    els.stage.querySelectorAll('[data-photo-input]').forEach(function (input) {
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        selectRealPhoto(input.dataset.photoInput, file, 'gallery');
      });
    });

    els.stage.querySelectorAll('[data-camera]').forEach(function (btn) {
      btn.addEventListener('click', function () { openCamera(btn.dataset.camera); });
    });

    els.stage.querySelectorAll('[data-remove-photo]').forEach(function (btn) {
      btn.addEventListener('click', function () { removePhoto(btn.dataset.removePhoto); });
    });

    var consent = document.getElementById('ai-consent-selfie');
    if (consent) {
      consent.addEventListener('change', function () {
        photoConsentGiven = consent.checked;
        vtoConsent = consent.checked;
        persist();
        renderStage();
        renderMobileBar();
      });
    }

    var run = document.getElementById('ai-tone-run');
    if (run) run.addEventListener('click', runToneAnalysis);

    var retry = document.getElementById('ai-tone-retry');
    if (retry) retry.addEventListener('click', runToneAnalysis);

    var next = document.getElementById('ai-next-2');
    if (next) next.addEventListener('click', advanceFromPhoto);
  }

  async function selectRealPhoto(category, file, source) {
    try {
      validatePhoto(file, MAX_PHOTO);
      busy = 'photo';
      toneStatus = 'Preparing the photo…';
      toneStatusError = false;
      renderStage();

      var resized = await resizePhoto(file, VTO_MAX_EDGE, VTO_MAX_INPUT);
      if (category === 'necklace' && canDetectFaces()) {
        var faceBox = await detectFaceBox(resized.canvas);
        if (!faceBox) {
          throw new Error('We could not detect a face. Use a front-facing selfie with your neck and shoulders visible.');
        }
      }

      if (state.photoMode !== 'real') {
        clearPhotoFiles();
        state.photoMode = 'real';
        photoConsentGiven = false;
        vtoConsent = false;
        state.tone = null;
        state.toneNote = '';
      }

      var name = category === 'necklace' ? 'selfie.jpg' : 'wrist.jpg';
      var processed = new File([resized.blob], name, { type: 'image/jpeg' });
      photoFiles[category] = {
        file: processed,
        previewUrl: resized.dataUrl,
        source: source,
        label: source === 'camera' ? 'Just taken' : 'Gallery'
      };

      if (category === 'necklace') {
        state.tone = null;
        state.toneNote = '';
        toneStatus = 'Selfie ready. Analyze your tone with YouCam to continue.';
        toneStatusError = false;
        invalidateRecommendations();
      } else if (state.tone && state.tone.source === 'youcam') {
        toneStatus = '';
        toneStatusError = false;
      } else if (photoFiles.necklace) {
        toneStatus = 'Selfie ready. Analyze your tone with YouCam to continue.';
        toneStatusError = false;
      } else {
        toneStatus = 'Add a selfie to analyze your tone.';
        toneStatusError = false;
      }

      vtoConsent = photoConsentGiven;
      resetSimulation();
      syncActivePhoto();
      persist();
      busy = null;
      renderAll();
    } catch (err) {
      busy = null;
      toneStatus = err && err.message ? err.message : 'We could not prepare that photo.';
      toneStatusError = true;
      persist();
      renderStage();
      showToast(toneStatus);
    }
  }

  function removePhoto(category) {
    photoFiles[category] = null;
    if (category === 'necklace') {
      state.tone = null;
      state.toneNote = '';
      toneStatus = 'Add a new selfie and analyze your tone to continue.';
      toneStatusError = false;
      invalidateRecommendations();
    }
    resetSimulation();
    syncActivePhoto();
    persist();
    renderAll();
  }

  async function runToneAnalysis() {
    var entry = photoFiles.necklace;
    if (!entry || !entry.file) {
      showToast('Upload a selfie first.');
      return;
    }
    if (!photoConsentGiven) {
      showToast('Check the consent box to analyze your photos.');
      return;
    }
    if (!/^https?:$/.test(window.location.protocol)) {
      toneStatus = 'Tone analysis needs the site served from Cloudflare Pages or a local server.';
      toneStatusError = true;
      renderStage();
      return;
    }

    var token = ++toneToken;
    busy = 'tone';
    toneStatus = 'Analyzing your selfie with YouCam…';
    toneStatusError = false;
    renderStage();

    try {
      var resized = await resizePhoto(entry.file, TONE_MAX_EDGE);
      if (token !== toneToken) return;
      if (canDetectFaces()) {
        var faceBox = await detectFaceBox(resized.canvas);
        if (!faceBox) {
          throw new Error('We could not detect a face. Use a front-facing selfie with your neck and shoulders visible.');
        }
      }

      var color = await requestYouCamTone(resized.blob, token);
      if (!color || token !== toneToken) return;
      state.tone = E.toneFromYouCam(color);
      state.toneNote = 'YouCam read the colors of your face. The palette is a styling guide, not a label.';
      invalidateRecommendations();
      persist();
      busy = null;
      toneStatus = '';
      toneStatusError = false;
      vtoConsent = photoConsentGiven;
      renderAll();
    } catch (err) {
      if (token !== toneToken) return;
      state.tone = null;
      state.toneNote = '';
      busy = null;
      toneStatus = friendlyToneError(err);
      toneStatusError = true;
      persist();
      renderStage();
      renderProfile();
    }
  }

  function friendlyToneError(err) {
    var text = String((err && err.message) || '').toLowerCase();
    if (text.indexOf('face') !== -1 || text.indexOf('detect') !== -1) {
      return 'We could not detect your face clearly. Try a front-facing selfie with your neck and shoulders visible and good light.';
    }
    if (text.indexOf('dark') !== -1) {
      return 'The photo is too dark. Find even light in front of you and try again.';
    }
    if (text.indexOf('timeout') !== -1 || text.indexOf('slow') !== -1) {
      return 'The analysis took too long. Try again or use a model to continue.';
    }
    return (err && err.message) ? err.message : 'We could not analyze your tone. Try another selfie or use a model.';
  }

  function canDetectFaces() {
    return 'FaceDetector' in window;
  }

  async function loadSampleAsFile(url) {
    var res = await fetch(url);
    if (!res.ok) throw new Error('We could not load the demo photo.');
    var blob = await res.blob();
    var name = (url.split('/').pop() || 'model.jpg');
    return new File([blob], name, { type: blob.type || 'image/jpeg' });
  }

  /* ── Guided camera ───────────────────────── */

  function ensureCameraModal() {
    var modal = document.getElementById('ai-camera');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'ai-camera';
    modal.className = 'ai-camera';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Take a photo');
    modal.innerHTML =
      '<div class="ai-camera__panel">' +
        '<div class="ai-camera__head">' +
          '<strong id="ai-camera-title">Take a photo</strong>' +
          '<button type="button" class="ai-camera__close" id="ai-camera-close" aria-label="Close">×</button>' +
        '</div>' +
        '<div class="ai-camera__video-wrap">' +
          '<video id="ai-camera-video" playsinline muted autoplay></video>' +
          '<div class="ai-camera__guide" id="ai-camera-guide" aria-hidden="true"></div>' +
        '</div>' +
        '<p class="ai-camera__hint" id="ai-camera-hint"></p>' +
        '<p class="ai-camera__status" id="ai-camera-status" role="status" aria-live="polite"></p>' +
        '<div class="ai-camera__actions">' +
          '<button type="button" class="ai-btn ai-btn--primary" id="ai-camera-capture">Take photo</button>' +
          '<button type="button" class="ai-btn ai-btn--ghost" id="ai-camera-cancel">Cancel</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    document.getElementById('ai-camera-close').addEventListener('click', stopCamera);
    document.getElementById('ai-camera-cancel').addEventListener('click', stopCamera);
    document.getElementById('ai-camera-capture').addEventListener('click', captureCameraPhoto);
    modal.addEventListener('click', function (event) {
      if (event.target === modal) stopCamera();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && modal.classList.contains('is-open')) stopCamera();
    });
    return modal;
  }

  async function openCamera(category) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('The camera is not available in this browser. Try the gallery.');
      return;
    }

    var modal = ensureCameraModal();
    var video = document.getElementById('ai-camera-video');
    var guide = document.getElementById('ai-camera-guide');
    var title = document.getElementById('ai-camera-title');
    var hint = document.getElementById('ai-camera-hint');
    var status = document.getElementById('ai-camera-status');
    var capture = document.getElementById('ai-camera-capture');

    cameraCategory = category;
    title.textContent = category === 'necklace' ? 'Selfie for necklaces' : 'Hand for bracelets';
    hint.textContent = category === 'necklace'
      ? 'Place your eyes inside the oval and keep your neck and shoulders visible.'
      : 'Show the back of your hand and full wrist, with a plain background if possible.';
    status.textContent = 'Starting the camera…';
    guide.className = 'ai-camera__guide ai-camera__guide--' + category;
    capture.disabled = true;
    modal.classList.add('is-open');
    document.body.classList.add('ai-camera-open');

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: category === 'necklace' ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 960 }
        }
      });
      video.srcObject = cameraStream;
      await video.play().catch(function () {});
      status.textContent = 'When the framing looks right, take the photo.';
      capture.disabled = false;
    } catch (err) {
      status.textContent = 'We could not open the camera. Check the permission or use the gallery.';
      showToast('We could not open the camera. You can upload the photo from the gallery.');
      setTimeout(stopCamera, 1600);
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(function (track) { track.stop(); });
      cameraStream = null;
    }
    var modal = document.getElementById('ai-camera');
    if (modal) modal.classList.remove('is-open');
    document.body.classList.remove('ai-camera-open');
    var video = document.getElementById('ai-camera-video');
    if (video) video.srcObject = null;
    cameraCategory = '';
  }

  function captureCameraPhoto() {
    var video = document.getElementById('ai-camera-video');
    var status = document.getElementById('ai-camera-status');
    if (!video || !video.videoWidth || !video.videoHeight) {
      if (status) status.textContent = 'The camera is not ready yet. Wait a second.';
      return;
    }
    var category = cameraCategory;
    var canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(function (blob) {
      if (!blob) {
        if (status) status.textContent = 'We could not capture the photo. Try again.';
        return;
      }
      var file = new File([blob], category === 'necklace' ? 'selfie-camera.jpg' : 'wrist-camera.jpg', { type: 'image/jpeg' });
      stopCamera();
      selectRealPhoto(category, file, 'camera');
    }, 'image/jpeg', 0.9);
  }


  /* ── Etapa 03 · Piezas ───────────────────── */

  function renderStageThree() {
    var recs = getRecItems();

    if (state.recError) {
      els.stage.innerHTML =
        '<section aria-labelledby="ai-stage-title">' +
          '<header class="ai-stage__head">' +
            '<p class="ai-stage__eyebrow">Stage 03 · Find your accessories</p>' +
            '<h2 class="ai-stage__title" id="ai-stage-title" tabindex="-1">We couldn’t see the <em>catalog</em></h2>' +
          '</header>' +
          '<div class="ai-empty">' +
            '<div class="ai-empty__icon" aria-hidden="true">💎</div>' +
            '<p class="ai-empty__title">The catalog didn’t respond</p>' +
            '<p class="ai-empty__text">Check your connection and try again. Your profile and palette are still saved.</p>' +
            '<div class="ai-actions ai-actions--end">' +
              '<button type="button" class="ai-btn ai-btn--primary" id="ai-retry-products">Retry</button>' +
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
            showToast('We still can’t load the catalog.');
          }
        });
      }
      return;
    }

    if (!recs.length) {
      els.stage.innerHTML =
        '<section aria-labelledby="ai-stage-title">' +
          '<header class="ai-stage__head">' +
            '<p class="ai-stage__eyebrow">Stage 03 · Find your accessories</p>' +
            '<h2 class="ai-stage__title" id="ai-stage-title" tabindex="-1">Let’s look for another <em>combination</em></h2>' +
          '</header>' +
          '<div class="ai-empty">' +
            '<div class="ai-empty__icon" aria-hidden="true">✨</div>' +
            '<p class="ai-empty__title">We didn’t find pieces with that filter</p>' +
            '<p class="ai-empty__text">Try raising the budget or choosing “both” in step 1.</p>' +
            '<div class="ai-actions ai-actions--end">' +
              '<button type="button" class="ai-btn ai-btn--ghost" data-goto="1">Adjust my profile</button>' +
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
    var summary = 'your ' + E.LABELS.style[p.style] + ' style for ' + E.LABELS.occasion[p.occasion] +
      (tone ? ' and your ' + tone.palette.short + ' palette' : '');

    els.stage.innerHTML =
      '<section aria-labelledby="ai-stage-title">' +
        '<header class="ai-stage__head">' +
          '<p class="ai-stage__eyebrow">Stage 03 · Find your accessories</p>' +
          '<h2 class="ai-stage__title" id="ai-stage-title" tabindex="-1">These pieces <em>could be for you</em></h2>' +
          '<p class="ai-stage__lead">I matched ' + escapeHtml(summary) + ' with ' + state.recCount +
            ' pieces from the real catalog. I suggest three angles: your best match, an alternative and something different.</p>' +
        '</header>' +
        adviserGuideHTML('Start with your best match, compare the alternative and look at the different one as a way to step outside the obvious. The exact metal of each piece is confirmed on the product page or via WhatsApp.') +

        '<div class="ai-recos">' +
          recs.map(function (item) { return recoCardHTML(item); }).join('') +
        '</div>' +
        '<p class="ai-hint" style="margin-top:12px">The exact metal of each piece is confirmed on the product page or via WhatsApp.</p>' +

        askHTML() +

        '<div class="ai-actions">' +
          '<button type="button" class="ai-btn ai-btn--ghost" id="ai-other-recos">See other suggestions</button>' +
        '</div>' +
        simulationSectionHTML() +
        savedLooksHTML() +
      '</section>';

    bindStageThree();

    if (simAutoPending) {
      var autoRecs = getRecItems();
      if (autoRecs.length) {
        simAutoPending = false;
        setTimeout(function () {
          if (state.step === 3 && !busy) simulateProduct(autoRecs[0].product.id);
        }, 40);
      }
    }
  }

  function simulationSectionHTML() {
    syncActivePhoto();
    var product = selectedVtoProduct();
    if (!product) return '';
    var hasResult = Boolean(state.vto.resultUrl && String(state.vto.productId) === String(product.id));
    var category = product.category === 'collares' ? 'Necklace' : 'Bracelet';
    return '<div class="ai-sim">' +
      '<div class="ai-sim__head">' +
        '<p class="ai-stage__eyebrow">Simulation · YouCam API</p>' +
        '<h3 class="ai-sim__title">' + category + ' · ' + escapeHtml(product.name) + '</h3>' +
        '<p class="ai-sim__price">' + escapeHtml(priceLabel(product.price)) + '</p>' +
      '</div>' +
      (hasResult ? simulationResultHTML(product) : simulationPendingHTML(product)) +
    '</div>';
  }

  function simulationResultHTML(product) {
    return '<div class="ai-vto__result">' +
      '<img class="ai-vto__result-img" src="' + escapeHtml(state.vto.resultUrl) + '" alt="Simulation of ' + escapeHtml(product.name) + '">' +
      '<div class="ai-vto__result-bar">' +
        '<span class="ai-result-badge">✦ YouCam API</span>' +
        '<span class="ai-hint">The simulation image may expire.</span>' +
      '</div>' +
      '<div class="ai-actions">' +
        '<button type="button" class="ai-btn ai-btn--primary" id="ai-save-vto">Save to favorites</button>' +
        '<a class="ai-btn ai-btn--wa" href="' + escapeHtml(whatsappProductUrl(product, 'consulta')) + '" target="_blank" rel="noopener noreferrer">Check availability</a>' +
        '<a class="ai-btn ai-btn--ghost" href="' + escapeHtml(whatsappProductUrl(product, 'compra')) + '" target="_blank" rel="noopener noreferrer">Buy via WhatsApp</a>' +
      '</div>' +
    '</div>';
  }

  function demoModelsHTML(category) {
    var order = category === 'bracelet' ? ['bracelet', 'necklace'] : ['necklace', 'bracelet'];
    var cards = order.map(function (value) {
      var model = DEMO_MODELS[value];
      var selected = vtoPhotoSource === 'model' && vtoPhotoCategory === value;
      return '<button type="button" class="ai-vto-model' + (selected ? ' is-selected' : '') + '" data-vto-model="' + value + '" aria-pressed="' + (selected ? 'true' : 'false') + '">' +
        '<img src="' + model.src + '" alt="" loading="lazy">' +
        '<span class="ai-vto-model__copy"><strong>' + escapeHtml(model.label) + '</strong><small>' + escapeHtml(model.hint) + '</small></span>' +
      '</button>';
    }).join('');
    return '<div class="ai-vto__models">' +
      '<p class="ai-vto__models-title">Rather not use your photo? Try a demo model:</p>' +
      '<div class="ai-vto__models-row">' + cards + '</div>' +
    '</div>';
  }

  function simulationPendingHTML(product) {
    var category = product.category === 'collares' ? 'necklace' : 'bracelet';
    var entry = photoFiles[category];
    var needsPhoto = !entry;
    var canGenerate = Boolean(vtoFile) || Boolean(entry && entry.source === 'model');
    var missingText = category === 'necklace'
      ? 'To try this necklace on, we need a selfie with your neck and shoulders visible.'
      : 'To try this bracelet on, we need a photo of the back of your hand and wrist.';
    if (vtoStatusError) {
      return '<div class="ai-sim__pending">' +
        '<p class="ai-status is-error">' + escapeHtml(vtoStatus) + '</p>' +
        vtoPreviewHTML() +
        demoModelsHTML(category) +
        '<button type="button" class="ai-btn ai-btn--primary" id="ai-sim-photo">Change photo</button>' +
        '<button type="button" class="ai-btn ai-btn--ghost" id="ai-sim-run"' + (!canGenerate ? ' disabled' : '') + '>Retry</button>' +
      '</div>';
    }
    var msg = (busy === 'vto' || busy === 'model')
      ? '<span class="ai-spinner" aria-hidden="true"></span> ' + (busy === 'model' ? 'Loading model…' : 'Generating simulation…')
      : escapeHtml(vtoStatus || (needsPhoto ? missingText : 'Your photo is ready. Generate the simulation whenever you like.'));
    return '<div class="ai-sim__pending">' +
      '<p class="ai-status">' + msg + '</p>' +
      demoModelsHTML(category) +
      vtoPreviewHTML() +
      '<button type="button" class="ai-btn ai-btn--primary" id="ai-sim-run"' + (busy === 'vto' || busy === 'model' || !canGenerate || !vtoConsent ? ' disabled' : '') + '>Generate simulation</button>' +
      '<button type="button" class="ai-btn ai-btn--ghost" id="ai-sim-photo">Change photo</button>' +
    '</div>';
  }

  function simulateProduct(id) {
    if (!id) return;
    var nextId = String(id);
    if (state.vto.productId === nextId && state.vto.resultUrl) return;
    selectVtoProduct(nextId);
    renderStage();
    runVto();
  }

  function roleLabel(role) {
    return role === 'best'
      ? 'Your best match'
      : role === 'alternative'
        ? 'An alternative'
        : role === 'wildcard'
          ? 'Something different'
          : 'Another option';
  }

  function roleHint(role) {
    return role === 'best'
      ? 'The one that best matches your profile.'
      : role === 'alternative'
        ? 'Another angle within what you like.'
        : role === 'wildcard'
          ? 'To step a little outside your comfort zone.'
          : '';
  }

  function recoCardHTML(item) {
    var product = item.product;
    var image = productImage(product, 400);
    var category = product.category === 'collares' ? 'Necklace' : 'Bracelet';
    var why = item.why || E.whyFor(item);
    var role = item.role || 'more';
    var hint = roleHint(role);

    return '<article class="ai-reco ai-reco--' + escapeHtml(role) + '">' +
      '<div class="ai-reco__media">' +
        '<img class="ai-reco__img" src="' + escapeHtml(image) + '" alt="' + escapeHtml(product.name) + '" loading="eager" ' +
          'onerror="this.src=\'https://placehold.co/400x400/D6F2EE/1A8A78?text=%E2%9C%A8\'">' +
        '<span class="ai-reco__role">' + escapeHtml(roleLabel(role)) + '</span>' +
        '<span class="ai-reco__cat">' + category + '</span>' +
      '</div>' +
      '<div class="ai-reco__body">' +
        '<h3 class="ai-reco__name">' + escapeHtml(product.name) + '</h3>' +
        '<p class="ai-reco__price">' + escapeHtml(priceLabel(product.price)) + '</p>' +
        (product.description ? '<p class="ai-reco__desc">' + escapeHtml(product.description) + '</p>' : '') +
        '<p class="ai-reco__label">Why I recommend it</p>' +
        '<p class="ai-reco__why">' + escapeHtml(why) + '</p>' +
        (hint ? '<p class="ai-reco__note">' + escapeHtml(hint) + '</p>' : '') +
        '<div class="ai-reco__actions">' +
          '<button type="button" class="ai-mini ai-mini--try" data-try="' + escapeHtml(product.id) + '">Try on</button>' +
          '<a class="ai-mini ai-mini--ghost" href="product.html?id=' + encodeURIComponent(product.id) + '">Details</a>' +
          '<button type="button" class="ai-mini ai-mini--save" data-save="' + escapeHtml(product.id) + '">Favorite</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function askHTML() {
    return '<div class="ai-ask">' +
      '<div class="ai-ask__head">' +
        '<span class="ai-ask__avatar" aria-hidden="true">A</span>' +
        '<div><strong>Ask the advisor</strong><span>Quick answers about these pieces</span></div>' +
      '</div>' +
      '<div class="ai-ask__chips">' +
        '<button type="button" data-ask="best">Which one do you recommend?</button>' +
        '<button type="button" data-ask="budget">Is there anything more affordable?</button>' +
        '<button type="button" data-ask="metal">What metal are they?</button>' +
        '<button type="button" data-ask="combine">What do they go with?</button>' +
      '</div>' +
      '<p class="ai-ask__answer" id="ai-ask-answer" role="status" aria-live="polite"></p>' +
    '</div>';
  }

  function answerAdviserQuestion(kind) {
    var recs = getRecItems();
    if (!recs.length) return '';
    var best = recs[0];
    var p = state.profile;
    var answer = '';

    if (kind === 'best') {
      answer = 'My top pick is ' + best.product.name + ': ' + (best.why || E.whyFor(best)) +
        ' If you like, we can try it on right now.';
    } else if (kind === 'budget') {
      var cheapest = recs.slice().sort(function (a, b) {
        return Number(a.product.price) - Number(b.product.price);
      })[0];
      answer = 'The most affordable in this selection is ' + cheapest.product.name +
        ' (' + priceLabel(cheapest.product.price) + '). If you adjust the budget in step 1, I’ll cross-check the catalog again.';
    } else if (kind === 'metal') {
      var known = recs.map(function (item) {
        return item.tags && item.tags.metal ? item.product.name + ': ' + E.LABELS.metal[item.tags.metal] : '';
      }).filter(Boolean);
      answer = known.length
        ? 'From the catalog information: ' + known.join('; ') + '. The exact metal is confirmed on the product page or via WhatsApp.'
        : 'The catalog doesn’t always list the metal of each piece. I don’t want to make it up: we’ll confirm it via WhatsApp before you buy.';
    } else if (kind === 'combine') {
      answer = 'For ' + E.LABELS.occasion[p.occasion] + ' (' + E.LABELS.style[p.style] + '), I’d wear it ' + (best.product.category === 'collares'
          ? 'as the standout piece at the neckline, with a plain top or a dress in a tone of ' + (state.tone ? state.tone.palette.colors[0].toLowerCase() : 'neutral') + '.'
          : 'alone or with another thin bracelet, letting the wrist have a point of light.') +
        ' It’s aesthetic guidance, not a rule.';
    }

    if (answer) {
      var slot = document.getElementById('ai-ask-answer');
      if (slot) slot.textContent = answer;
    }
    return answer;
  }

  function bindStageThree() {
    els.stage.querySelectorAll('[data-try]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        simulateProduct(btn.dataset.try);
        setTimeout(function () {
          var sim = document.querySelector('.ai-sim');
          if (sim) sim.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      });
    });

    var simRun = document.getElementById('ai-sim-run');
    if (simRun) simRun.addEventListener('click', runVto);

    var simPhoto = document.getElementById('ai-sim-photo');
    if (simPhoto) simPhoto.addEventListener('click', function () { goStep(2); });

    els.stage.querySelectorAll('[data-vto-model]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        useModelPhoto(btn.dataset.vtoModel);
      });
    });

    var simSave = document.getElementById('ai-save-vto');
    if (simSave) simSave.addEventListener('click', function () {
      var product = selectedVtoProduct();
      if (!product || !state.vto.resultUrl) return;
      saveLook(product, state.vto.resultUrl);
      simSave.textContent = 'Saved ✓';
      simSave.disabled = true;
    });

    els.stage.querySelectorAll('[data-save]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var product = productById(btn.dataset.save);
        if (!product) return;
        saveLook(product, '');
        btn.textContent = 'Saved ✓';
        btn.disabled = true;
      });
    });

    var other = document.getElementById('ai-other-recos');
    if (other) {
      other.addEventListener('click', function () {
        state.altIndex += 3;
        generateRecommendations(false);
        persist();
        renderStage();
      });
    }

    els.stage.querySelectorAll('[data-ask]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        answerAdviserQuestion(btn.dataset.ask);
      });
    });
  }

  function signature() {
    return JSON.stringify({
      profile: state.profile,
      tone: state.tone ? state.tone.undertone + '|' + state.tone.source : '',
      alt: state.altIndex
    });
  }

  function ensureRecommendations(announce) {
    if (!profileReady() || booting) return;

    var sig = signature();
    var valid = state.recommendations.length && state.recommendations.every(function (rec) {
      return Boolean(productById(rec.productId)) && Boolean(rec.role) && Boolean(rec.tags);
    });

    if (!valid || state.recSignature !== sig) {
      generateRecommendations(announce);
    }
  }

  function generateRecommendations(announce) {
    var products = getProducts();
    if (!products.length) {
      state.recommendations = [];
      state.recError = 'We couldn’t load the catalog.';
      persist();
      return;
    }

    var ranked = E.rankProducts(products, state.profile, state.tone);
    var offset = ranked.length ? state.altIndex % ranked.length : 0;
    var pool = ranked.slice(offset).concat(ranked.slice(0, offset));
    var curated = E.curateRecommendations(pool, state.profile, 3);

    state.recommendations = curated.map(function (item) {
      return {
        productId: String(item.product.id),
        reasons: item.reasons,
        why: item.why || E.whyFor(item),
        score: item.score,
        role: item.role,
        tags: item.tags
      };
    });
    state.recCount = ranked.length;
    state.recSignature = signature();
    state.recError = '';
    persist();

    if (announce && !state.flags.reco) {
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
        score: rec.score || 0,
        role: rec.role || 'more',
        tags: rec.tags || E.tagsFor(product)
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
            '<p class="ai-stage__eyebrow">Stage 04 · Try them on virtually</p>' +
            '<h2 class="ai-stage__title" id="ai-stage-title" tabindex="-1">Your <em>saved</em> look</h2>' +
            '<p class="ai-stage__lead">There are no active recommendations yet, but you can check what you already saved.</p>' +
          '</header>' +
          adviserGuideHTML('There are no active pieces to try on yet. You can go back to your recommendations or review the looks you saved.') +
          saved +
          '<div class="ai-actions">' +
            '<button type="button" class="ai-btn ai-btn--primary" data-goto="3">Back to my recommendations</button>' +
            '<a class="ai-btn ai-btn--ghost" href="index.html">View catalog</a>' +
          '</div>' +
        '</section>';
      bindStageFour();
      return;
    }

    var product = selectedVtoProduct();
    if (!product) product = recs[0].product;
    var category = product.category === 'collares' ? 'Necklace' : 'Bracelet';
    var canTry = canTryOn(product);
    var hasResult = Boolean(state.vto.resultUrl && String(state.vto.productId) === String(product.id));
    var guide = product.category === 'collares'
      ? 'For a necklace we use your selfie with neck and shoulders visible. If you switch to a bracelet, we keep your hand photo.'
      : 'For a bracelet we use your photo of the back of your hand and wrist. If you switch to a necklace, we keep your selfie.';
    if (hasResult) {
      guide = 'This is your virtual try-on. If you want to see it with different light or framing, try another photo; we keep the photo for the other category.';
    }

    els.stage.innerHTML =
      '<section aria-labelledby="ai-stage-title">' +
        '<header class="ai-stage__head">' +
          '<p class="ai-stage__eyebrow">Stage 04 · Try them on virtually</p>' +
          '<h2 class="ai-stage__title" id="ai-stage-title" tabindex="-1">Now <em>let’s try it on</em></h2>' +
          '<p class="ai-stage__lead">Choose one of your pieces and upload the matching photo. YouCam generates the visualization; the photo is used only for this try-on.</p>' +
        '</header>' +
        adviserGuideHTML(guide) +

        '<div class="ai-vto__picker" role="group" aria-label="Choose a piece to try on">' +
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
        '<p class="ai-hint ai-vto__photo-note">If you switch to another piece of the same type, we keep your photo. If you go from necklace to bracelet, we’ll ask for the matching photo.</p>' +

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
      ? 'Front-facing selfie with neck and shoulders visible. Keep hair away from the neckline and look for even light.'
      : 'Photo of the back of your hand and wrist, fingers visible. No rings in the way and a plain background.';
    if (hasResult) {
      return '<div class="ai-vto__result">' +
        '<img class="ai-vto__result-img" src="' + escapeHtml(state.vto.resultUrl) + '" alt="Virtual try-on of ' + escapeHtml(product.name) + '">' +
        '<div class="ai-vto__result-bar">' +
          '<span class="ai-result-badge">✦ YouCam API</span>' +
          '<span class="ai-hint">The try-on image may expire.</span>' +
        '</div>' +
        '<div class="ai-actions">' +
          '<button type="button" class="ai-btn ai-btn--primary" id="ai-save-vto">Save to favorites</button>' +
          '<a class="ai-btn ai-btn--wa" href="' + escapeHtml(whatsappProductUrl(product, 'consulta')) + '" target="_blank" rel="noopener noreferrer">Check availability</a>' +
          '<a class="ai-btn ai-btn--ghost" href="' + escapeHtml(whatsappProductUrl(product, 'compra')) + '" target="_blank" rel="noopener noreferrer">Buy via WhatsApp</a>' +
          '<button type="button" class="ai-btn ai-btn--ghost" id="ai-retry-vto">Try with another photo</button>' +
        '</div>' +
      '</div>';
    }

    return '<div class="ai-vto__grid">' +
      '<div>' +
        demoModelsHTML(category) +
        '<div class="ai-consent">' +
          '<input type="checkbox" id="ai-consent-vto"' + (vtoConsent ? ' checked' : '') + '>' +
          '<label for="ai-consent-vto"><strong>I authorize the use of this photo</strong> to generate the virtual try-on of this piece with YouCam (Perfect Corp). ' +
          'It is not stored in the catalog or used for any other purpose.</label>' +
        '</div>' +

        '<label class="ai-drop" id="ai-vto-drop" for="ai-vto-input" style="margin-top:12px">' +
          '<span class="ai-drop__icon" aria-hidden="true">' +
            '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>' +
              '<circle cx="12" cy="13" r="4"/>' +
            '</svg>' +
          '</span>' +
          '<span class="ai-drop__title">' + (vtoFile ? 'Change photo' : 'Upload your photo') + '</span>' +
          '<span class="ai-drop__hint" id="ai-vto-drop-text">' +
            (vtoFile ? escapeHtml(vtoPhotoLabel || vtoFile.name) : 'JPG or PNG · automatically resized before sending') +
          '</span>' +
          '<input type="file" id="ai-vto-input" accept="image/jpeg,image/png">' +
        '</label>' +
        '<div id="ai-vto-preview">' + vtoPreviewHTML() + '</div>' +
      '</div>' +
      '<div class="ai-vto__instructions">' +
        '<strong>For ' + (category === 'necklace' ? 'a necklace' : 'a bracelet') + '</strong>' +
        instructions +
        '<p class="ai-hint" style="margin-top:8px">This photo is requested right now, when it’s needed.</p>' +
      '</div>' +
    '</div>' +

    '<p class="ai-status' + (vtoStatusError ? ' is-error' : '') + '" id="ai-vto-status" role="status" aria-live="polite">' +
      (busy === 'vto' || busy === 'model' ? '<span class="ai-spinner" aria-hidden="true"></span>' : '') + escapeHtml(vtoStatus) +
    '</p>' +

    '<div class="ai-actions">' +
      '<button type="button" class="ai-btn ai-btn--primary" id="ai-vto-run"' +
        (!vtoFile || !vtoConsent || busy === 'vto' || busy === 'model' ? ' disabled' : '') + '>Try on virtually</button>' +
      '<a class="ai-btn ai-btn--ghost" href="' + escapeHtml(whatsappProductUrl(product, 'consulta')) + '" target="_blank" rel="noopener noreferrer">Check availability</a>' +
    '</div>';
  }

  function vtoUnavailableHTML(product) {
    return '<div class="ai-note ai-note--warm">' +
      '<strong>The try-on isn’t available for this piece.</strong> We need a catalog photo on an allowed host. ' +
      'In the meantime, you can check availability via WhatsApp.' +
      '<div class="ai-actions">' +
        '<a class="ai-btn ai-btn--wa" href="' + escapeHtml(whatsappProductUrl(product, 'consulta')) + '" target="_blank" rel="noopener noreferrer">Ask on WhatsApp</a>' +
      '</div>' +
    '</div>';
  }

  function vtoPreviewHTML() {
    if (!vtoPreviewUrl) return '';
    var tag = vtoPhotoSource === 'model' ? 'Demo model' : vtoPhotoSource === 'reference' ? 'Reference image' : 'Your photo';
    return '<div class="ai-preview' + (busy === 'vto' || busy === 'model' ? ' is-scanning' : '') + '">' +
      '<span class="ai-preview__tag">' + tag + '</span>' +
      '<span class="ai-scan-line" aria-hidden="true"></span>' +
      '<img src="' + escapeHtml(vtoPreviewUrl) + '" alt="Preview of your photo for the virtual try-on">' +
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

    els.stage.querySelectorAll('[data-vto-model]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        useModelPhoto(btn.dataset.vtoModel);
      });
    });

    var consent = document.getElementById('ai-consent-vto');
    var run = document.getElementById('ai-vto-run');
    if (consent) {
      consent.addEventListener('change', function () {
        vtoConsent = consent.checked;
        if (run) run.disabled = !vtoFile || !vtoConsent || busy === 'vto' || busy === 'model';
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
          showToast('Choose a photo first.');
          return;
        }
        if (!vtoConsent) {
          showToast('Check the consent box to try on the piece.');
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
        vtoPhotoSource = '';
        vtoPhotoCategory = '';
        vtoPhotoLabel = '';
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

  function resetSimulation() {
    vtoToken += 1;
    vtoStatus = '';
    vtoStatusError = false;
    busy = null;
    state.vto.productId = '';
    state.vto.resultUrl = '';
    state.vto.at = '';
    syncActivePhoto();
  }

  function clearVtoPhoto(status) {
    var category = vtoCategoryOf(selectedVtoProduct());
    photoFiles[category] = null;
    vtoToken += 1;
    vtoStatus = status || '';
    vtoStatusError = false;
    busy = null;
    syncActivePhoto();
  }

  function vtoPhotoMatches(category) {
    return Boolean(photoFiles[category]);
  }

  function vtoCategoryOf(product) {
    return product && product.category === 'collares' ? 'necklace' : 'bracelet';
  }

  function vtoCategoryChangeMessage(category) {
    return category === 'bracelet'
      ? 'You switched to a bracelet: choose the hand model or upload a photo of the back of your hand.'
      : 'You switched to a necklace: choose the selfie model or upload a front-facing photo with neck and shoulders visible.';
  }

  function selectVtoProduct(id) {
    if (!id) return;
    var nextId = String(id);
    if (state.vto.productId === nextId) return;

    state.vto.productId = nextId;
    state.vto.resultUrl = '';
    state.vto.at = '';
    vtoToken += 1;
    vtoStatus = '';
    vtoStatusError = false;
    busy = null;
    syncActivePhoto();
    persist();
  }

  async function selectVtoFile(file) {
    var product = selectedVtoProduct();
    var category = vtoCategoryOf(product);
    try {
      validatePhoto(file, MAX_PHOTO);
      busy = 'photo';
      vtoStatus = 'Preparing the photo…';
      vtoStatusError = false;
      renderStage();

      var resized = await resizePhoto(file, VTO_MAX_EDGE, VTO_MAX_INPUT);
      var processed = new File([resized.blob], file.name || 'photo.jpg', { type: 'image/jpeg' });
      photoFiles[category] = {
        file: processed,
        previewUrl: resized.dataUrl,
        source: 'upload',
        label: file.name || 'Your photo'
      };
      vtoConsent = true;
      state.vto.resultUrl = '';
      state.vto.at = '';
      vtoStatus = '';
      vtoStatusError = false;
      busy = null;
      syncActivePhoto();
      persist();
      renderStage();
    } catch (err) {
      busy = null;
      vtoStatus = err && err.message ? err.message : 'We could not prepare that photo.';
      vtoStatusError = true;
      renderStage();
    }
  }

  async function loadModelPhotoEntry(category) {
    var model = DEMO_MODELS[category];
    if (!model) throw new Error('That model is not available.');
    var sample = await loadSampleAsFile(model.src);
    return {
      file: new File([sample], 'model-' + category + '.jpg', { type: sample.type || 'image/jpeg' }),
      previewUrl: model.src,
      source: 'model',
      label: model.label
    };
  }

  async function ensurePhotoForCategory(category) {
    var entry = photoFiles[category];
    if (entry && entry.file) return entry;
    if ((entry && entry.source === 'model') || state.photoMode === 'model') {
      var loaded = await loadModelPhotoEntry(category);
      photoFiles[category] = loaded;
      syncActivePhoto();
      return loaded;
    }
    return entry || null;
  }

  async function useModelPhoto(category) {
    if (!DEMO_MODELS[category]) return;
    busy = 'model';
    vtoStatus = 'Loading the demo model…';
    vtoStatusError = false;
    renderStage();
    try {
      var entry = await loadModelPhotoEntry(category);
      photoFiles[category] = entry;
      vtoConsent = true;
      vtoStatus = 'Demo model loaded. You can generate the simulation now.';
      vtoStatusError = false;
      busy = null;
      syncActivePhoto();
      renderStage();
    } catch (err) {
      busy = null;
      vtoStatus = err && err.message ? err.message : 'We could not load the demo model.';
      vtoStatusError = true;
      renderStage();
    }
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

    var category = vtoCategoryOf(product);
    var entry = photoFiles[category];

    if (!entry || !entry.file) {
      busy = 'model';
      vtoStatus = category === 'necklace'
        ? 'To try this necklace on, we need a selfie. Loading the photo…'
        : 'To try this bracelet on, we need a photo of your hand. Loading the photo…';
      vtoStatusError = false;
      renderStage();
      try {
        entry = await ensurePhotoForCategory(category);
      } catch (err) {
        entry = null;
      }
    }

    if (!entry || !entry.file) {
      busy = null;
      vtoStatus = category === 'necklace'
        ? 'To try this necklace on, we need a selfie with your neck and shoulders visible.'
        : 'To try this bracelet on, we need a photo of the back of your hand and wrist.';
      vtoStatusError = true;
      renderStage();
      return;
    }

    if (!vtoConsent && entry.source !== 'model') {
      vtoStatus = 'Check the consent box to use your photo in the virtual try-on.';
      vtoStatusError = true;
      busy = null;
      renderStage();
      return;
    }

    vtoFile = entry.file;
    vtoPreviewUrl = entry.previewUrl;
    var token = ++vtoToken;
    busy = 'vto';
    vtoStatus = 'Preparing your photo…';
    vtoStatusError = false;
    renderStage();

    try {
      var resized = await resizePhoto(entry.file, VTO_MAX_EDGE, VTO_MAX_INPUT);
      if (token !== vtoToken) return;

      entry.previewUrl = resized.dataUrl;
      vtoPreviewUrl = resized.dataUrl;
      syncActivePhoto();

      var url = await requestVto(product, resized.blob, category, token);
      if (token !== vtoToken || !url) return;

      state.vto.resultUrl = url;
      state.vto.at = Date.now();
      state.vto.productId = String(product.id);
      persist();

      busy = null;
      vtoStatus = '';
      vtoStatusError = false;
      renderStage();
      renderProfile();
    } catch (err) {
      if (token !== vtoToken) return;
      busy = null;
      vtoStatus = err && err.message ? err.message : 'We couldn’t generate the virtual try-on.';
      vtoStatusError = true;
      renderStage();
    }
  }


  function friendlyVtoError(raw, category) {
    var text = String(raw || '').toLowerCase();
    if (text.indexOf('neck') !== -1 || text.indexOf('roll') !== -1) {
      return 'In the photo, your neck should be fully visible and centered. Try another front-facing photo with your neck and shoulders visible.';
    }
    if (text.indexOf('face') !== -1 || text.indexOf('alignment') !== -1) {
      return 'We could not detect your face clearly. Try another front-facing photo with good light.';
    }
    if (text.indexOf('wrist') !== -1 || text.indexOf('hand') !== -1 || text.indexOf('bracelet') !== -1) {
      return 'In the photo, your wrist should be fully visible and centered. Try a photo of the back of your hand.';
    }
    return category === 'bracelet'
      ? 'We could not generate the simulation. Try a photo of the back of your hand and wrist.'
      : 'We could not generate the simulation. Try another front-facing photo with your neck and shoulders visible.';
  }

  async function requestVto(product, blob, category, token) {
    if (!/^https?:$/.test(window.location.protocol)) {
      throw new Error('The virtual try-on needs the site served from Cloudflare Pages or a local server. Opening the HTML by double-click doesn’t enable /api/vto.');
    }
    if (!canTryOn(product)) {
      throw new Error('This piece doesn’t have an image compatible with the try-on.');
    }

    var form = new FormData();
    form.append('photo', blob, 'photo.jpg');
    form.append('category', category);
    form.append('product_img', vtoRefImage(product));

    var post = await fetchWithTimeout('/api/vto', { method: 'POST', body: form }, 30000);
    var data = await post.json().catch(function () { return {}; });
    if (!post.ok || !data.taskId) {
      throw new Error(data.error || 'The virtual try-on service is unavailable.');
    }

    for (var attempt = 0; attempt < VTO_MAX_POLLS; attempt += 1) {
      await sleep(VTO_POLL_MS);
      if (token !== vtoToken) return null;

      var elapsed = Math.round(((attempt + 1) * VTO_POLL_MS) / 1000);
      setVtoStatus('Generating the virtual try-on… ' + elapsed + ' s');

      var res = await fetchWithTimeout(
        '/api/vto?taskId=' + encodeURIComponent(data.taskId) + '&category=' + encodeURIComponent(category),
        {},
        15000
      );
      var payload = await res.json().catch(function () { return {}; });

      if (payload.status === 'success' && payload.url) return payload.url;
      if (payload.status === 'error') {
        throw new Error(friendlyVtoError(payload.error, category));
      }
      if (!res.ok && !payload.status) {
        throw new Error(payload.error || 'Error checking the virtual try-on.');
      }
    }

    throw new Error('The virtual try-on is taking longer than usual. Try again with another photo.');
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
    showToast('Saved to favorites ✓');
  }

  function removeLook(id) {
    state.savedLooks = state.savedLooks.filter(function (item) { return String(item.productId) !== String(id); });
    persist();
    renderLookCount();
    renderStage();
    showToast('Piece removed from your look.');
  }

  function savedLooksHTML() {
    if (!state.savedLooks.length) return '';

    return '<div class="ai-saved">' +
      '<div class="ai-saved__head">' +
        '<h3 class="ai-saved__title">Your favorites</h3>' +
        '<span class="ai-saved__count">' + state.savedLooks.length +
          (state.savedLooks.length === 1 ? ' piece' : ' pieces') + '</span>' +
      '</div>' +
      '<div class="ai-saved__grid">' +
        state.savedLooks.map(function (look) {
          var product = productById(look.productId);
          var image = look.resultUrl || (product ? productImage(product, 300) : look.image);
          var category = look.category === 'collares' ? 'Necklace' : 'Bracelet';
          var consultUrl = product ? whatsappProductUrl(product, 'consulta') : whatsappLookUrl();
          return '<article class="ai-saved-card">' +
            '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(look.name) + '" loading="lazy" ' +
              'onerror="this.src=\'https://placehold.co/300x300/D6F2EE/1A8A78?text=%E2%9C%A8\'">' +
            '<div class="ai-saved-card__body">' +
              '<div class="ai-saved-card__name">' + escapeHtml(look.name) + '</div>' +
              '<div class="ai-saved-card__meta">' + category +
                (look.toneLabel ? ' · Palette ' + escapeHtml(look.toneLabel.toLowerCase()) : '') +
                '</div>' +
              '<div class="ai-saved-card__actions">' +
                (product ? '<a class="ai-mini ai-mini--ghost" href="product.html?id=' + encodeURIComponent(product.id) + '">Details</a>' : '') +
                '<a class="ai-mini ai-mini--ghost" href="' + escapeHtml(consultUrl) + '" target="_blank" rel="noopener noreferrer">Ask</a>' +
                '<button type="button" class="ai-mini ai-mini--ghost" data-remove-look="' + escapeHtml(look.productId) + '">Remove</button>' +
              '</div>' +
            '</div>' +
          '</article>';
        }).join('') +
      '</div>' +
      '<div class="ai-actions">' +
        '<a class="ai-btn ai-btn--wa" href="' + escapeHtml(whatsappLookUrl()) + '" target="_blank" rel="noopener noreferrer">Send my favorites via WhatsApp</a>' +
        '<a class="ai-btn ai-btn--ghost" href="index.html">Keep exploring</a>' +
      '</div>' +
    '</div>';
  }

  /* ── Perfil de la sesión ─────────────────── */

  function renderProfile() {
    if (!els.profile) return;

    var p = state.profile;
    var touched = state.flags.touched || {};
    var chips = [];

    if (p.occasion) {
      chips.push({ field: 'occasion', text: labelFromList(OCCASIONS, p.occasion) });
    }
    if (p.style) {
      chips.push({ field: 'style', text: labelFromList(STYLES, p.style) });
    }
    if (touched.pieces) {
      chips.push({ field: 'pieces', text: labelFromList(PIECES, p.pieces) });
    }
    if (touched.budget) {
      chips.push({ field: 'budget', text: 'Budget: ' + (p.budgetLabel || (p.budget === 'sin-limite' ? 'No limit' : p.budget)) });
    }

    if (state.tone) {
      var palette = state.tone.palette || E.PALETTES[state.tone.undertone];
      var source = state.tone.source === 'youcam' ? 'YouCam' : state.tone.source === 'estandar' ? 'standard model palette' : state.tone.source === 'manual' ? 'manual' : state.tone.source === 'reference' ? 'reference' : 'local';
      chips.push({
        text: 'Palette ' + palette.short + ' · ' + source,
        dot: palette.swatches[0]
      });
    }

    if (!chips.length) {
      els.profile.innerHTML = '<span class="ai-profile__empty">Your profile builds up as we talk.</span>';
      return;
    }

    els.profile.innerHTML = chips.map(function (item) {
      var inner = (item.dot ? '<i style="background:' + escapeHtml(item.dot) + '"></i>' : '') + escapeHtml(item.text);
      if (!item.field) return '<span class="ai-profile__chip">' + inner + '</span>';
      return '<button type="button" class="ai-profile__chip ai-profile__chip--edit" data-edit-profile="' +
        escapeHtml(item.field) + '" title="Change this answer">' + inner + '</button>';
    }).join('');

    els.profile.querySelectorAll('[data-edit-profile]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        editChatField(btn.dataset.editProfile);
      });
    });
  }

  function renderLookCount() {
    if (els.lookCount) els.lookCount.textContent = String(state.savedLooks.length);
  }

  /* ── Fotos ───────────────────────────────── */

  function validatePhoto(file, maxBytes) {
    if (!file) throw new Error('Choose a photo first.');
    if (file.size > maxBytes) {
      throw new Error('The photo is too large (max. ' + Math.round(maxBytes / 1024 / 1024) + ' MB).');
    }
    if (!/^image\/(jpeg|jpg|png)$/.test(file.type)) {
      throw new Error('Unsupported format. Upload a JPG or PNG photo (iPhone HEIC files aren’t supported).');
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
        reject(new Error('We couldn’t read that image. Try a JPG or PNG photo.'));
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
          reject(new Error('The photo is too small. Use one at least ' + MIN_PHOTO_EDGE + ' px.'));
          return;
        }

        var scale = Math.min(1, maxEdge / edge);
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(function (blob) {
          if (!blob) {
            reject(new Error('We couldn’t process the photo.'));
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

  /* ── Local reading de tono ───────────────── */

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
      throw new Error('We couldn’t read the skin in the photo. Try a front-facing selfie with a large face and good light.');
    }

    var r = median(pixels.map(function (pixel) { return pixel[0]; }));
    var g = median(pixels.map(function (pixel) { return pixel[1]; }));
    var b = median(pixels.map(function (pixel) { return pixel[2]; }));

    var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (luminance < 0.12) {
      throw new Error('The photo is too dark. Look for even light facing you and try again.');
    }
    if (luminance > 0.96) {
      throw new Error('The photo is overexposed. Avoid direct flash or strong backlight.');
    }

    var confidence = pixels.length >= 1800 && luminance > 0.2 && luminance < 0.9 ? 'alta' : 'media';
    var tone = E.toneFromRgb({ r: r, g: g, b: b }, { source: 'local', confidence: confidence });

    var note = confidence === 'alta'
      ? 'Clear local reading. You can still adjust the palette if the light changed your tone.'
      : 'Local guidance reading: framing or light can influence it. Review the palette and adjust it if it doesn’t represent you.';

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
    if (!state.tone || state.tone.source !== 'local') return;

    try {
      setToneStatus('Refining the reading with YouCam…');
      var color = await requestYouCamTone(blob, token);
      if (!color || token !== toneToken) return;
      if (state.step > 2 || !state.tone || state.tone.source !== 'local') return;

      state.tone = E.toneFromYouCam(color);
      state.toneNote = 'YouCam read the colors of your face. The palette remains aesthetic guidance, not a label.';
      invalidateRecommendations();
      persist();
      toneStatus = '';
      toneStatusError = false;
      renderStage();
      renderProfile();
    } catch (err) {
      if (token !== toneToken) return;
      state.toneNote = 'YouCam’s advanced analysis isn’t available in this environment. The local guidance reading remains; you can try another image.';
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
      throw new Error(data.error || 'Advanced analysis isn’t available.');
    }

    for (var attempt = 0; attempt < TONE_MAX_POLLS; attempt += 1) {
      await sleep(TONE_POLL_MS);
      if (token !== toneToken) return null;

      var res = await fetchWithTimeout('/api/tono?taskId=' + encodeURIComponent(data.taskId), {}, 15000);
      var payload = await res.json().catch(function () { return {}; });

      if (payload.status === 'success' && payload.color) return payload.color;
      if (payload.status === 'error') {
        throw new Error(payload.error || 'The analysis task failed.');
      }
      if (!res.ok && !payload.status) {
        throw new Error(payload.error || 'Error checking the analysis.');
      }
    }

    throw new Error('Advanced analysis took too long.');
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
    if (status && state.step >= 3 && !state.vto.resultUrl) {
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

  function niceBudgetStep(maxPrice) {
    if (maxPrice > 200) return 50;
    if (maxPrice > 80) return 20;
    if (maxPrice > 30) return 5;
    if (maxPrice > 10) return 2;
    return 1;
  }

  /**
   * Rangos calculados with los precios reales del catálogo.
   * No inventa moneda: las etiquetas usan formatPrice().
   */
  function getBudgetOptions() {
    var prices = getProducts().map(function (product) {
      return Number(product.price);
    }).filter(function (price) {
      return isFinite(price) && price > 0;
    }).sort(function (a, b) { return a - b; });

    if (!prices.length) return [];

    var maxPrice = prices[prices.length - 1];
    var step = niceBudgetStep(maxPrice);
    var percentile = function (fraction) {
      return prices[Math.min(prices.length - 1, Math.floor((prices.length - 1) * fraction))];
    };
    var nice = function (value) {
      return Math.max(step, Math.ceil(value / step) * step);
    };

    var t1 = nice(percentile(0.25));
    var t2 = Math.max(t1 + step, nice(percentile(0.5)));
    var t3 = Math.max(t2 + step, nice(percentile(0.85)));

    return [
      { value: 'hasta-' + t1, max: t1, label: 'Up to ' + priceLabel(t1) },
      { value: t1 + '-' + t2, max: t2, label: priceLabel(t1) + ' to ' + priceLabel(t2) },
      { value: t2 + '-' + t3, max: t3, label: priceLabel(t2) + ' to ' + priceLabel(t3) },
      { value: 'sin-limite', max: null, label: 'No limit' }
    ];
  }

  function syncBudget() {
    var options = getBudgetOptions();
    if (!options.length) return;
    var current = options.filter(function (option) {
      return option.value === state.profile.budget;
    })[0];

    if (!current) {
      current = options[options.length - 1];
      state.profile.budget = current.value;
    }
    state.profile.budgetMax = current.max;
    state.profile.budgetLabel = current.label;
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
      return url.replace('/upload/', '/upload/e_background_removal,f_png,w_900,c_limit/');
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
    if (p.style) parts.push('style ' + E.LABELS.style[p.style]);
    if (p.occasion) parts.push(E.LABELS.occasion[p.occasion]);
    if (state.tone) parts.push('palette ' + state.tone.palette.short);
    return parts.join(', ');
  }

  function whatsappProductUrl(product, mode) {
    var intro = mode === 'compra'
      ? 'Hi! I’d like to buy '
      : 'Hi! I’d like to check availability of ';
    var message = intro + '*' + product.name + '* (' + product.id + ') — ' + priceLabel(product.price) + '.\n\n' +
      'I used Aguamarina AI. My profile: ' + profileLine() + '.\n\n' +
      'Could you confirm availability and arrange shipping?';
    return 'https://wa.me/' + whatsappNumber() + '?text=' + encodeURIComponent(message);
  }

  function whatsappLookUrl() {
    if (!state.savedLooks.length) return 'https://wa.me/' + whatsappNumber();
    var lines = state.savedLooks.map(function (look) {
      return '• ' + look.name + ' (' + look.productId + ') — ' + priceLabel(look.price);
    }).join('\n');
    var message = 'Hi! I used Aguamarina AI and saved this look:\n\n' + lines + '\n\n' +
      (profileLine() ? 'My profile: ' + profileLine() + '.\n\n' : '') +
      'Could you confirm availability and arrange shipping?';
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
        throw new Error('The connection took too long. Try again.');
      }
      throw new Error('We couldn’t connect to the service. Check your connection.');
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
