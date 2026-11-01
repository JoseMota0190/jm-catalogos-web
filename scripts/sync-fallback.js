// Genera el respaldo estático del catálogo (frontend-template/productos.json)
// a partir de la API en producción.
//
// Uso local:
//   node scripts/sync-fallback.js
//
// En GitHub Actions corre solo una vez al día. Si la API no responde,
// sale con error y NO toca el archivo: nunca guarda un respaldo vacío.

const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'https://jm-catalogos-web-1.onrender.com';
const STORE_ID = process.env.STORE_ID || 'aguamarina';
const DESTINO = path.join(__dirname, '..', 'frontend-template', 'productos.json');

async function main() {
  const res = await fetch(`${API_URL}/api/productos`, {
    headers: { 'x-store-id': STORE_ID },
  });
  if (!res.ok) throw new Error(`La API respondió HTTP ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('La API devolvió una lista vacía o inválida');
  }

  const productos = data
    .filter(p => p.activo !== false)
    .map(p => ({
      id: p.codigo,
      name: p.nombre,
      price: Number(p.precio),
      category: p.categoria,
      stock: p.stock || 0,
      featured: !!p.destacado,
      description: p.descripcion || '',
      image: p.imagen || '',
    }));

  fs.writeFileSync(DESTINO, JSON.stringify(productos, null, 2) + '\n');
  console.log(`Respaldo actualizado: ${productos.length} productos → ${DESTINO}`);
}

main().catch(err => {
  console.error('No se actualizó el respaldo:', err.message);
  process.exit(1);
});
