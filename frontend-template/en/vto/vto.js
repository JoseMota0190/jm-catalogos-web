/**
 * VTO — Virtual Try-On (YouCam API) · cliente
 *
 * Se apoya en los globales que ya expone app.js: PRODUCTS, CONFIG,
 * getProductById(), formatPrice(), sanitize(). No los redefine.
 *
 * Honestidad: si YouCam falla, se muestra un error. Nunca se compone una
 * imagen falsa que pueda confundirse con un resultado real de la API.
 */

'use strict';

var VTO_CATEGORIES = { pulseras: 'bracelet', collares: 'necklace' };

var VTO_HINTS = {
  bracelet: 'Photo of the back of your hand and wrist, with all five fingers visible and no rings in the way. Even light, plain background.',
  necklace: 'Front-facing selfie with neck and shoulders visible. Hair away from the neckline and good lighting.',
};

var VTO_MAX_POLLS = 45;   // 45 × 2 s = 90 s
var VTO_POLL_MS = 2000;
var VTO_MAX_EDGE = 1024;  // el VTO no necesita más y así responde rápido
var VTO_MAX_INPUT = 20 * 1024 * 1024;

/* ── Helpers compartidos con el catálogo ───────── */

function vtoCategory(product) {
  return (product && VTO_CATEGORIES[product.category]) || null;
}

/**
 * La imagen de referencia NO debe ir recortada: cloudinaryThumb() fuerza
 * w_400,h_400,c_fill y cortaría la joya. Aquí solo se limita el lado mayor.
 */
function vtoRefImage(product) {
  var assets = window.AGUAMARINA_VTO_ASSETS || {};
  var path = (product && assets[product.id]) || '';
  if (!path) return '';
  try {
    return new URL(path, window.location.href).href;
  } catch (err) {
    return path;
  }
}

function vtoCanTry(product) {
  return Boolean(vtoCategory(product) && vtoRefImage(product));
}

/* ── Utilidades de DOM ────────────────────────── */

function vtoEl(tag, attrs, html) {
  var node = document.createElement(tag);
  if (attrs) for (var k in attrs) node.setAttribute(k, attrs[k]);
  if (html != null) node.innerHTML = html;
  return node;
}

function vtoEscape(str) {
  if (typeof sanitize === 'function') return sanitize(str);
  return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function vtoPrice(product) {
  if (typeof formatPrice === 'function') return formatPrice(product.price);
  return product.price == null ? '' : String(product.price);
}

function vtoSleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function vtoWhatsApp(product) {
  var number = (typeof CONFIG === 'object' && CONFIG && CONFIG.whatsappNumber) || '';
  var text = 'Hi! I’m interested in *' + product.name + '* (' + product.id + ') from Aguamarina Store.';
  return 'https://wa.me/' + number + '?text=' + encodeURIComponent(text);
}

/* ── Foto del usuario: validar, leer y reducir ── */

function vtoLoadImage(file) {
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error('We couldn’t read that image. Try a JPG or PNG photo (iPhone HEIC files aren’t supported).'));
    };
    img.src = url;
  });
}

function vtoResize(file) {
  return new Promise(function (resolve, reject) {
    if (!file) return reject(new Error('Choose a photo first.'));
    if (file.size > VTO_MAX_INPUT) {
      return reject(new Error('The photo is too large (max. 20 MB).'));
    }
    if (/^image\/(jpeg|png)$/.test(file.type) === false) {
      return reject(new Error('Unsupported format. Upload a JPG or PNG photo (iPhone HEIC files aren’t supported).'));
    }

    vtoLoadImage(file).then(function (img) {
      var edge = Math.max(img.width, img.height);
      if (edge < 320) {
        return reject(new Error('The photo is too small. Use one at least 320 px wide.'));
      }
      var scale = Math.min(1, VTO_MAX_EDGE / edge);
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(function (blob) {
        if (!blob) return reject(new Error('We couldn’t process the photo.'));
        resolve({ blob: blob, preview: canvas.toDataURL('image/jpeg', 0.7) });
      }, 'image/jpeg', 0.9);
    }).catch(reject);
  });
}

/* ── Modal ────────────────────────────────────── */

var vtoState = { overlay: null, product: null, file: null, lastFocus: null, polling: false };

function vtoBuild() {
  if (vtoState.overlay) return vtoState.overlay;

  var overlay = vtoEl('div', {
    class: 'vto-overlay',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'vto-title',
  });

  overlay.addEventListener('click', function (event) {
    if (event.target === overlay) vtoClose();
  });

  document.body.appendChild(overlay);
  vtoState.overlay = overlay;
  return overlay;
}

function vtoRender(product) {
  var category = vtoCategory(product);
  var overlay = vtoBuild();

  overlay.innerHTML =
    '<div class="vto-modal">' +
      '<div class="vto-head">' +
        '<div>' +
          '<span class="vto-eyebrow">Virtual try-on · YouCam API</span>' +
          '<h2 class="vto-title" id="vto-title">Try it on</h2>' +
        '</div>' +
        '<button type="button" class="vto-close" data-vto-close aria-label="Close try-on">&times;</button>' +
      '</div>' +

      '<div class="vto-product">' +
        '<img class="vto-thumb" src="' + vtoEscape(vtoRefImage(product)) + '" alt="' + vtoEscape(product.name) + '">' +
        '<div>' +
          '<div class="vto-product-name">' + vtoEscape(product.name) + '</div>' +
          '<div class="vto-product-price">' + vtoEscape(vtoPrice(product)) + '</div>' +
        '</div>' +
      '</div>' +

      '<p class="vto-hint">' + vtoEscape(VTO_HINTS[category] || '') + '</p>' +

      '<label class="vto-drop" data-vto-drop>' +
        '<strong>Upload your photo</strong>' +
        '<span data-vto-drop-text>JPG or PNG · automatically resized to 1024 px</span>' +
        '<input type="file" accept="image/jpeg,image/png" data-vto-input>' +
      '</label>' +

      '<div data-vto-preview></div>' +
      '<p class="vto-status" data-vto-status role="status" aria-live="polite"></p>' +
      '<div data-vto-result></div>' +

      '<div class="vto-actions">' +
        '<button type="button" class="vto-btn vto-btn--main" data-vto-go disabled>Try with my photo</button>' +
        '<button type="button" class="vto-btn vto-btn--ghost" data-vto-close>Close</button>' +
      '</div>' +
    '</div>';

  var input = overlay.querySelector('[data-vto-input]');
  var goBtn = overlay.querySelector('[data-vto-go]');
  var status = overlay.querySelector('[data-vto-status]');
  var previewSlot = overlay.querySelector('[data-vto-preview]');
  var resultSlot = overlay.querySelector('[data-vto-result]');
  var dropText = overlay.querySelector('[data-vto-drop-text]');

  overlay.querySelectorAll('[data-vto-close]').forEach(function (btn) {
    btn.addEventListener('click', vtoClose);
  });

  input.addEventListener('change', function () {
    var file = input.files && input.files[0];
    vtoState.file = file || null;
    goBtn.disabled = !file;
    status.textContent = '';
    status.className = 'vto-status';
    previewSlot.innerHTML = '';
    resultSlot.innerHTML = '';
    if (!file) return;
    dropText.textContent = file.name;
    var previewUrl = URL.createObjectURL(file);
    var img = vtoEl('img', { class: 'vto-preview', src: previewUrl, alt: 'Your photo' });
    img.addEventListener('load', function () { URL.revokeObjectURL(previewUrl); }, { once: true });
    previewSlot.appendChild(img);
  });

  goBtn.addEventListener('click', function () { vtoRun(product, category, goBtn, status, resultSlot); });

  return overlay;
}

function vtoOpen(id) {
  var product = typeof getProductById === 'function' ? getProductById(id) : null;
  if (!product && typeof PRODUCTS !== 'undefined') {
    product = PRODUCTS.filter(function (p) { return String(p.id) === String(id); })[0] || null;
  }
  if (!product || !vtoCanTry(product)) return;

  vtoState.product = product;
  vtoState.file = null;
  vtoState.polling = false;
  vtoState.lastFocus = document.activeElement;

  var overlay = vtoRender(product);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(function () { overlay.classList.add('vto-open'); });

  var closeBtn = overlay.querySelector('.vto-close');
  if (closeBtn) closeBtn.focus();

  document.addEventListener('keydown', vtoOnKey);
}

function vtoClose() {
  var overlay = vtoState.overlay;
  if (!overlay) return;
  document.removeEventListener('keydown', vtoOnKey);
  vtoState.polling = false;
  overlay.classList.remove('vto-open');
  document.body.style.overflow = '';
  if (vtoState.lastFocus && vtoState.lastFocus.focus) vtoState.lastFocus.focus();
  setTimeout(function () {
    if (!overlay.classList.contains('vto-open')) overlay.innerHTML = '';
  }, 260);
}

function vtoOnKey(event) {
  if (event.key === 'Escape') vtoClose();
}

/* ── Flujo contra la API ──────────────────────── */

function vtoSetStatus(statusEl, message, isError) {
  statusEl.className = 'vto-status' + (isError ? ' vto-error' : '');
  statusEl.innerHTML = message;
}

function vtoRun(product, category, goBtn, statusEl, resultSlot) {
  var started = performance.now();
  goBtn.disabled = true;
  resultSlot.innerHTML = '';

  vtoResize(vtoState.file)
    .then(function (resized) {
      vtoSetStatus(statusEl, '<span class="vto-spinner"></span>Processing your photo…');

      var form = new FormData();
      form.append('photo', resized.blob, 'photo.jpg');
      form.append('category', category);
      form.append('product_img', vtoRefImage(product));

      return fetch('/api/vto', { method: 'POST', body: form }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok || !data.taskId) {
            throw new Error(data.error || 'The virtual try-on service is unavailable.');
          }
          return vtoPoll(data.taskId, category, statusEl, started);
        });
      });
    })
    .then(function (url) {
      var seconds = ((performance.now() - started) / 1000).toFixed(1);
      vtoSetStatus(statusEl, 'Ready in ' + seconds + ' s.');

      var wrap = vtoEl('div', { class: 'vto-result-wrap' });
      wrap.appendChild(vtoEl('img', { class: 'vto-result', src: url, alt: 'Try-on result for ' + product.name }));
      wrap.appendChild(vtoEl('span', { class: 'vto-badge' }, 'YouCam API'));

      var wa = vtoEl('a', {
        class: 'vto-btn vto-btn--wa',
        href: vtoWhatsApp(product),
        target: '_blank',
        rel: 'noopener noreferrer',
      }, 'Order via WhatsApp');

      var actions = vtoEl('div', { class: 'vto-actions' });
      actions.appendChild(wa);

      resultSlot.appendChild(wrap);
      resultSlot.appendChild(actions);
    })
    .catch(function (error) {
      vtoSetStatus(
        statusEl,
        vtoEscape(error.message || 'The virtual try-on couldn’t be generated.') +
          ' You can try another photo or ask us for the piece via WhatsApp.',
        true
      );
    })
    .then(function () { goBtn.disabled = false; });
}

function vtoPoll(taskId, category, statusEl, started) {
  var attempts = 0;

  function step() {
    var elapsed = Math.round((performance.now() - started) / 1000);
    vtoSetStatus(statusEl, '<span class="vto-spinner"></span>Generating the virtual try-on… ' + elapsed + ' s');

    return fetch('/api/vto?taskId=' + encodeURIComponent(taskId) + '&category=' + encodeURIComponent(category))
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok && !data.status) throw new Error(data.error || 'Error checking the task.');
          if (data.status === 'success' && data.url) return data.url;
          if (data.status === 'error') throw new Error(data.error || 'The try-on task failed.');

          attempts += 1;
          if (attempts >= VTO_MAX_POLLS) {
            throw new Error('The try-on is taking longer than usual.');
          }
          return vtoSleep(VTO_POLL_MS).then(step);
        });
      });
  }

  return step();
}
