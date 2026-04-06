/* =============================================
   JM CATÁLOGOS WEB — app.js (multi-tenant)
   Detecta storeId por subdominio → fetch config
   ============================================= */

'use strict';

let CONFIG   = {};
let PRODUCTS = [];

// ══════════════════════════════════════════════
// API — backend multi-tenant
// ══════════════════════════════════════════════

const API_URL = 'https://aguamarina-backend-q7gd.onrender.com';

// Detecta storeId desde el subdominio
function detectStoreId() {
  // 1. Query param (override manual)
  const param = new URLSearchParams(window.location.search).get('store');
  if (param) return param;

  // 2. Subdominio: aguamarina.tucatalogo.com → aguamarina
  const host = window.location.hostname;
  const parts = host.split('.');
  // GitHub Pages: username.github.io → ignorar
  if (host.includes('github.io')) return null;

  if (parts.length >= 3 && !['www', 'pages', 'dev'].includes(parts[0])) {
    return parts[0];
  }

  // 3. Localhost / dev → aguamarina por defecto
  return 'aguamarina';
}

const STORE_ID = 'aguamarina';

function apiHeaders(extra = {}) {
  return { 'x-store-id': STORE_ID, ...extra };
}

function lsKey(key) {
  return `${STORE_ID}_${key}`;
}

// ══════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════

function formatPrice(amount) {
  const sym = CONFIG.currencySymbol || '$';
  const n = Math.round(Number(amount));
  return `Ref. ${n}${sym}`;
}

function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

function showToast(msg, duration = 2400) {
  const toast = document.getElementById('toast');
  const text  = document.getElementById('toast-msg');
  if (!toast || !text) return;
  text.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

function sanitize(str) {
  const d = document.createElement('div');
  d.textContent = String(str || '');
  return d.innerHTML;
}

function $(id) { return document.getElementById(id); }

function setText(id, val) {
  const el = $(id);
  if (el) el.textContent = val;
}

function setHTML(id, val) {
  const el = $(id);
  if (el) el.innerHTML = val;
}

function show(id) { const el = $(id); if (el) el.style.display = ''; }
function hide(id) { const el = $(id); if (el) el.style.display = 'none'; }

function setAttr(id, attr, val) {
  const el = $(id);
  if (el && val) el.setAttribute(attr, val);
}

// ══════════════════════════════════════════════
// CONFIG — detecta subdominio → fetch al backend
// ══════════════════════════════════════════════

async function loadConfig() {
  CONFIG = { storeId: STORE_ID };

  try {
    const res = await fetch(`${API_URL}/api/config?store=${STORE_ID}`);
    if (res.ok) {
      const apiConfig = await res.json();
      CONFIG = { ...CONFIG, ...apiConfig };
    } else {
      console.error(`Store "${STORE_ID}" not found. HTTP ${res.status}`);
    }
  } catch (err) {
    console.error('Error loading config:', err);
  }
}

// ══════════════════════════════════════════════
// INJECT CONFIG — aplica config al DOM
// ══════════════════════════════════════════════

function injectConfig() {
  // Title
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = CONFIG.storeName || 'Catálogo Web';

  // Favicon
  if (CONFIG.faviconUrl) {
    setAttr('favicon', 'href', CONFIG.faviconUrl);
  }

  // Meta description
  const metaDesc = document.getElementById('meta-description');
  if (metaDesc && CONFIG.storeName) {
    metaDesc.setAttribute('content', `${CONFIG.storeName} — ${CONFIG.storeTagline || 'Catálogo web con pedidos por WhatsApp'}`);
  }

  // Store name (all pages)
  const nameEl = $('store-name');
  if (nameEl && CONFIG.storeName) {
    const parts = CONFIG.storeName.split(' ');
    nameEl.innerHTML = parts.length > 1
      ? parts.slice(0, -1).join(' ') + ' <em>' + parts[parts.length - 1] + '</em>'
      : CONFIG.storeName;
  }

  // Store tagline
  if (CONFIG.storeTagline) setText('store-tagline', CONFIG.storeTagline);

  // Social links
  if (CONFIG.instagram) setAttr('ig-link', 'href', CONFIG.instagram);
  if (CONFIG.tiktok) setAttr('tt-link', 'href', CONFIG.tiktok);

  // WhatsApp FAB
  const waFab = $('wa-fab');
  if (waFab && CONFIG.whatsappNumber) {
    waFab.href = `https://wa.me/${CONFIG.whatsappNumber}?text=Hola!%20vi%20su%20tienda%20online%20%E2%9C%A8`;
  }

  // Hero
  if (CONFIG.logoUrl) {
    setAttr('store-logo', 'src', CONFIG.logoUrl);
    setAttr('store-logo', 'alt', CONFIG.storeName || 'Logo');
  }
  if (CONFIG.heroEyebrow) setText('hero-eyebrow', CONFIG.heroEyebrow);
  if (CONFIG.heroTitle) setHTML('hero-title', CONFIG.heroTitle);

  if (CONFIG.location) {
    setText('hero-location', CONFIG.location);
    show('hero-location-wrap');
    show('hero-info-sep');
  }
  if (CONFIG.phone) setText('hero-phone', CONFIG.phone);
  if (CONFIG.phoneLink) {
    setAttr('hero-phone-link', 'href', CONFIG.phoneLink);
    show('hero-phone-link');
  }

  // Categories — skip if already rendered in HTML (SSR optimization)
  const catCards = $('cat-cards');
  if (catCards && !catCards.children.length) {
    renderCategories();
  }

  // About section — already visible in HTML, just update if config differs
  if (CONFIG.about?.enabled) {
    if (CONFIG.about.imageUrl) {
      setAttr('about-image', 'src', CONFIG.about.imageUrl);
      setAttr('about-image', 'alt', CONFIG.storeName || '');
    }
    if (CONFIG.about.eyebrow) setText('about-eyebrow', CONFIG.about.eyebrow);
    if (CONFIG.about.title) setHTML('about-title', CONFIG.about.title);
    if (CONFIG.about.body) setText('about-body', CONFIG.about.body);

    const badgesEl = $('about-badges');
    if (badgesEl && CONFIG.about.badges?.length) {
      badgesEl.innerHTML = CONFIG.about.badges.map(b =>
        `<div class="about-badge"><span>${b.icon}</span><span>${sanitize(b.text)}</span></div>`
      ).join('');
    }
  }

  // Ebook section — already visible in HTML
  if (CONFIG.ebook?.enabled) {
    if (CONFIG.ebook.imageUrl) setAttr('ebook-image', 'src', CONFIG.ebook.imageUrl);
    if (CONFIG.ebook.eyebrow) setText('ebook-eyebrow', CONFIG.ebook.eyebrow);
    if (CONFIG.ebook.title) setHTML('ebook-title', CONFIG.ebook.title);
    if (CONFIG.ebook.body) setText('ebook-body', CONFIG.ebook.body);
    if (CONFIG.ebook.buttonText) setText('ebook-btn', CONFIG.ebook.buttonText);
    const waMsg = CONFIG.ebook.whatsappMessage || `Hola! quiero información sobre el ebook`;
    const ebookBtn = $('ebook-btn');
    if (ebookBtn) {
      ebookBtn.href = `https://wa.me/${CONFIG.whatsappNumber || ''}?text=${encodeURIComponent(waMsg)}`;
    }
  }

  // Footer
  if (CONFIG.storeName) {
    const footerName = $('footer-name');
    if (footerName) {
      const parts = CONFIG.storeName.split(' ');
      footerName.innerHTML = parts.length > 1
        ? parts.slice(0, -1).join(' ') + ' <em>' + parts[parts.length - 1] + '</em>'
        : CONFIG.storeName;
    }
  }
  if (CONFIG.storeTagline) setText('footer-tagline', CONFIG.storeTagline);
  if (CONFIG.location) {
    setText('footer-location', CONFIG.location);
    show('footer-location-wrap');
  }
  if (CONFIG.phone) {
    setText('footer-phone', CONFIG.phone);
    setAttr('footer-phone', 'href', CONFIG.phoneLink || '#');
    show('footer-phone-wrap');
  }
  if (CONFIG.instagram) {
    setAttr('footer-ig', 'href', CONFIG.instagram);
    if (CONFIG.instagramHandle) setText('footer-ig-handle', CONFIG.instagramHandle);
    show('footer-ig');
  }
  if (CONFIG.tiktok) {
    setAttr('footer-tt', 'href', CONFIG.tiktok);
    if (CONFIG.tiktokHandle) setText('footer-tt-handle', CONFIG.tiktokHandle);
    show('footer-tt');
  }

  // Admin pages
  if (CONFIG.storeName) {
    setText('admin-login-store', CONFIG.storeName);
    setText('admin-topbar-store', CONFIG.storeName);
  }
}

// ══════════════════════════════════════════════
// CATEGORIES — render dinámico desde config o auto-detect
// ══════════════════════════════════════════════

const DEFAULT_CATEGORIES = [
  { id: 'pulseras', label: '🧵 Pulseras', imageUrl: '', ctaText: 'Ver colección →' },
  { id: 'collares', label: '📿 Collares', imageUrl: '', ctaText: 'Ver colección →' },
  { id: 'mayoristas', label: '📦 Mayoristas', imageUrl: '', ctaText: 'Ver packs →' }
];

function getCategories() {
  if (CONFIG.categories?.length) return CONFIG.categories;
  // Auto-detect from products
  const cats = [...new Set(PRODUCTS.map(p => p.category))];
  return cats.map(id => DEFAULT_CATEGORIES.find(d => d.id === id) || { id, label: id, imageUrl: '', ctaText: 'Ver →' });
}

function renderCategories() {
  const container = $('cat-cards');
  if (!container) return;

  const cats = getCategories();
  if (!cats.length) return;

  container.innerHTML = cats.map(cat => `
    <div class="cat-card" data-cat="${sanitize(cat.id)}">
      <div class="cat-card__img-wrap">
        <img src="${sanitize(cat.imageUrl || `https://placehold.co/600x400/D6F2EE/1A8A78?text=${encodeURIComponent(cat.label)}`)}"
             alt="${sanitize(cat.label)}" class="cat-card__img"
             onerror="this.src='https://placehold.co/600x400/D6F2EE/1A8A78?text=${encodeURIComponent(cat.label)}'">
        <div class="cat-card__overlay"></div>
        <div class="cat-card__content">
          <span class="cat-card__label">${sanitize(cat.label)}</span>
          <span class="cat-card__cta">${sanitize(cat.ctaText || 'Ver →')}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════
// PRODUCTOS — carga desde API → fallback productos.json
// ══════════════════════════════════════════════

function mapProduct(p) {
  if (p.codigo) {
    return {
      id:          p.codigo,
      name:        p.nombre,
      price:       p.precio,
      category:    p.categoria,
      description: p.descripcion || '',
      image:       p.imagen || '',
      stock:       p.stock || 0,
    };
  }
  return p;
}

async function loadProducts() {
  try {
    const res = await fetch(`${API_URL}/api/productos`, {
      headers: apiHeaders()
    });
    const data = await res.json();
    PRODUCTS = data.filter(p => p.activo !== false).map(mapProduct);
  } catch {
    try {
      const res = await fetch('productos.json');
      PRODUCTS = await res.json();
    } catch {
      PRODUCTS = [];
    }
  }
}

function getProductById(id) {
  return PRODUCTS.find(p => p.id === String(id));
}

// ══════════════════════════════════════════════
// CART
// ══════════════════════════════════════════════

function getCart() {
  try { return JSON.parse(localStorage.getItem(lsKey('cart_v2'))) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(lsKey('cart_v2'), JSON.stringify(cart));
  updateCartUI();
}

function addToCart(product) {
  const cart     = getCart();
  const pid      = String(product.id);
  const existing = cart.find(i => i.id === pid);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: pid, name: product.name, price: product.price, image: product.image || '', qty: 1 });
  }
  saveCart(cart);
  showToast(`✓ ${product.name} agregado`);
}

function removeFromCart(id)  { saveCart(getCart().filter(i => i.id !== id)); }
function clearCart()         { localStorage.removeItem(lsKey('cart_v2')); updateCartUI(); }
function cartTotal()         { return getCart().reduce((s, i) => s + i.price * i.qty, 0); }
function cartCount()         { return getCart().reduce((s, i) => s + i.qty, 0); }

function setQty(id, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;
  if (qty < 1) { removeFromCart(id); return; }
  item.qty = qty;
  saveCart(cart);
}

function updateCartUI() {
  const count  = cartCount();
  const total  = cartTotal();
  const badge  = $('cart-badge');
  const bar    = $('bottom-cart-bar');
  const barCnt = $('bcb-count');
  const barTot = $('bcb-total');
  if (badge) { badge.textContent = count; badge.classList.toggle('visible', count > 0); }
  if (bar) {
    bar.classList.toggle('visible', count > 0);
    if (barCnt) barCnt.textContent = `${count} producto${count !== 1 ? 's' : ''}`;
    if (barTot) barTot.textContent = formatPrice(total);
  }
}

// ══════════════════════════════════════════════
// WHATSAPP
// ══════════════════════════════════════════════

function buildWhatsAppURL() {
  const cart = getCart();
  if (!cart.length) return '#';
  const lines   = cart.map(i => `• ${i.name} x${i.qty} — ${formatPrice(i.price * i.qty)}`).join('\n');
  const total   = formatPrice(cartTotal());
  const name    = CONFIG.storeName || 'Tienda';
  const number  = CONFIG.whatsappNumber || '';
  const message = `Hola! quiero hacer un pedido en *${name}* ✨\n\n${lines}\n\n*Total: ${total}*\n\n¿Me confirmás disponibilidad y coordinamos el envío? 🚚`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

// ══════════════════════════════════════════════
// CATALOG  (index.html)
// ══════════════════════════════════════════════

async function initCatalog() {
  await loadConfig();
  injectConfig();
  await loadProducts();
  updateCartUI();
  initCatCards();

  const catParam = getParam('cat');
  if (catParam) openCategory(catParam);
}

function getCatLabel(id) {
  const cats = getCategories();
  const cat = cats.find(c => c.id === id);
  return cat ? cat.label : null;
}

function initCatCards() {
  document.querySelectorAll('.cat-card').forEach(card => {
    card.addEventListener('click', () => {
      openCategory(card.dataset.cat);
    });
  });

  $('catalog-back')?.addEventListener('click', () => {
    closeCategory();
  });
}

function openCategory(cat) {
  const cards = $('cat-cards');
  const gridWrap = $('catalog-grid-wrap');

  cards.style.opacity = '0';
  cards.style.transform = 'translateY(-12px)';

  setTimeout(() => {
    cards.style.display = 'none';
    gridWrap.style.display = 'block';

    const titleEl = $('catalog-active-title');
    if (titleEl) titleEl.textContent = getCatLabel(cat) || cat;

    const products = PRODUCTS.filter(p => p.category === cat);
    renderGrid(products);

    gridWrap.classList.add('visible');
    const navH = $('navbar').offsetHeight;
    const top = document.querySelector('.catalog-main').offsetTop - navH;
    window.scrollTo({ top, behavior: 'smooth' });
  }, 280);
}

function closeCategory() {
  const cards = $('cat-cards');
  const gridWrap = $('catalog-grid-wrap');

  gridWrap.classList.remove('visible');

  setTimeout(() => {
    gridWrap.style.display = 'none';
    cards.style.display = 'grid';

    cards.style.opacity = '1';
    cards.style.transform = 'translateY(0)';

    const navH = $('navbar').offsetHeight;
    const top = document.querySelector('.catalog-main').offsetTop - navH;
    window.scrollTo({ top, behavior: 'smooth' });
  }, 300);
}

function cloudinaryThumb(url, size = 400) {
  if (!url || !url.includes('cloudinary')) return url;
  return url.replace('/upload/', `/upload/w_${size},h_${size},c_fill,f_auto,q_auto:eco/`);
}

function renderCard(p) {
  const imgSrc = cloudinaryThumb(p.image) || `https://placehold.co/400x400/D6F2EE/1A8A78?text=${encodeURIComponent(p.name)}`;
  return `
    <article class="product-card" onclick="goToProduct('${p.id}')">
      <div class="product-card__media">
        <img class="product-card__img"
          src="${sanitize(imgSrc)}"
          alt="${sanitize(p.name)}"
          loading="lazy"
          onerror="this.src='https://placehold.co/400x400/D6F2EE/1A8A78?text=✨'">
      </div>
      <div class="product-card__body">
        <div class="product-card__name">${sanitize(p.name)}</div>
        <div class="product-card__price">${formatPrice(p.price)}</div>
        <button class="product-card__btn"
          onclick="event.stopPropagation(); quickAddToCart('${p.id}', this)">
          Añadir al carrito
        </button>
      </div>
    </article>`;
}

function renderGrid(products) {
  const grid = $('products-grid');
  if (!grid) return;
  if (!products.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--mid)">
      <div style="font-size:3rem;margin-bottom:16px;opacity:.3">💎</div>
      <p style="font-family:var(--font-display);font-size:1.3rem;color:var(--dark)">Sin productos en esta categoría</p>
    </div>`;
    return;
  }
  grid.innerHTML = products.map(p => renderCard(p)).join('');
}

function goToProduct(id) { window.location.href = `product.html?id=${id}`; }

function quickAddToCart(id, btn) {
  const product = getProductById(id);
  if (!product) { showToast('Producto no encontrado'); return; }
  addToCart(product);
  const orig = btn.textContent;
  btn.textContent = '✓ Agregado';
  setTimeout(() => { btn.textContent = orig; }, 1500);
}

// ══════════════════════════════════════════════
// PRODUCT DETAIL  (product.html)
// ══════════════════════════════════════════════

async function initProductDetail() {
  await loadConfig();
  injectConfig();
  await loadProducts();
  updateCartUI();

  const product = getProductById(getParam('id'));
  if (!product) {
    $('product-detail').innerHTML = `
      <div style="text-align:center; padding:80px 20px;">
        <div style="font-size:3rem; margin-bottom:16px; opacity:.3">💎</div>
        <p style="font-family:var(--font-display); font-size:1.4rem; color:var(--mid);">Producto no encontrado</p>
        <a href="index.html" style="color:var(--teal); font-size:.85rem; margin-top:14px; display:block;">← Volver</a>
      </div>`;
    return;
  }
  renderProductDetail(product);
}

function renderProductDetail(p) {
  const imgSrc = cloudinaryThumb(p.image, 800) || `https://placehold.co/600x600/D6F2EE/1A8A78?text=${encodeURIComponent(p.name)}`;
  const cat = CONFIG.categories?.find(c => c.id === p.category);
  const backUrl = `index.html?cat=${encodeURIComponent(p.category)}`;
  document.title = `${p.name} · ${CONFIG.storeName || 'Catálogo Web'}`;
  $('product-detail').innerHTML = `
    <div class="product-detail__gallery">
      <a href="${backUrl}" class="back-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
        <span>Volver</span>
      </a>
      <img src="${sanitize(imgSrc)}" alt="${sanitize(p.name)}"
        onerror="this.src='https://placehold.co/600x600/D6F2EE/1A8A78?text=✨'">
    </div>
    <div class="product-detail__info">
      <p class="product-detail__cat">${sanitize(cat ? cat.label : p.category)}</p>
      <h1 class="product-detail__name">${sanitize(p.name)}</h1>
      <p class="product-detail__price">${formatPrice(p.price)}</p>
      ${p.description ? `<p class="product-detail__desc">${sanitize(p.description)}</p>` : ''}
      <div class="product-detail__actions">
        <button class="btn-primary" id="detail-add-btn"
          onclick="addToCart(${JSON.stringify(p).replace(/"/g,'&quot;')}); this.textContent='✓ Agregado!'">
          Agregar al carrito
        </button>
        <a href="cart.html" class="btn-outline">Ver carrito</a>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════
// CART PAGE  (cart.html)
// ══════════════════════════════════════════════

async function initCart() {
  await loadConfig();
  injectConfig();
  updateCartUI();
  renderCartPage();
}

function renderCartPage() {
  const itemsEl   = $('cart-items');
  const summaryEl = $('cart-summary');
  if (!itemsEl) return;

  const cart = getCart();

  if (!cart.length) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty__icon">🛒</div>
        <p class="cart-empty__title">Tu carrito está vacío</p>
        <p class="cart-empty__sub">Descubrí nuestras piezas únicas ✨</p>
        <a href="index.html" class="btn-primary"
          style="display:inline-flex; padding:13px 28px; text-decoration:none; border-radius:var(--r-md);">
          Ver catálogo
        </a>
      </div>`;
    if (summaryEl) summaryEl.innerHTML = '';
    return;
  }

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img class="cart-item__img"
        src="${sanitize(cloudinaryThumb(item.image, 150) || '')}"
        alt="${sanitize(item.name)}"
        onerror="this.style.background='var(--teal-ultra)'">
      <div class="cart-item__info">
        <div class="cart-item__name">${sanitize(item.name)}</div>
        <div class="cart-item__unit-price">${formatPrice(item.price)} c/u</div>
        <div class="qty-row">
          <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
        <span class="cart-item__subtotal">${formatPrice(item.price * item.qty)}</span>
        <button class="cart-item__remove" onclick="removeItemAndRefresh('${item.id}')">🗑</button>
      </div>
    </div>`).join('');

  const count = cartCount();
  const waUrl = buildWhatsAppURL();

  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="cart-summary">
        <div class="summary-row"><span>${count} producto${count !== 1 ? 's' : ''}</span><span style="color:var(--teal-dark)">✓</span></div>
        <div class="summary-row"><span>Envío</span><span style="color:var(--teal-dark)">A coordinar 🚚</span></div>
        <hr class="summary-divider">
        <div class="summary-total">
          <span class="summary-total__label">Total</span>
          <span class="summary-total__value">${formatPrice(cartTotal())}</span>
        </div>
      </div>
      <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
        Enviar pedido por WhatsApp
      </a>
      <button class="btn-cancel" style="width:100%; margin-top:8px;" onclick="confirmClear()">Vaciar carrito</button>`;
  }
}

function changeQty(id, delta) {
  const item = getCart().find(i => i.id === id);
  if (!item) return;
  const newQty = item.qty + delta;
  if (newQty < 1) { removeItemAndRefresh(id); return; }
  setQty(id, newQty);
  renderCartPage();
}

function removeItemAndRefresh(id) { removeFromCart(id); renderCartPage(); }
function confirmClear() { if (confirm('¿Vaciar carrito?')) { clearCart(); renderCartPage(); } }

// ══════════════════════════════════════════════
// ADMIN  (admin.html) — backend multi-tenant
// ══════════════════════════════════════════════

let _editingId = null;

async function initAdmin() {
  await loadConfig();
  injectConfig();

  if (localStorage.getItem(lsKey('admin_logged'))) await showAdminPanel();

  $('login-btn')     ?.addEventListener('click', doLogin);
  $('login-pass')    ?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  $('add-product-btn')?.addEventListener('click', () => openProductModal(null));
  $('modal-close')   ?.addEventListener('click', closeProductModal);
  $('modal-cancel')  ?.addEventListener('click', closeProductModal);
  $('save-product-btn')?.addEventListener('click', saveProduct);
  $('admin-logout')  ?.addEventListener('click', doLogout);
  $('search-products')?.addEventListener('input', renderAdminTable);
  $('filter-category')?.addEventListener('change', renderAdminTable);
  $('product-modal') ?.addEventListener('click', e => {
    if (e.target.id === 'product-modal') closeProductModal();
  });
  $('btn-change-img')?.addEventListener('click', () => $('f-image-file')?.click());
}

async function doLogin() {
  const pass = $('login-pass').value;
  const errEl = $('login-error');
  errEl.style.display = 'none';
  try {
    const res = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...apiHeaders() },
      body: JSON.stringify({ password: pass })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem(lsKey('admin_logged'), pass);
      showAdminPanel();
    } else {
      errEl.textContent = data.error || 'Contraseña incorrecta';
      errEl.style.display = 'block';
    }
  } catch {
    errEl.textContent = 'Error de conexión';
    errEl.style.display = 'block';
  }
}

function doLogout() { localStorage.removeItem(lsKey('admin_logged')); window.location.reload(); }

async function showAdminPanel() {
  $('login-page').classList.add('hidden');
  $('admin-panel').classList.remove('hidden');
  await loadProducts();
  renderAdminTable();
}

function renderAdminTable() {
  const tbody = $('admin-tbody');
  if (!tbody) return;

  const searchTerm = $('search-products')?.value?.toLowerCase() || '';
  const categoryFilter = $('filter-category')?.value || '';

  let products = PRODUCTS.filter(p => {
    const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm);
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const countEl = $('product-count');
  if (countEl) countEl.textContent = products.length;

  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--light-text)">
      ${searchTerm || categoryFilter ? 'No se encontraron productos' : 'Sin productos. ¡Agrega el primero!'}</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => {
    return `<tr>
      <td><img class="table-thumb" src="${sanitize(p.image||'')}" alt=""
        onerror="this.style.background='var(--teal-ultra)'"></td>
      <td><span class="table-name">${sanitize(p.name)}</span></td>
      <td><span class="cat-badge">${sanitize(getCatLabel(p.category) || p.category)}</span></td>
      <td><span class="table-price">${formatPrice(p.price)}</span></td>
      <td>
        <div class="row-actions">
          <button class="btn-edit" onclick="editProduct('${p.id}')">✏️ Editar</button>
          <button class="btn-del"  onclick="deleteProduct('${p.id}')">🗑️ Eliminar</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function editProduct(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (product) openProductModal(product);
}

function openProductModal(product) {
  _editingId = product ? product.id : null;
  $('modal-title').textContent = product ? 'Editar Producto' : 'Nuevo Producto';
  $('f-name').value            = product?.name     || '';
  $('f-price').value           = product?.price    || '';
  $('f-category').value        = product?.category || 'pulseras';
  $('f-image-url').value       = product?.image    || '';

  const fileInput = $('f-image-file');
  if (fileInput) fileInput.value = '';

  const uploadArea = $('upload-area');
  const preview    = $('img-preview');
  const previewImg = $('img-preview-img');

  if (product?.image) {
    uploadArea.style.display = 'none';
    previewImg.src = product.image;
    preview.style.display = 'block';
  } else {
    uploadArea.style.display = 'flex';
    previewImg.src = '';
    preview.style.display = 'none';
  }
  $('product-modal').classList.add('open');
}

function closeProductModal() {
  $('product-modal').classList.remove('open');
  _editingId = null;
}

async function saveProduct() {
  const name = $('f-name').value.trim();
  const price = parseInt($('f-price').value);
  if (!name || isNaN(price) || price <= 0) { showToast('⚠️ Completá nombre y precio'); return; }

  const password = localStorage.getItem(lsKey('admin_logged')) || '';
  const data = {
    nombre: name,
    precio: price,
    categoria: $('f-category').value,
  };

  try {
    if (_editingId) {
      const res = await fetch(`${API_URL}/api/productos/${_editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...apiHeaders({ 'x-admin-password': password }) },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al actualizar');
      }
      closeProductModal();
      showToast('✓ Producto actualizado');
    } else {
      data.codigo = 'NEW-' + Date.now();
      data.imagen = $('f-image-url').value.trim() || '';
      const res = await fetch(`${API_URL}/api/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...apiHeaders({ 'x-admin-password': password }) },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al crear');
      }
      closeProductModal();
      showToast('✓ Producto creado');
    }

    loadProducts().then(() => renderAdminTable());
  } catch (e) {
    showToast('⚠️ Error: ' + e.message);
  }
}

async function deleteProduct(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  try {
    const password = localStorage.getItem(lsKey('admin_logged')) || '';
    const res = await fetch(`${API_URL}/api/productos/${id}`, {
      method: 'DELETE',
      headers: apiHeaders({ 'x-admin-password': password }),
    });
    if (!res.ok) throw new Error('Error al eliminar');

    await loadProducts();
    renderAdminTable();
    showToast('✓ Producto eliminado');
  } catch (e) {
    showToast('⚠️ Error: ' + e.message);
  }
}
