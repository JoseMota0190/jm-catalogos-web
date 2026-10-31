/**
 * TONO — Análisis de color de piel + recomendación (YouCam API)
 *
 * Se apoya en los globales de app.js: PRODUCTS, sanitize(), formatPrice(),
 * cloudinaryThumb(). No los redefine.
 *
 * Honestidad: el subtono se calcula a partir de los colores que devuelve la
 * API. Si la API falla, se muestra un error; nunca se inventa un resultado.
 */

'use strict';

var TONO_MAX_EDGE = 1024;
var TONO_POLL_MS = 2000;
var TONO_MAX_POLLS = 45;
var TONO_MAX_INPUT = 20 * 1024 * 1024;

var TONO_METALES = {
  calido: {
    nombre: 'Cálido',
    metales: ['Oro amarillo', 'Oro rosa', 'Bronce', 'Cobre'],
    texto: 'Tu piel tiene un subtono cálido. Los dorados, cobrizos y tonos tierra realzan tu brillo natural.',
  },
  frio: {
    nombre: 'Frío',
    metales: ['Plata', 'Oro blanco', 'Platino'],
    texto: 'Tu piel tiene un subtono frío. La plata, el oro blanco y el platino te dan un contraste luminoso.',
  },
  neutro: {
    nombre: 'Neutro',
    metales: ['Oro rosa', 'Oro amarillo', 'Plata'],
    texto: 'Tu piel tiene un subtono neutro. El oro rosa y los tonos intermedios te favorecen especialmente.',
  },
};

var TONO_KEYWORDS = {
  calido: ['dorad', 'oro', 'ambar', 'miel', 'sol', 'coral', 'naranja', 'terracota', 'bronce', 'cobre', 'topacio', 'caramelo'],
  frio: ['plata', 'perla', 'blanco', 'azul', 'luna', 'mar', 'turquesa', 'verde', 'amatista', 'zafiro', 'hielo'],
  neutro: ['rosa', 'rose', 'nude', 'perla', 'marfil', 'champagne', 'beige'],
};

var tonoState = { overlay: null, file: null, lastFocus: null, polling: false };

/* ── Utilidades ───────────────────────────────── */

function tonoEl(tag, attrs, html) {
  var node = document.createElement(tag);
  if (attrs) for (var k in attrs) node.setAttribute(k, attrs[k]);
  if (html != null) node.innerHTML = html;
  return node;
}

function tonoEscape(str) {
  if (typeof sanitize === 'function') return sanitize(str);
  return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function tonoSleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function tonoRgb(hex) {
  var m = /^#?([a-f0-9]{6})$/i.exec(hex || '');
  if (!m) return null;
  var n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/* ── Foto: validar, leer y reducir ───────────── */

function tonoLoadImage(file) {
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error('No pudimos leer esa imagen. Probá con una foto JPG o PNG (las HEIC de iPhone no son compatibles).'));
    };
    img.src = url;
  });
}

function tonoResize(file) {
  return new Promise(function (resolve, reject) {
    if (!file) return reject(new Error('Elegí una selfie primero.'));
    if (file.size > TONO_MAX_INPUT) return reject(new Error('La foto es demasiado grande (máx. 20 MB).'));
    if (/^image\/(jpeg|png)$/.test(file.type) === false) {
      return reject(new Error('Formato no soportado. Subí una foto JPG o PNG (las HEIC de iPhone no son compatibles).'));
    }

    tonoLoadImage(file).then(function (img) {
      var edge = Math.max(img.width, img.height);
      if (edge < 320) return reject(new Error('La foto es muy pequeña. Usá una de al menos 320 px.'));
      var scale = Math.min(1, TONO_MAX_EDGE / edge);
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(function (blob) {
        if (!blob) return reject(new Error('No pudimos procesar la foto.'));
        resolve({ blob: blob, preview: canvas.toDataURL('image/jpeg', 0.7) });
      }, 'image/jpeg', 0.9);
    }).catch(reject);
  });
}

/* ── Análisis de color ────────────────────────── */

function tonoAnaliza(color) {
  var rgb = tonoRgb(color && color.skin_color);
  if (!rgb) return { subtono: 'neutro', profundidad: 'media' };

  // Diferencia rojo-azul: en pieles cálidas domina el rojo/amarillo.
  var score = rgb.r - rgb.b;

  // Los ojos fríos y el cabello rojizo ajustan la lectura.
  var eye = (color.eye_color_name || '').toLowerCase();
  var hair = (color.hair_color_name || '').toLowerCase();
  if (eye === 'blue' || eye === 'gray' || eye === 'green') score -= 15;
  if (hair === 'red' || hair === 'auburn') score += 15;

  var subtono = score > 24 ? 'calido' : score < -4 ? 'frio' : 'neutro';

  var lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  var profundidad = lum > 0.68 ? 'clara' : lum > 0.44 ? 'media' : 'profunda';

  return { subtono: subtono, profundidad: profundidad };
}

function tonoRecomendar(subtono) {
  var productos = (typeof PRODUCTS !== 'undefined' && Array.isArray(PRODUCTS)) ? PRODUCTS : [];
  var kws = TONO_KEYWORDS[subtono] || [];

  var match = productos.filter(function (p) {
    var texto = ((p.name || '') + ' ' + (p.description || '')).toLowerCase();
    return kws.some(function (k) { return texto.indexOf(k) !== -1; });
  });

  // Si hay pocos, completamos con el resto del catálogo.
  if (match.length < 4) {
    productos.forEach(function (p) {
      if (match.length < 4 && match.indexOf(p) === -1) match.push(p);
    });
  }
  return match.slice(0, 4);
}

function tonoErrorTexto(code, message) {
  var map = {
    error_face_position_too_small: 'Tu cara se ve muy chica. Acercate un poco a la cámara y volvé a intentar.',
    error_face_position_invalid: 'No pudimos ubicar bien tu cara. Probá con otra selfie de frente.',
    error_face_not_forward_facing: 'Mirá de frente a la cámara, sin girar la cabeza.',
    error_face_angle_upward: 'Incliná un poco la cabeza hacia abajo.',
    error_face_angle_downward: 'Incliná un poco la cabeza hacia arriba.',
    error_face_angle_leftward: 'Girá un poco la cabeza hacia la derecha.',
    error_face_angle_rightward: 'Girá un poco la cabeza hacia la izquierda.',
    error_face_angle_left_tilt: 'Enderezate un poco hacia la derecha.',
    error_face_angle_right_tilt: 'Enderezate un poco hacia la izquierda.',
    error_below_min_image_size: 'La foto es muy pequeña (mínimo 320 px).',
    error_no_face: 'No detectamos una cara. Subí una selfie de frente y con buena luz.',
    error_pose: 'La pose no es válida. Mirá de frente a la cámara.',
  };
  return map[code] || map[message] || 'No pudimos analizar la foto. Probá con otra selfie de frente y con buena luz.';
}

/* ── Modal ────────────────────────────────────── */

function tonoBuild() {
  var overlay = tonoEl('div', {
    class: 'vto-overlay tono-overlay',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'tono-title',
  });

  overlay.addEventListener('click', function (event) {
    if (event.target === overlay) tonoClose();
  });

  document.body.appendChild(overlay);
  tonoState.overlay = overlay;
  return overlay;
}

function tonoRender() {
  var overlay = tonoState.overlay;
  overlay.innerHTML =
    '<div class="vto-modal tono-modal">' +
      '<div class="vto-head">' +
        '<div>' +
          '<span class="vto-eyebrow">Análisis de color · YouCam API</span>' +
          '<h2 class="vto-title" id="tono-title">Tu paleta ideal</h2>' +
        '</div>' +
        '<button type="button" class="vto-close" data-tono-close aria-label="Cerrar análisis">&times;</button>' +
      '</div>' +

      '<p class="vto-hint">Selfie de frente, rostro grande (más de la mitad del ancho) y con buena luz. Sin lentes oscuros ni otras personas en la foto.</p>' +

      '<label class="vto-drop" data-tono-drop>' +
        '<strong>Subí tu selfie</strong>' +
        '<span data-tono-drop-text>JPG o PNG · se reduce automáticamente a 1024 px</span>' +
        '<input type="file" accept="image/jpeg,image/png" data-tono-input>' +
      '</label>' +

      '<div data-tono-preview></div>' +
      '<p class="vto-status" data-tono-status role="status" aria-live="polite"></p>' +
      '<div data-tono-result></div>' +

      '<div class="vto-actions">' +
        '<button type="button" class="vto-btn vto-btn--main" data-tono-go disabled>Analizar mi tono</button>' +
        '<button type="button" class="vto-btn vto-btn--ghost" data-tono-close>Cerrar</button>' +
      '</div>' +
    '</div>';

  var input = overlay.querySelector('[data-tono-input]');
  var goBtn = overlay.querySelector('[data-tono-go]');
  var status = overlay.querySelector('[data-tono-status]');
  var previewSlot = overlay.querySelector('[data-tono-preview]');
  var resultSlot = overlay.querySelector('[data-tono-result]');
  var dropText = overlay.querySelector('[data-tono-drop-text]');

  overlay.querySelectorAll('[data-tono-close]').forEach(function (btn) {
    btn.addEventListener('click', tonoClose);
  });

  input.addEventListener('change', function () {
    var file = input.files && input.files[0];
    tonoState.file = file || null;
    goBtn.disabled = !file;
    status.textContent = '';
    status.className = 'vto-status';
    previewSlot.innerHTML = '';
    resultSlot.innerHTML = '';
    if (!file) return;
    dropText.textContent = file.name;
    var previewUrl = URL.createObjectURL(file);
    var img = tonoEl('img', { class: 'vto-preview', src: previewUrl, alt: 'Tu selfie' });
    img.addEventListener('load', function () { URL.revokeObjectURL(previewUrl); }, { once: true });
    previewSlot.appendChild(img);
  });

  goBtn.addEventListener('click', function () {
    tonoRun(goBtn, status, resultSlot);
  });
}

function tonoOpen() {
  if (!tonoState.overlay) tonoBuild();
  tonoState.file = null;
  tonoState.lastFocus = document.activeElement;
  tonoRender();

  var overlay = tonoState.overlay;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(function () { overlay.classList.add('vto-open'); });

  var closeBtn = overlay.querySelector('.vto-close');
  if (closeBtn) closeBtn.focus();
  document.addEventListener('keydown', tonoOnKey);
}

function tonoClose() {
  var overlay = tonoState.overlay;
  if (!overlay) return;
  document.removeEventListener('keydown', tonoOnKey);
  tonoState.polling = false;
  overlay.classList.remove('vto-open');
  document.body.style.overflow = '';
  if (tonoState.lastFocus && tonoState.lastFocus.focus) tonoState.lastFocus.focus();
  setTimeout(function () {
    if (!overlay.classList.contains('vto-open')) overlay.innerHTML = '';
  }, 260);
}

function tonoOnKey(event) {
  if (event.key === 'Escape') tonoClose();
}

/* ── Flujo contra la API ──────────────────────── */

function tonoSetStatus(el, message, isError) {
  el.className = 'vto-status' + (isError ? ' vto-error' : '');
  el.innerHTML = message;
}

function tonoRun(goBtn, statusEl, resultSlot) {
  var started = performance.now();
  goBtn.disabled = true;
  resultSlot.innerHTML = '';

  tonoResize(tonoState.file)
    .then(function (resized) {
      tonoSetStatus(statusEl, '<span class="vto-spinner"></span>Analizando tu paleta…');

      var form = new FormData();
      form.append('photo', resized.blob, 'selfie.jpg');

      return fetch('/api/tono', { method: 'POST', body: form }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok || !data.taskId) {
            throw new Error(data.error || 'El análisis de color no está disponible.');
          }
          return tonoPoll(data.taskId, statusEl);
        });
      });
    })
    .then(function (result) {
      var seconds = ((performance.now() - started) / 1000).toFixed(1);
      tonoSetStatus(statusEl, 'Análisis listo en ' + seconds + ' s.');
      tonoRenderResult(result, resultSlot);
    })
    .catch(function (error) {
      tonoSetStatus(statusEl, tonoEscape(error.message || 'No se pudo analizar la foto.'), true);
    })
    .then(function () { goBtn.disabled = false; });
}

function tonoPoll(taskId, statusEl) {
  var attempts = 0;

  function step() {
    var elapsed = attempts * (TONO_POLL_MS / 1000);
    tonoSetStatus(statusEl, '<span class="vto-spinner"></span>Leyendo los colores de tu rostro… ' + elapsed + ' s');

    return fetch('/api/tono?taskId=' + encodeURIComponent(taskId))
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok && !data.status) throw new Error(data.error || 'Error consultando la tarea.');
          if (data.status === 'success' && data.color) return data;
          if (data.status === 'error') {
            throw new Error(tonoErrorTexto(data.code, data.error));
          }

          attempts += 1;
          if (attempts >= TONO_MAX_POLLS) {
            throw new Error('El análisis está tardando más de lo normal. Probá de nuevo.');
          }
          return tonoSleep(TONO_POLL_MS).then(step);
        });
      });
  }

  return step();
}

/* ── Resultado ────────────────────────────────── */

function tonoProductCard(p) {
  var img = (typeof cloudinaryThumb === 'function' ? cloudinaryThumb(p.image, 300) : p.image) || '';
  var nombre = tonoEscape(p.name);
  var precio = (typeof formatPrice === 'function' ? formatPrice(p.price) : '$' + p.price);
  return '<a class="tono-product" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
    '<img src="' + tonoEscape(img) + '" alt="' + nombre + '" loading="lazy">' +
    '<span class="tono-product__name">' + nombre + '</span>' +
    '<span class="tono-product__price">' + precio + '</span>' +
  '</a>';
}

function tonoRenderResult(result, slot) {
  var color = result.color || {};
  var analisis = tonoAnaliza(color);
  var info = TONO_METALES[analisis.subtono];
  var recomendados = tonoRecomendar(analisis.subtono);

  var swatches = [
    ['Piel', color.skin_color],
    ['Ojos', color.eye_color],
    ['Labios', color.lip_color],
    ['Cejas', color.eyebrow_color],
    ['Cabello', color.hair_color],
  ].filter(function (s) { return s[1]; });

  var html =
    '<div class="tono-palette tono-palette--' + analisis.subtono + '">' +
      '<p class="tono-palette__eyebrow">Tu subtono</p>' +
      '<h3 class="tono-palette__title">' + info.nombre + ' · piel ' + analisis.profundidad + '</h3>' +
      '<p class="tono-palette__text">' + info.texto + '</p>' +
      '<div class="tono-metales">' +
        info.metales.map(function (m) { return '<span class="tono-metal">' + m + '</span>'; }).join('') +
      '</div>' +
    '</div>' +

    '<div class="tono-swatches">' +
      swatches.map(function (s) {
        return '<div class="tono-swatch">' +
          '<span class="tono-swatch__dot" style="background:' + tonoEscape(s[1]) + '"></span>' +
          '<span class="tono-swatch__label">' + s[0] + '</span>' +
        '</div>';
      }).join('') +
    '</div>' +

    '<div class="tono-reco">' +
      '<h4 class="tono-reco__title">Piezas que te favorecen</h4>' +
      '<div class="tono-products">' +
        recomendados.map(tonoProductCard).join('') +
      '</div>' +
    '</div>' +

    '<p class="tono-disclaimer">Colores detectados por YouCam API. La recomendación combina el subtono con los tonos del catálogo.</p>';

  slot.innerHTML = html;
}
