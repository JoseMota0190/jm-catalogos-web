/* =============================================
   AGUAMARINA STORE — app.js (versión estática)
   Sin backend · JSON local · Netlify ready
   ============================================= */

'use strict';

// Cache global — productos cargados una sola vez
let CONFIG   = {};
let PRODUCTS = [];

// ══════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════

function formatPrice(amount) {
  const n = Math.round(Number(amount));
  return `Ref. ${n}$`;
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

function categoryLabel(cat) {
  const map = {
    collares:   '📿 Collares',
    pulseras:   '🧵 Pulseras',
    mayoristas: '📦 Mayoristas',
  };
  return map[cat] || cat;
}

function sanitize(str) {
  const d = document.createElement('div');
  d.textContent = String(str || '');
  return d.innerHTML;
}

// ══════════════════════════════════════════════
// CONFIG — lee config.json
// ══════════════════════════════════════════════

async function loadConfig() {
  try {
    const res = await fetch('config.json');
    CONFIG    = await res.json();
  } catch {
    CONFIG = {
      storeName:      'Aguamarina Store',
      whatsappNumber: '584243286929',
      currency:       'USD',
      currencySymbol: '$',
      instagram:      'https://instagram.com/aguamarina___store',
      tiktok:         'https://tiktok.com/@aguamarina__store',
      location:       'Calabozo, Edo. Guárico · Venezuela',
      phone:          '+58 424-3286929',
      phoneLink:      'https://wa.me/584243286929',
    };
  }

  // Nombre en el header
  const nameEl = document.getElementById('store-name');
  if (nameEl && CONFIG.storeName) {
    const parts = CONFIG.storeName.split(' ');
    nameEl.innerHTML = parts.length > 1
      ? parts.slice(0,-1).join(' ') + ' <em>' + parts[parts.length-1] + '</em>'
      : CONFIG.storeName;
  }

  // WhatsApp FAB
  const waFab = document.getElementById('wa-fab');
  if (waFab && CONFIG.whatsappNumber) {
    waFab.href = `https://wa.me/${CONFIG.whatsappNumber}?text=Hola!%20vi%20su%20tienda%20online%20%F0%9F%8C%8A%E2%9C%A8`;
  }

  // Links sociales del header (ids en index.html)
  const igLink = document.getElementById('ig-link');
  const ttLink = document.getElementById('tt-link');
  if (igLink && CONFIG.instagram) igLink.href = CONFIG.instagram;
  if (ttLink && CONFIG.tiktok)    ttLink.href  = CONFIG.tiktok;

  // Info del hero
  const locEl       = document.getElementById('hero-location');
  const phoneEl     = document.getElementById('hero-phone');
  const phoneLinkEl = document.getElementById('hero-phone-link');
  if (locEl       && CONFIG.location)   locEl.textContent   = CONFIG.location;
  if (phoneEl     && CONFIG.phone)      phoneEl.textContent = CONFIG.phone;
  if (phoneLinkEl && CONFIG.phoneLink)  phoneLinkEl.href    = CONFIG.phoneLink;
}

// ══════════════════════════════════════════════
// PRODUCTOS — carga desde API o fallback a productos.json
// El admin puede sobreescribir con localStorage
// ══════════════════════════════════════════════

const API_URL = 'https://aguamarina-backend-q7gd.onrender.com';

function apiHeaders(extra = {}) {
  return { 'x-store-id': CONFIG.storeId || 'aguamarina', ...extra };
}

function mapProduct(p) {
  // Si viene de la API (campos en español)
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
  // Si viene del JSON local (campos en inglés)
  return p;
}

async function loadProducts() {
  const local = localStorage.getItem('aguamarina_products');
  if (local) {
    try { PRODUCTS = JSON.parse(local); return; } catch {}
  }
  try {
    const res = await fetch(`${API_URL}/api/productos`, {
      headers: apiHeaders()
    });
    const data = await res.json();
    PRODUCTS = data.filter(p => p.activo !== false).map(mapProduct);
  } catch {
    const res = await fetch('productos.json');
    PRODUCTS = await res.json();
  }
}

function getProductById(id) {
  return PRODUCTS.find(p => p.id === String(id));
}

// ══════════════════════════════════════════════
// CART
// ══════════════════════════════════════════════

const CART_KEY = 'aguamarina_cart_v2';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
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
function clearCart()         { localStorage.removeItem(CART_KEY); updateCartUI(); }
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
  const badge  = document.getElementById('cart-badge');
  const bar    = document.getElementById('bottom-cart-bar');
  const barCnt = document.getElementById('bcb-count');
  const barTot = document.getElementById('bcb-total');
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
  const name    = CONFIG.storeName    || 'Aguamarina Store';
  const number  = CONFIG.whatsappNumber || '584243286929';
  const message = `Hola! quiero hacer un pedido en *${name}* 🌊✨\n\n${lines}\n\n*Total: ${total}*\n\n¿Me confirmás disponibilidad y coordinamos el envío? 🚚`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

// ══════════════════════════════════════════════
// CATALOG  (index.html)
// ══════════════════════════════════════════════

async function initCatalog() {
  await loadConfig();
  await loadProducts();
  updateCartUI();
  initCatCards();

  // Si viene con parámetro ?cat=, abrir esa categoría directamente
  const catParam = getParam('cat');
  if (catParam && CAT_LABELS[catParam]) {
    openCategory(catParam);
  }
}

const CAT_LABELS = {
  pulseras:   '🧵 Pulseras',
  collares:   '📿 Collares',
  mayoristas: '📦 Mayoristas',
};

function initCatCards() {
  document.querySelectorAll('.cat-card').forEach(card => {
    card.addEventListener('click', () => {
      openCategory(card.dataset.cat);
    });
  });

  document.getElementById('catalog-back')?.addEventListener('click', () => {
    // Volver al carrusel
    document.getElementById('catalog-grid-wrap').style.display = 'none';
    document.getElementById('cat-cards').style.display = 'grid';
    // Scroll suave al catálogo
    document.getElementById('cat-cards')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function openCategory(cat) {
  // Ocultar carrusel, mostrar grid
  document.getElementById('cat-cards').style.display = 'none';
  const gridWrap = document.getElementById('catalog-grid-wrap');
  gridWrap.style.display = 'block';

  // Título activo
  const titleEl = document.getElementById('catalog-active-title');
  if (titleEl) titleEl.textContent = CAT_LABELS[cat] || cat;

  // Renderizar productos
  const products = PRODUCTS.filter(p => p.category === cat);
  renderGrid(products);

  // Scroll al grid
  gridWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function switchCategory(cat) { openCategory(cat); }
function initTabs() {}

function renderCard(p) {
  const imgSrc = p.image || `https://placehold.co/400x400/D6F2EE/1A8A78?text=${encodeURIComponent(p.name)}`;
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
          Consultar
        </button>
      </div>
    </article>`;
}

function renderGrid(products) {
  const grid = document.getElementById('products-grid');
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

function initFilters() {}

// ══════════════════════════════════════════════
// PRODUCT DETAIL  (product.html)
// ══════════════════════════════════════════════

async function initProductDetail() {
  await loadConfig();
  await loadProducts();
  updateCartUI();

  const product = getProductById(getParam('id'));
  if (!product) {
    document.getElementById('product-detail').innerHTML = `
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
  const imgSrc = p.image || `https://placehold.co/600x600/D6F2EE/1A8A78?text=${encodeURIComponent(p.name)}`;
  const backUrl = `index.html?cat=${encodeURIComponent(p.category)}`;
  document.title = `${p.name} · ${CONFIG.storeName || 'Aguamarina Store'}`;
  document.getElementById('product-detail').innerHTML = `
    <div class="product-detail__gallery">
      <a href="${backUrl}" class="back-btn">←</a>
      <img src="${sanitize(imgSrc)}" alt="${sanitize(p.name)}"
        onerror="this.src='https://placehold.co/600x600/D6F2EE/1A8A78?text=✨'">
    </div>
    <div class="product-detail__info">
      <p class="product-detail__cat">${categoryLabel(p.category)}</p>
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
  updateCartUI();
  renderCartPage();
}

function renderCartPage() {
  const itemsEl   = document.getElementById('cart-items');
  const summaryEl = document.getElementById('cart-summary');
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
        src="${sanitize(item.image || '')}"
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
// ADMIN  (admin.html) — sin backend, usa localStorage
// ══════════════════════════════════════════════

const ADMIN_PASS_KEY     = 'aguamarina_admin_logged';
const ADMIN_PRODUCTS_KEY = 'aguamarina_products';
let _editingId = null;

async function initAdmin() {
  if (localStorage.getItem(ADMIN_PASS_KEY) === 'yes') await showAdminPanel();

  document.getElementById('login-btn')     ?.addEventListener('click', doLogin);
  document.getElementById('login-pass')    ?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('add-product-btn')?.addEventListener('click', () => openProductModal(null));
  document.getElementById('modal-close')   ?.addEventListener('click', closeProductModal);
  document.getElementById('modal-cancel')  ?.addEventListener('click', closeProductModal);
  document.getElementById('save-product-btn')?.addEventListener('click', saveProduct);
  document.getElementById('admin-logout')  ?.addEventListener('click', doLogout);
  document.getElementById('search-products')?.addEventListener('input', renderAdminTable);
  document.getElementById('filter-category')?.addEventListener('change', renderAdminTable);
  document.getElementById('product-modal') ?.addEventListener('click', e => {
    if (e.target.id === 'product-modal') closeProductModal();
  });
}

async function doLogin() {
  const pass = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  try {
    const res = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...apiHeaders() },
      body: JSON.stringify({ password: pass })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem(ADMIN_PASS_KEY, pass);
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

function doLogout() { localStorage.removeItem(ADMIN_PASS_KEY); window.location.reload(); }

async function showAdminPanel() {
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('admin-panel').classList.remove('hidden');
  await loadConfig();
  await loadProducts();
  renderAdminTable();
}

function renderAdminTable() {
  const tbody = document.getElementById('admin-tbody');
  if (!tbody) return;

  const searchTerm = document.getElementById('search-products')?.value?.toLowerCase() || '';
  const categoryFilter = document.getElementById('filter-category')?.value || '';

  let products = PRODUCTS.filter(p => {
    const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm);
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Contador
  const countEl = document.getElementById('product-count');
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
      <td><span class="cat-badge">${categoryLabel(p.category)}</span></td>
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

// Alias para llamar desde HTML
function editProduct(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (product) openProductModal(product);
}

function openProductModal(product) {
  _editingId = product ? product.id : null;
  document.getElementById('modal-title').textContent = product ? 'Editar Producto' : 'Nuevo Producto';
  document.getElementById('f-name').value            = product?.name     || '';
  document.getElementById('f-price').value           = product?.price    || '';
  document.getElementById('f-category').value        = product?.category || 'pulseras';
  document.getElementById('f-image-url').value       = product?.image    || '';

  // Reset file input
  const fileInput = document.getElementById('f-image-file');
  if (fileInput) fileInput.value = '';

  // Mostrar upload area o preview según si hay imagen
  const uploadArea = document.getElementById('upload-area');
  const preview    = document.getElementById('img-preview');
  const previewImg = document.getElementById('img-preview-img');
  
  if (product?.image) {
    uploadArea.style.display = 'none';
    previewImg.src = product.image;
    preview.style.display = 'block';
  } else {
    uploadArea.style.display = 'flex';
    previewImg.src = '';
    preview.style.display = 'none';
  }
  document.getElementById('product-modal').classList.add('open');
}

function closeProductModal() {
  document.getElementById('product-modal').classList.remove('open');
  _editingId = null;
}

async function saveProduct() {
  const name = document.getElementById('f-name').value.trim();
  const price = parseInt(document.getElementById('f-price').value);
  if (!name || isNaN(price) || price <= 0) { showToast('⚠️ Completá nombre y precio'); return; }

  const password = localStorage.getItem(ADMIN_PASS_KEY) || '';
  const data = {
    nombre: name,
    precio: price,
    categoria: document.getElementById('f-category').value,
  };

  try {
    if (_editingId) {
      const res = await fetch(`${API_URL}/api/productos/${_editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...apiHeaders({ 'x-admin-password': password }) },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error al actualizar');
    } else {
      data.codigo = 'NEW-' + Date.now();
      data.imagen = document.getElementById('f-image-url').value.trim() || '';
      const res = await fetch(`${API_URL}/api/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...apiHeaders({ 'x-admin-password': password }) },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error al crear');
    }

    localStorage.removeItem(ADMIN_PRODUCTS_KEY);
    await loadProducts();
    closeProductModal();
    renderAdminTable();
    showToast(_editingId ? '✓ Producto actualizado' : '✓ Producto creado');
  } catch (e) {
    showToast('⚠️ Error: ' + e.message);
  }
}

async function deleteProduct(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  try {
    const password = localStorage.getItem(ADMIN_PASS_KEY) || '';
    const res = await fetch(`${API_URL}/api/productos/${id}`, {
      method: 'DELETE',
      headers: apiHeaders({ 'x-admin-password': password }),
    });
    if (!res.ok) throw new Error('Error al eliminar');

    localStorage.removeItem(ADMIN_PRODUCTS_KEY);
    await loadProducts();
    renderAdminTable();
    showToast('✓ Producto eliminado');
  } catch (e) {
    showToast('⚠️ Error: ' + e.message);
  }
}

function previewFromUrl(url) {
  const preview    = document.getElementById('img-preview');
  const previewImg = document.getElementById('img-preview-img');
  if (!url) { preview.style.display = 'none'; return; }
  previewImg.src        = url;
  previewImg.onload  = () => preview.style.display = 'block';
  previewImg.onerror = () => preview.style.display = 'none';
}
