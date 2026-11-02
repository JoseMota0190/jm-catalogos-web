/* =============================================
   AGUAMARINA AI — motor de perfil y recomendación
   Sin DOM, sin red. Se puede probar con Node.
   ============================================= */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AguamarinaEngine = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  /* ── Paletas orientativas ─────────────────── */

  var PALETTES = {
    calido: {
      key: 'calido',
      label: 'Cálido',
      short: 'cálida',
      plural: 'cálidos',
      metals: ['Oro amarillo', 'Oro rosa', 'Bronce', 'Cobre'],
      colors: ['Marfil', 'Ámbar', 'Coral', 'Terracota', 'Verde oliva', 'Dorado'],
      colorKeys: ['marfil', 'ambar', 'coral', 'terracota', 'verde', 'dorado', 'naranja', 'rojo', 'beige', 'marron', 'mocca', 'champagne', 'bronce', 'cobre', 'oro', 'sol', 'natural'],
      swatches: ['#C9A55A', '#E8C97A', '#D98E73', '#A9714B', '#7E8C5A', '#F4E7D3'],
      text: 'Los dorados, cobrizos y tonos tierra suelen realzar el brillo cálido de la piel.'
    },
    frio: {
      key: 'frio',
      label: 'Frío',
      short: 'fría',
      plural: 'fríos',
      metals: ['Plata', 'Oro blanco', 'Platino'],
      colors: ['Azul marino', 'Lavanda', 'Fucsia', 'Esmeralda', 'Blanco perla', 'Plateado'],
      colorKeys: ['azul', 'celeste', 'marino', 'aguamarina', 'turquesa', 'verde', 'esmeralda', 'morado', 'lila', 'fucsia', 'blanco', 'gris', 'negro', 'plata', 'plateado', 'perla', 'cristal', 'polar'],
      swatches: ['#B8C6D9', '#8E7CC3', '#C2185B', '#2E8B74', '#F5F7FA', '#9AA7B8'],
      text: 'La plata, el oro blanco y los tonos fríos suelen crear un contraste luminoso.'
    },
    neutro: {
      key: 'neutro',
      label: 'Neutro',
      short: 'neutra',
      plural: 'neutros',
      metals: ['Oro rosa', 'Champagne', 'Plata', 'Oro amarillo'],
      colors: ['Perla', 'Champagne', 'Rosa palo', 'Beige', 'Verde salvia', 'Burdeos'],
      colorKeys: ['perla', 'nacar', 'cristal', 'champagne', 'rosa', 'beige', 'marron', 'gris', 'blanco', 'negro', 'salvia', 'burdeos'],
      swatches: ['#F0E6DA', '#E3C9A8', '#D9A7A0', '#D8CBB8', '#A8B5A0', '#7A3B47'],
      text: 'Los metales mixtos y los tonos intermedios suelen equilibrar la piel sin opacarla.'
    }
  };

  var LABELS = {
    occasion: {
      diario: 'uso diario',
      especial: 'una ocasión especial',
      trabajo: 'el trabajo',
      playa: 'la playa o vacaciones',
      regalo: 'un regalo'
    },
    style: {
      elegante: 'elegante',
      casual: 'casual',
      llamativo: 'llamativo',
      minimalista: 'minimalista',
      bohemio: 'bohemio',
      romantico: 'romántico',
      simbolico: 'con significado'
    },
    pieces: {
      collares: 'collares',
      pulseras: 'pulseras',
      ambos: 'collares y pulseras'
    },
    metal: {
      dorado: 'dorado',
      plateado: 'plateado',
      combinado: 'combinado',
      'no-importa': 'sin preferencia'
    },
    budget: {
      '10': 'hasta Ref. 10$',
      '20': 'Ref. 10 a 20$',
      '40': 'Ref. 20 a 40$',
      'sin-limite': 'sin límite'
    }
  };

  var BUDGET_MAX = { '10': 10, '20': 20, '40': 40, 'sin-limite': null };

  var STYLE_LABEL = {
    elegante: 'elegante',
    casual: 'casual',
    llamativo: 'con presencia',
    minimalista: 'minimalista',
    bohemio: 'bohemio',
    romantico: 'romántico',
    simbolico: 'con significado'
  };

  /* ── Vocabulario del catálogo ─────────────── */

  var COLOR_RULES = [
    { key: 'azul', label: 'azul', temp: 'frio', words: ['azul', 'marino', 'marina', 'celeste', 'aguamarina', 'turquesa', 'turco', 'polar'] },
    { key: 'verde', label: 'verde', temp: 'frio', words: ['verde', 'esmeralda', 'oliva', 'salvia'] },
    { key: 'morado', label: 'morado', temp: 'frio', words: ['morado', 'lila', 'lavanda', 'violeta'] },
    { key: 'fucsia', label: 'fucsia', temp: 'frio', words: ['fucsia', 'pink'] },
    { key: 'rosa', label: 'rosa', temp: 'neutro', words: ['rosa', 'rosado', 'pastel'] },
    { key: 'rojo', label: 'rojo', temp: 'calido', words: ['rojo', 'borgoña', 'burdeos', 'vino'] },
    { key: 'coral', label: 'coral', temp: 'calido', words: ['coral'] },
    { key: 'naranja', label: 'naranja', temp: 'calido', words: ['naranja', 'mandarina'] },
    { key: 'ambar', label: 'ámbar', temp: 'calido', words: ['ambar', 'miel', 'mostaza'] },
    { key: 'beige', label: 'beige', temp: 'calido', words: ['beige', 'arena', 'nude', 'champagne', 'caracol', 'caracola', 'concha', 'natural'] },
    { key: 'marron', label: 'marrón', temp: 'calido', words: ['marron', 'mocca', 'cafe', 'caramelo', 'terracota', 'tierra'] },
    { key: 'dorado', label: 'dorado', temp: 'calido', words: ['dorado', 'dorada', 'oro', 'gold', 'sol', 'bronce', 'cobre'] },
    { key: 'plateado', label: 'plateado', temp: 'frio', words: ['plata', 'plateado', 'plateada', 'acero', 'silver'] },
    { key: 'perla', label: 'perla', temp: 'neutro', words: ['perla', 'perlado', 'nacar', 'cristal', 'marfil'] },
    { key: 'blanco', label: 'blanco', temp: 'neutro', words: ['blanco', 'blanca'] },
    { key: 'negro', label: 'negro', temp: 'neutro', words: ['negro', 'negra', 'azabache', 'black'] },
    { key: 'gris', label: 'gris', temp: 'neutro', words: ['gris', 'plomo'] }
  ];

  var STYLE_RULES = {
    elegante: ['elegante', 'perla', 'nacar', 'cristal', 'encanto', 'aura', 'esencia', 'mil vueltas', 'reina', 'luna', 'sofisticado'],
    casual: ['sencillo', 'balines', 'hilo', '7 nudos', 'terlenca', 'mostacilla', 'polar', 'mocca', 'playero', 'brisa', 'diario'],
    llamativo: ['brillo', 'destello', 'glow', 'cristal', 'corazon', 'estrella', 'ser pink', 'happier', 'lazo', 'absoluto', 'tropical', 'black'],
    minimalista: ['sencillo', 'balines', 'cadenita', 'cadena', 'fino', 'inicial', 'punto', 'polar', 'linea'],
    bohemio: ['playero', 'caracol', 'caracola', 'marino', 'brisa', 'macrame', 'natural', 'tierra', 'mistic', 'mix'],
    romantico: ['rosa', 'corazon', 'amor', 'romance', 'perla', 'lazo', 'aura', 'deseos'],
    simbolico: ['virgen', 'san benito', 'guadalupe', 'rosario', 'fe', 'proteccion', 'protector', 'amuleto', 'ojo', 'ojito', 'devocion', 'deseos', 'suerte'],
    personalizado: ['inicial', 'madre', 'nombre', 'personalizado']
  };

  var STYLE_OCCASIONS = {
    elegante: ['especial', 'trabajo'],
    casual: ['diario', 'playa'],
    llamativo: ['especial', 'regalo'],
    minimalista: ['diario', 'trabajo'],
    bohemio: ['playa', 'diario'],
    romantico: ['regalo', 'especial'],
    simbolico: ['regalo', 'diario'],
    personalizado: ['regalo']
  };

  /* ── Utilidades de texto ─────────────────── */

  function norm(value) {
    return String(value == null ? '' : value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function hasWord(text, word) {
    var w = norm(word);
    if (!w) return false;
    return new RegExp('(^|[^a-z0-9])' + escapeRegExp(w) + '($|[^a-z0-9])').test(text);
  }

  /**
   * Las palabras largas se buscan como raíz ("corazon" → "corazones"),
   * las cortas exigen límite de palabra ("sol" no debe entrar en "absoluto").
   */
  function matchesToken(text, word) {
    var w = norm(word);
    if (!w) return false;
    if (w.length >= 5) return text.indexOf(w) !== -1;
    return hasWord(text, w);
  }

  function unique(list) {
    var out = [];
    list.forEach(function (item) {
      if (out.indexOf(item) === -1) out.push(item);
    });
    return out;
  }

  /* ── Etiquetas de producto ───────────────── */

  var tagCache = new WeakMap();

  function buildProductTags(product) {
    var text = norm((product && product.name) || '').replace(/[“”"]/g, ' ') + ' ' +
      norm((product && product.description) || '');

    var colors = [];
    var colorLabels = [];
    var temps = [];

    COLOR_RULES.forEach(function (rule) {
      var found = rule.words.some(function (word) { return matchesToken(text, word); });
      if (!found) return;
      colors.push(rule.key);
      colorLabels.push(rule.label);
      temps.push(rule.temp);
    });

    colors = unique(colors);
    colorLabels = unique(colorLabels);

    var temp = 'neutro';
    var warm = temps.indexOf('calido') !== -1;
    var cool = temps.indexOf('frio') !== -1;
    if (warm && !cool) temp = 'calido';
    else if (cool && !warm) temp = 'frio';
    else if (!warm && !cool) temp = 'neutro';

    var metal = null;
    if (matchesToken(text, 'combinado') || matchesToken(text, 'bicolor') || matchesToken(text, 'tricolor') || matchesToken(text, 'mix')) {
      metal = 'combinado';
    } else if (matchesToken(text, 'oro') || matchesToken(text, 'gold') || matchesToken(text, 'dorado') || matchesToken(text, 'bronce') || matchesToken(text, 'cobre')) {
      metal = 'dorado';
    } else if (matchesToken(text, 'plata') || matchesToken(text, 'plateado') || matchesToken(text, 'acero') || matchesToken(text, 'silver')) {
      metal = 'plateado';
    }

    var styles = [];
    Object.keys(STYLE_RULES).forEach(function (style) {
      var match = STYLE_RULES[style].some(function (word) { return matchesToken(text, word); });
      if (match) styles.push(style);
    });

    var occasions = [];
    styles.forEach(function (style) {
      (STYLE_OCCASIONS[style] || []).forEach(function (occasion) {
        if (occasions.indexOf(occasion) === -1) occasions.push(occasion);
      });
    });

    return {
      colors: colors,
      colorLabels: colorLabels,
      temp: temp,
      metal: metal,
      styles: styles,
      occasions: occasions
    };
  }

  function tagsFor(product) {
    if (!product || typeof product !== 'object') return buildProductTags(product);
    var cached = tagCache.get(product);
    if (!cached) {
      cached = buildProductTags(product);
      tagCache.set(product, cached);
    }
    return cached;
  }

  /* ── Análisis de tono ────────────────────── */

  function clampByte(value) {
    return Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
  }

  function rgbToHex(rgb) {
    if (!rgb) return '';
    var to = function (n) { return clampByte(n).toString(16).padStart(2, '0'); };
    return '#' + to(rgb.r) + to(rgb.g) + to(rgb.b);
  }

  function hexToRgb(hex) {
    var match = /^#?([a-f0-9]{6})$/i.exec(String(hex || ''));
    if (!match) return null;
    var n = parseInt(match[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHsl(rgb) {
    var r = rgb.r / 255;
    var g = rgb.g / 255;
    var b = rgb.b / 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var delta = max - min;
    var h = 0;
    var s = max === 0 ? 0 : delta / max;
    var l = (max + min) / 2;

    if (delta !== 0) {
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h: h, s: s, l: l };
  }

  function depthFromLuminance(lum) {
    if (lum > 0.68) return 'clara';
    if (lum > 0.44) return 'media';
    return 'profunda';
  }

  /**
   * Lectura orientativa a partir de un color de piel promedio.
   * No es una clasificación dermatológica ni una verdad absoluta.
   */
  function toneFromRgb(rgb, meta) {
    meta = meta || {};
    var safe = {
      r: clampByte(rgb && rgb.r),
      g: clampByte(rgb && rgb.g),
      b: clampByte(rgb && rgb.b)
    };
    var hsl = rgbToHsl(safe);
    var lum = (0.299 * safe.r + 0.587 * safe.g + 0.114 * safe.b) / 255;
    var warmth = (safe.r - safe.b) / Math.max(1, safe.r + safe.b);

    if (meta.eye) {
      var eye = norm(meta.eye);
      if (eye === 'blue' || eye === 'gray' || eye === 'green') {
        warmth -= 0.018;
      }
    }
    if (meta.hair) {
      var hair = norm(meta.hair);
      if (hair === 'red' || hair === 'auburn') {
        warmth += 0.018;
      }
    }

    var undertone = 'neutro';
    if (warmth >= 0.08 && hsl.s >= 0.08) undertone = 'calido';
    else if (warmth <= 0.035 || (hsl.h >= 200 && hsl.h <= 290)) undertone = 'frio';

    var palette = PALETTES[undertone];

    return {
      undertone: undertone,
      palette: palette,
      depth: depthFromLuminance(lum),
      skinHex: meta.skinHex || rgbToHex(safe),
      source: meta.source || 'local',
      confidence: meta.confidence || 'media',
      eye: meta.eye || '',
      hair: meta.hair || '',
      colors: meta.colors || []
    };
  }

  function toneFromYouCam(color) {
    color = color || {};
    var rgb = hexToRgb(color.skin_color) || { r: 196, g: 148, b: 118 };
    var base = toneFromRgb(rgb, {
      source: 'youcam',
      confidence: 'alta',
      skinHex: color.skin_color || rgbToHex(rgb),
      eye: color.eye_color_name || '',
      hair: color.hair_color_name || '',
      colors: [
        { label: 'Piel', hex: color.skin_color },
        { label: 'Ojos', hex: color.eye_color },
        { label: 'Labios', hex: color.lip_color },
        { label: 'Cabello', hex: color.hair_color }
      ].filter(function (item) { return item.hex; })
    });
    base.source = 'youcam';
    return base;
  }

  /* ── Recomendación ───────────────────────── */

  function hashId(value) {
    var str = String(value || '');
    var hash = 0;
    for (var i = 0; i < str.length; i += 1) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function paletteReason(item, tone) {
    var color = item.tags.colorLabels[0];
    if (!color || !tone || !tone.palette) return '';
    return 'Su tono ' + color + ' dialoga con tu paleta ' + tone.palette.short + '.';
  }

  function metalReason(profile) {
    if (!profile.metal || profile.metal === 'no-importa') return '';
    return 'El ' + LABELS.metal[profile.metal] + ' suma a los metales que te favorecen.';
  }

  function styleReason(profile) {
    return 'Tiene un aire ' + STYLE_LABEL[profile.style] + ', justo lo que buscas.';
  }

  function occasionReason(profile) {
    return 'Funciona para ' + LABELS.occasion[profile.occasion] + '.';
  }

  function budgetReason(profile) {
    return 'Entra en el presupuesto que elegiste.';
  }

  function rankProducts(products, profile, tone) {
    profile = profile || {};
    var maxBudget = profile.budgetMax != null
      ? Number(profile.budgetMax)
      : (BUDGET_MAX[profile.budget] != null ? BUDGET_MAX[profile.budget] : null);

    var pool = (Array.isArray(products) ? products : []).filter(function (product) {
      if (!product || product.activo === false) return false;
      if (product.category !== 'collares' && product.category !== 'pulseras') return false;
      // Las tobilleras no se pueden probar en la muñeca con el VTO de pulseras.
      if (norm(product.name).indexOf('tobillera') !== -1) return false;
      // Siempre mostramos collares y pulseras: sin filtro por tipo de pieza.
      return true;
    });

    return pool.map(function (product) {
      var tags = tagsFor(product);
      var score = 0;
      var reasons = [];

      if (tone && tone.palette) {
        var toneKey = tone.undertone || tone.palette.key || 'neutro';

        if (tags.temp === toneKey) {
          score += 12;
          if (paletteReason({ tags: tags }, tone)) reasons.push(paletteReason({ tags: tags }, tone));
        } else if (tags.temp === 'neutro') {
          score += 7;
        } else {
          score -= 4;
        }

        var overlap = tags.colors.filter(function (color) {
          return (tone.palette.colorKeys || []).indexOf(color) !== -1;
        });
        if (overlap.length) {
          score += Math.min(6, overlap.length * 3);
          var pr = paletteReason({ tags: tags }, tone);
          if (pr && reasons.indexOf(pr) === -1) reasons.push(pr);
        }

        if (profile.metal && profile.metal !== 'no-importa') {
          if (tags.metal === profile.metal) {
            score += 8;
            reasons.push(metalReason(profile));
          } else if (tags.metal === 'combinado') {
            score += 5;
            reasons.push(metalReason(profile));
          } else if (!tags.metal) {
            // El catálogo no siempre declara el metal: usamos afinidad de tono,
            // nunca una afirmación sobre el material.
            if (profile.metal === 'dorado' && tags.temp === 'calido') {
              score += 4;
              reasons.push('Sus tonos cálidos acompañan el dorado que elegiste.');
            } else if (profile.metal === 'plateado' && tags.temp === 'frio') {
              score += 4;
              reasons.push('Sus tonos fríos acompañan la plata que elegiste.');
            } else if (profile.metal === 'combinado' && (tags.temp === 'neutro' || tags.colors.length > 1)) {
              score += 4;
              reasons.push('Juega con varios tonos, como buscabas.');
            }
          } else {
            score -= 2;
          }
        }
      }

      if (profile.style && tags.styles.indexOf(profile.style) !== -1) {
        score += 18;
        reasons.push(styleReason(profile));
      }

      if (profile.occasion && tags.occasions.indexOf(profile.occasion) !== -1) {
        score += 12;
        reasons.push(occasionReason(profile));
      }

      if (maxBudget != null) {
        if (Number(product.price) <= maxBudget) {
          score += 8;
          reasons.push(budgetReason(profile));
        } else {
          score -= 18;
        }
      }

      if (Number(product.stock) > 0) score += 2;

      // Desempate estable: no cambia entre renders ni sesiones.
      score += (hashId(product.id) % 7) / 10;

      return {
        product: product,
        tags: tags,
        score: score,
        reasons: unique(reasons.filter(Boolean)).slice(0, 3)
      };
    }).sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (Number(a.product.price) !== Number(b.product.price)) return Number(a.product.price) - Number(b.product.price);
      return String(a.product.id).localeCompare(String(b.product.id));
    });
  }

  function pickRecommendations(ranked, profile, count, offset) {
    var total = Math.max(1, count || 3);
    profile = profile || {};
    var pool = Array.isArray(ranked) ? ranked.slice() : [];
    if (offset) {
      var safeOffset = offset % Math.max(1, pool.length);
      pool = pool.slice(safeOffset).concat(pool.slice(0, safeOffset));
    }

    var picked = [];
    // La selección siempre incluye un collar y una pulsera cuando hay disponibilidad.
    ['collares', 'pulseras'].forEach(function (category) {
      var found = pool.filter(function (item) {
        return item.product.category === category && picked.indexOf(item) === -1;
      })[0];
      if (found) picked.push(found);
    });

    pool.forEach(function (item) {
      if (picked.length >= total) return;
      if (picked.indexOf(item) === -1) picked.push(item);
    });

    return picked.slice(0, total);
  }

  function primaryStyle(item) {
    return item && item.tags && item.tags.styles.length ? item.tags.styles[0] : '';
  }

  /**
   * Curaduría de tres roles: mejor combinación, alternativa y propuesta
   * diferente. Trabaja siempre sobre el ranking real, sin inventar piezas.
   */
  function curateRecommendations(ranked, profile, count) {
    var total = Math.max(1, count || 3);
    profile = profile || {};

    if (!Array.isArray(ranked) || !ranked.length) return [];

    var picked = [];
    var used = {};

    function take(item, role) {
      if (!item) return false;
      var id = String(item.product.id);
      if (used[id]) return false;
      used[id] = true;
      picked.push({
        product: item.product,
        tags: item.tags,
        score: item.score,
        reasons: item.reasons,
        why: whyFor(item),
        role: role
      });
      return true;
    }

    var best = ranked[0];
    take(best, 'best');

    // La alternativa prioriza otro tipo de pieza para alternar collar y pulsera.
    var alternative = ranked.filter(function (item) {
      return !used[String(item.product.id)] && item.product.category !== best.product.category;
    })[0] || null;

    if (!alternative) {
      alternative = ranked.filter(function (item) {
        return !used[String(item.product.id)] && primaryStyle(item) !== primaryStyle(best);
      })[0] || null;
    }
    if (!alternative) {
      alternative = ranked.filter(function (item) {
        return !used[String(item.product.id)] && item.tags.temp !== best.tags.temp;
      })[0] || null;
    }
    if (!alternative) {
      alternative = ranked.filter(function (item) {
        return !used[String(item.product.id)];
      })[0] || null;
    }
    take(alternative, 'alternative');

    // La propuesta diferente busca un estilo fuera del perfil o un tercer tipo.
    var wildcard = ranked.filter(function (item) {
      return !used[String(item.product.id)] &&
        item.product.category !== best.product.category &&
        (!alternative || item.product.category !== alternative.product.category);
    })[0] || null;

    if (!wildcard) {
      wildcard = ranked.filter(function (item) {
        return !used[String(item.product.id)] &&
          profile.style &&
          item.tags.styles.indexOf(profile.style) === -1;
      })[0] || null;
    }
    if (!wildcard) {
      wildcard = ranked.filter(function (item) {
        return !used[String(item.product.id)] &&
          (!alternative || primaryStyle(item) !== primaryStyle(alternative));
      })[0] || null;
    }
    if (!wildcard) {
      wildcard = ranked.filter(function (item) {
        return !used[String(item.product.id)];
      })[0] || null;
    }
    take(wildcard, 'wildcard');

    ranked.forEach(function (item) {
      if (picked.length < total) take(item, 'more');
    });

    return picked.slice(0, total);
  }

  function whyFor(item) {
    if (!item) return '';
    var reasons = (item.reasons || []).slice(0, 2);
    if (!reasons.length) return 'Es una de las piezas más versátiles del catálogo.';
    return reasons.join(' ');
  }

  return {
    PALETTES: PALETTES,
    LABELS: LABELS,
    BUDGET_MAX: BUDGET_MAX,
    STYLE_LABEL: STYLE_LABEL,
    norm: norm,
    hasWord: hasWord,
    buildProductTags: buildProductTags,
    tagsFor: tagsFor,
    rgbToHex: rgbToHex,
    hexToRgb: hexToRgb,
    rgbToHsl: rgbToHsl,
    toneFromRgb: toneFromRgb,
    toneFromYouCam: toneFromYouCam,
    rankProducts: rankProducts,
    pickRecommendations: pickRecommendations,
    curateRecommendations: curateRecommendations,
    whyFor: whyFor
  };
});
