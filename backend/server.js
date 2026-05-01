require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();

app.use(cors());
app.use(express.json());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  folder: (req) => `stores/${req.storeId || 'default'}`,
  allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
});

const upload = multer({ storage });

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error('MongoDB error:', err));

// ══════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════

const storeSchema = new mongoose.Schema({
  storeId: { type: String, unique: true, required: true },
  storeName: String,
  storeTagline: String,
  adminPassword: String,
  whatsappNumber: String,
  currency: { type: String, default: 'USD' },
  currencySymbol: { type: String, default: '$' },
  instagram: String,
  instagramHandle: String,
  tiktok: String,
  tiktokHandle: String,
  location: String,
  phone: String,
  phoneLink: String,
  faviconUrl: String,
  logoUrl: String,
  heroBgUrl: String,
  heroEyebrow: String,
  heroTitle: String,
  categories: [{ id: String, label: String, imageUrl: String, ctaText: String }],
  about: {
    enabled: { type: Boolean, default: true },
    imageUrl: String,
    eyebrow: String,
    title: String,
    body: String,
    badges: [{ icon: String, text: String }]
  },
  ebook: {
    enabled: { type: Boolean, default: false },
    imageUrl: String,
    eyebrow: String,
    title: String,
    body: String,
    buttonText: String,
    whatsappMessage: String
  },
  cloudinary: {
    cloudName: String,
    uploadPreset: String
  },
  activo: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const productoSchema = new mongoose.Schema({
  storeId: { type: String, index: true, required: true },
  codigo: String,
  nombre: String,
  precio: String,
  categoria: String,
  imagen: String,
  imagen2: String,
  imagen3: String,
  descripcion: String,
  destacado: { type: Boolean, default: false },
  destacadoOrden: { type: Number, default: 0 },
  visitas: { type: Number, default: 0 },
  creadoAt: { type: Date, default: Date.now },
  activo: { type: Boolean, default: true }
}, { strict: false });

const configSchema = new mongoose.Schema({
  storeId: { type: String, index: true, required: true },
  storeName: String,
  storeTagline: String,
  faviconUrl: String,
  logoUrl: String,
  heroBgUrl: String,
  heroEyebrow: String,
  heroTitle: String,
  whatsappNumber: String,
  currency: String,
  currencySymbol: String,
  instagram: String,
  instagramHandle: String,
  tiktok: String,
  tiktokHandle: String,
  location: String,
  phone: String,
  phoneLink: String,
  categories: [{ id: String, label: String, imageUrl: String, ctaText: String }],
  about: {
    enabled: { type: Boolean, default: true },
    imageUrl: String,
    eyebrow: String,
    title: String,
    body: String,
    badges: [{ icon: String, text: String }]
  },
  ebook: {
    enabled: { type: Boolean, default: false },
    imageUrl: String,
    eyebrow: String,
    title: String,
    body: String,
    buttonText: String,
    whatsappMessage: String
  },
  cloudinary: {
    cloudName: String,
    uploadPreset: String
  }
});

const ventaSchema = new mongoose.Schema({
  storeId: { type: String, index: true, required: true },
  fecha: { type: Date, default: Date.now },
  productos: [{ nombre: String, cantidad: Number, precio: Number }],
  total: Number,
  metodoPago: String,
  notas: String,
  cliente: String
});

const Store = mongoose.model('Store', storeSchema);
const Producto = mongoose.model('Producto', productoSchema);
const Config = mongoose.model('Config', configSchema);
const Venta = mongoose.model('Venta', ventaSchema);

// ══════════════════════════════════════════════
// MIDDLEWARE
// ══════════════════════════════════════════════

function requireStore(req, res, next) {
  const storeId = req.headers['x-store-id'] || req.query.store || 'aguamarina';
  req.storeId = storeId;
  next();
}

async function requireAdmin(req, res, next) {
  const store = await Store.findOne({ storeId: req.storeId });
  if (!store || !store.activo) return res.status(404).json({ error: 'Tienda no encontrada' });
  const password = req.headers['x-admin-password'];
  if (password !== store.adminPassword) return res.status(401).json({ error: 'No autorizado' });
  req.store = store;
  next();
}

function requireSuperAdmin(req, res, next) {
  const password = req.headers['x-super-admin-password'];
  if (!password || password !== process.env.SUPER_ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}

// ══════════════════════════════════════════════
// TIENDAS (solo super-admin)
// ══════════════════════════════════════════════

app.post('/api/stores', requireSuperAdmin, async (req, res) => {
  try {
    const {
      storeId, storeName, storeTagline, adminPassword, whatsappNumber,
      currency, currencySymbol, instagram, instagramHandle, tiktok, tiktokHandle,
      location, phone, phoneLink, faviconUrl, logoUrl, heroBgUrl,
      heroEyebrow, heroTitle, categories, about, ebook, cloudinary
    } = req.body;
    if (!storeId || !adminPassword) return res.status(400).json({ error: 'storeId y adminPassword son requeridos' });
    const existente = await Store.findOne({ storeId });
    if (existente) return res.status(409).json({ error: 'Ya existe una tienda con ese storeId' });
    const nueva = await Store.create({
      storeId, storeName, storeTagline, adminPassword, whatsappNumber,
      currency: currency || 'USD', currencySymbol: currencySymbol || '$',
      instagram, instagramHandle, tiktok, tiktokHandle,
      location, phone, phoneLink, faviconUrl, logoUrl, heroBgUrl,
      heroEyebrow, heroTitle, categories, about, ebook, cloudinary
    });
    res.status(201).json(nueva);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stores', requireSuperAdmin, async (req, res) => {
  try {
    const tiendas = await Store.find().select('-adminPassword');
    res.json(tiendas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stores/:storeId', requireSuperAdmin, async (req, res) => {
  try {
    const tienda = await Store.findOne({ storeId: req.params.storeId }).select('-adminPassword');
    if (!tienda) return res.status(404).json({ error: 'Tienda no encontrada' });
    res.json(tienda);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/stores/:storeId', requireSuperAdmin, async (req, res) => {
  try {
    const actualizada = await Store.findOneAndUpdate(
      { storeId: req.params.storeId },
      req.body,
      { new: true }
    ).select('-adminPassword');
    if (!actualizada) return res.status(404).json({ error: 'Tienda no encontrada' });
    res.json(actualizada);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/stores/:storeId', requireSuperAdmin, async (req, res) => {
  try {
    const eliminada = await Store.findOneAndDelete({ storeId: req.params.storeId });
    if (!eliminada) return res.status(404).json({ error: 'Tienda no encontrada' });
    await Producto.deleteMany({ storeId: req.params.storeId });
    await Config.deleteMany({ storeId: req.params.storeId });
    await Venta.deleteMany({ storeId: req.params.storeId });
    res.json({ message: 'Tienda eliminada junto con sus datos' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// PRODUCTOS
// ══════════════════════════════════════════════

app.get('/api/productos', requireStore, async (req, res) => {
  try {
    const productos = await Producto.find({ storeId: req.storeId, activo: true }).lean();
    // Asegurar que cada producto tenga destacadoOrden (para documentos antiguos sin el campo)
    productos.forEach(p => {
      if (p.destacadoOrden === undefined || p.destacadoOrden === null) {
        p.destacadoOrden = 0;
      }
    });
    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/productos/:categoria', requireStore, async (req, res) => {
  try {
    const productos = await Producto.find({ storeId: req.storeId, categoria: req.params.categoria, activo: true });
    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/productos/:id/visita', requireStore, async (req, res) => {
  try {
    const actualizado = await Producto.findOneAndUpdate(
      { codigo: req.params.id, storeId: req.storeId },
      { $inc: { visitas: 1 } },
      { new: true }
    );
    if (!actualizado) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ success: true, visitas: actualizado.visitas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint específico para actualizar solo destacadoOrden (sin multer, JSON puro)
// DEBE ir ANTES de app.put('/api/productos/:id') para que Express no lo capture como :id
app.put('/api/productos/:id/destacado', requireStore, async (req, res) => {
  try {
    const { destacadoOrden } = req.body;
    const actualizado = await Producto.findOneAndUpdate(
      { codigo: req.params.id, storeId: req.storeId },
      { destacadoOrden: destacadoOrden || 0 },
      { new: true }
    );
    if (!actualizado) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ success: true, destacadoOrden: actualizado.destacadoOrden });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/productos', requireStore, upload.single('imagen'), async (req, res) => {
  try {
    const { codigo, nombre, precio, categoria, descripcion, destacado, destacadoOrden, imagen2, imagen3 } = req.body;
    const imagen = req.file ? req.file.path : req.body.imagen;
    const nuevo = new Producto({
      storeId: req.storeId, 
      codigo, 
      nombre, 
      precio, 
      categoria, 
      imagen, 
      imagen2: imagen2 || '', 
      imagen3: imagen3 || '', 
      descripcion, 
      destacado, 
      destacadoOrden: destacadoOrden || 0,
      creadoAt: new Date()
    });
    await nuevo.save();
    res.status(201).json(nuevo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/productos/:id', requireStore, upload.single('imagen'), async (req, res) => {
  try {
    const { codigo, nombre, precio, categoria, descripcion, destacado, destacadoOrden, imagen2, imagen3 } = req.body;
    const updateData = { 
      codigo, 
      nombre, 
      precio, 
      categoria, 
      descripcion, 
      destacado, 
      destacadoOrden, 
      imagen2: imagen2 || '', 
      imagen3: imagen3 || '' 
    };
    if (req.file) updateData.imagen = req.file.path;
    const actualizado = await Producto.findOneAndUpdate(
      { codigo: req.params.id, storeId: req.storeId },
      updateData,
      { new: true }
    );
    if (!actualizado) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(actualizado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/productos/:id', requireStore, async (req, res) => {
  try {
    const eliminado = await Producto.findOneAndDelete({ codigo: req.params.id, storeId: req.storeId });
    if (!eliminado) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════

app.get('/api/config', requireStore, async (req, res) => {
  try {
    const store = await Store.findOne({ storeId: req.storeId });
    if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });

    let config = await Config.findOne({ storeId: req.storeId });
    if (!config) {
      config = await Config.create({
        storeId: req.storeId,
        storeName: store.storeName,
        storeTagline: store.storeTagline || '',
        whatsappNumber: store.whatsappNumber || '',
        currency: store.currency || 'USD',
        currencySymbol: store.currencySymbol || '$',
        instagram: store.instagram || '',
        instagramHandle: store.instagramHandle || '',
        tiktok: store.tiktok || '',
        tiktokHandle: store.tiktokHandle || '',
        location: store.location || '',
        phone: store.phone || '',
        phoneLink: store.phoneLink || '',
        faviconUrl: store.faviconUrl || '',
        logoUrl: store.logoUrl || '',
        heroBgUrl: store.heroBgUrl || '',
        heroEyebrow: store.heroEyebrow || '',
        heroTitle: store.heroTitle || '',
        categories: store.categories || [],
        about: store.about || { enabled: true },
        ebook: store.ebook || { enabled: false },
        cloudinary: store.cloudinary || { cloudName: process.env.CLOUDINARY_CLOUD_NAME || '', uploadPreset: '' }
      });
    }

    // Merge store defaults with config overrides
    const merged = {
      storeId: store.storeId,
      storeName: config.storeName || store.storeName,
      storeTagline: config.storeTagline || store.storeTagline || '',
      faviconUrl: config.faviconUrl || store.faviconUrl || '',
      logoUrl: config.logoUrl || store.logoUrl || '',
      heroBgUrl: config.heroBgUrl || store.heroBgUrl || '',
      heroEyebrow: config.heroEyebrow || store.heroEyebrow || '',
      heroTitle: config.heroTitle || store.heroTitle || '',
      whatsappNumber: config.whatsappNumber || store.whatsappNumber || '',
      currency: config.currency || store.currency || 'USD',
      currencySymbol: config.currencySymbol || store.currencySymbol || '$',
      instagram: config.instagram || store.instagram || '',
      instagramHandle: config.instagramHandle || store.instagramHandle || '',
      tiktok: config.tiktok || store.tiktok || '',
      tiktokHandle: config.tiktokHandle || store.tiktokHandle || '',
      location: config.location || store.location || '',
      phone: config.phone || store.phone || '',
      phoneLink: config.phoneLink || store.phoneLink || '',
      categories: config.categories || store.categories || [],
      about: config.about || store.about || { enabled: true },
      ebook: config.ebook || store.ebook || { enabled: false },
      cloudinary: config.cloudinary || store.cloudinary || { cloudName: process.env.CLOUDINARY_CLOUD_NAME || '', uploadPreset: '' }
    };

    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/config', requireStore, requireAdmin, async (req, res) => {
  try {
    const config = await Config.findOneAndUpdate(
      { storeId: req.storeId },
      { ...req.body, storeId: req.storeId },
      { new: true, upsert: true }
    );
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════

app.post('/api/login', requireStore, async (req, res) => {
  try {
    const store = await Store.findOne({ storeId: req.storeId });
    if (!store || !store.activo) return res.status(404).json({ success: false, error: 'Tienda no encontrada' });
    const { password } = req.body;
    if (password === store.adminPassword) {
      res.json({ success: true, token: 'admin-session' });
    } else {
      res.status(401).json({ success: false, error: 'Contraseña incorrecta' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════
// VENTAS
// ══════════════════════════════════════════════

app.post('/api/ventas', requireStore, requireAdmin, async (req, res) => {
  try {
    const { productos, total, metodoPago, notas, cliente, fecha } = req.body;
    const nueva = await Venta.create({
      storeId: req.storeId,
      productos, total, metodoPago, notas, cliente,
      fecha: fecha || new Date()
    });
    res.status(201).json(nueva);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ventas', requireStore, requireAdmin, async (req, res) => {
  try {
    const query = { storeId: req.storeId };
    if (req.query.desde) query.fecha = { $gte: new Date(req.query.desde) };
    if (req.query.hasta) query.fecha = { ...query.fecha, $lte: new Date(req.query.hasta) };
    const ventas = await Venta.find(query).sort({ fecha: -1 });
    res.json(ventas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ventas/:id', requireStore, requireAdmin, async (req, res) => {
  try {
    const eliminada = await Venta.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    if (!eliminada) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json({ message: 'Venta eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// UTILIDADES
// ══════════════════════════════════════════════

app.post('/api/seed', requireStore, async (req, res) => {
  try {
    const fs = require('fs');
    const raw = JSON.parse(fs.readFileSync('./productos.json', 'utf8'));
    await Producto.deleteMany({ storeId: req.storeId });
    for (const p of raw) {
      await Producto.create({
        storeId: req.storeId,
        codigo: p.id,
        nombre: p.name,
        precio: String(p.price),
        categoria: p.category,
        imagen: p.image,
        descripcion: p.description || '',
        destacado: p.featured || false
      });
    }
    res.json({ message: 'Seed completado', count: raw.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/migrate', async (req, res) => {
  try {
    if (req.query.key !== process.env.SUPER_ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const results = {};

    const prodCount = await Producto.updateMany({}, { $set: { storeId: 'aguamarina' } });
    results.productos = prodCount.modifiedCount;

    const cfgCount = await Config.updateMany({}, { $set: { storeId: 'aguamarina' } });
    results.configs = cfgCount.modifiedCount;

    const existente = await Store.findOne({ storeId: 'aguamarina' });
    if (!existente) {
      await Store.create({
        storeId: 'aguamarina',
        storeName: 'Aguamarina Store',
        adminPassword: process.env.ADMIN_PASSWORD || 'aguamarina2024',
        whatsappNumber: '584243286929',
        currency: 'USD',
        currencySymbol: '$',
        instagram: 'https://instagram.com/aguamarina___store',
        location: 'Calabozo, Edo. Guárico · Venezuela',
        phone: '+58 424-3286929',
        phoneLink: 'https://wa.me/584243286929'
      });
      results.store = 'creado';
    } else {
      results.store = 'ya existe';
    }

    res.json({ message: 'Migración completada', results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// SANITIZACIÓN — Limpiar destacados y portadas inválidas
// ══════════════════════════════════════════════

app.post('/api/sanitizar', requireStore, requireAdmin, async (req, res) => {
  try {
    const storeId = req.storeId;
    const results = {
      destacados: { limpiados: 0, detalles: [] },
      portadas: { limpiadas: 0, detalles: [] }
    };

    // ── 1. Sanitizar destacados inválidos ──
    // Productos con destacadoOrden > 0 que están inactivos o no existen
    const productosDestacados = await Producto.find({ storeId, destacadoOrden: { $gt: 0 } });
    
    for (const prod of productosDestacados) {
      // Si el producto está inactivo, limpiar su destacado
      if (prod.activo === false) {
        await Producto.updateOne(
          { _id: prod._id },
          { $set: { destacadoOrden: 0 } }
        );
        results.destacados.limpiados++;
        results.destacados.detalles.push({
          codigo: prod.codigo,
          nombre: prod.nombre,
          razon: 'Producto inactivo'
        });
      }
    }

    // ── 2. Sanitizar portadas huérfanas ──
    // Categorías cuya imageUrl no pertenece a ningún producto activo de esa categoría
    const config = await Config.findOne({ storeId });
    if (config && config.categories && config.categories.length > 0) {
      const categoriasActualizadas = [];
      
      for (const cat of config.categories) {
        if (cat.imageUrl && cat.imageUrl.trim() !== '') {
          // Buscar si algún producto activo de esta categoría usa esta imagen
          const existeProducto = await Producto.findOne({
            storeId,
            categoria: cat.id,
            activo: { $ne: false },
            $or: [
              { imagen: cat.imageUrl },
              { imagen2: cat.imageUrl },
              { imagen3: cat.imageUrl }
            ]
          });

          if (!existeProducto) {
            // La imagen no pertenece a ningún producto activo de esta categoría
            results.portadas.limpiadas++;
            results.portadas.detalles.push({
              categoria: cat.id,
              label: cat.label,
              razon: 'La imagen no pertenece a ningún producto activo de esta categoría'
            });
            categoriasActualizadas.push({
              id: cat.id,
              label: cat.label,
              imageUrl: '',
              ctaText: cat.ctaText || 'Ver colección →'
            });
          } else {
            categoriasActualizadas.push(cat);
          }
        } else {
          categoriasActualizadas.push(cat);
        }
      }

      // Guardar categorías actualizadas si hubo cambios
      if (results.portadas.limpiadas > 0) {
        await Config.updateOne(
          { storeId },
          { $set: { categories: categoriasActualizadas } }
        );
      }
    }

    res.json({
      message: 'Sanitización completada',
      results
    });
  } catch (err) {
    console.error('Error en sanitización:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/ping', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
