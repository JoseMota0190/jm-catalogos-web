require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const https = require('https');
const http = require('http');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Conectado a MongoDB');

  const Producto = mongoose.models.Producto || mongoose.model('Producto', new mongoose.Schema({
    storeId: String, codigo: String, nombre: String, precio: String,
    categoria: String, imagen: String, descripcion: String, destacado: Boolean, activo: Boolean
  }));

  const productos = await Producto.find({
    storeId: 'aguamarina',
    imagen: /ibb\.co/i
  });

  console.log(`Encontrados ${productos.length} productos con imágenes de imgbb`);

  for (const p of productos) {
    try {
      const newUrl = await uploadToCloudinary(p.imagen, p.codigo);
      if (newUrl) {
        p.imagen = newUrl;
        await p.save();
        console.log(`✓ ${p.codigo}: migrada a Cloudinary`);
      }
    } catch (err) {
      console.error(`✗ ${p.codigo}: ${err.message}`);
    }
  }

  console.log('Migración de imágenes completada');
  process.exit();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

function uploadToCloudinary(url, codigo) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, async (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(uploadToCloudinary(res.headers.location, codigo));
      }
      if (res.statusCode !== 200) return resolve(null);

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', async () => {
        try {
          const b64 = Buffer.from(Buffer.concat(chunks)).toString('base64');
          const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${b64}`, {
            folder: 'stores/aguamarina',
            public_id: codigo,
            overwrite: true
          });
          resolve(result.secure_url);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}
