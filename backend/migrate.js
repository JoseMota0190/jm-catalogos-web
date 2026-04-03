require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Conectado a MongoDB');

  const Store = mongoose.models.Store || mongoose.model('Store', new mongoose.Schema({
    storeId: { type: String, unique: true, required: true },
    storeName: String, adminPassword: String, whatsappNumber: String,
    currency: String, currencySymbol: String, instagram: String, tiktok: String,
    location: String, phone: String, phoneLink: String,
    activo: { type: Boolean, default: true }, createdAt: { type: Date, default: Date.now }
  }));

  const Producto = mongoose.models.Producto || mongoose.model('Producto', new mongoose.Schema({
    storeId: { type: String, index: true, required: true },
    codigo: String, nombre: String, precio: String, categoria: String,
    imagen: String, descripcion: String, destacado: Boolean, activo: Boolean
  }));

  const Config = mongoose.models.Config || mongoose.model('Config', new mongoose.Schema({
    storeId: { type: String, index: true, required: true },
    storeName: String, whatsappNumber: String, currency: String, currencySymbol: String,
    instagram: String, tiktok: String, location: String, phone: String, phoneLink: String
  }));

  const count = await Producto.updateMany({}, { $set: { storeId: 'aguamarina' } });
  console.log(`Productos migrados: ${count.modifiedCount}`);

  const cfgCount = await Config.updateMany({}, { $set: { storeId: 'aguamarina' } });
  console.log(`Configs migrados: ${cfgCount.modifiedCount}`);

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
    console.log('Store "aguamarina" creado');
  } else {
    console.log('Store "aguamarina" ya existe');
  }

  console.log('Migración completada');
  process.exit();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
