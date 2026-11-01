// Backup manual de MongoDB Atlas → JSON local.
//
// Uso:
//   cd backend
//   set MONGODB_URI=mongodb+srv://...   (PowerShell: $env:MONGODB_URI="...")
//   npm run backup
//
// Guarda stores, productos, configs y ventas en backend/backups/<fecha>/.
// La carpeta está en .gitignore: los backups NO se suben al repo.

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const COLECCIONES = ['stores', 'productos', 'configs', 'ventas'];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Falta MONGODB_URI. Copiala de Render → Environment o de Atlas → Connect.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.log(`Conectado a la base "${db.databaseName}"`);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(__dirname, 'backups', stamp);
  fs.mkdirSync(dir, { recursive: true });

  const resumen = {};
  for (const nombre of COLECCIONES) {
    const docs = await db.collection(nombre).find({}).toArray();
    fs.writeFileSync(
      path.join(dir, `${nombre}.json`),
      JSON.stringify(docs, null, 2)
    );
    resumen[nombre] = docs.length;
    console.log(`  ${nombre}: ${docs.length} documentos`);
  }

  fs.writeFileSync(
    path.join(dir, 'resumen.json'),
    JSON.stringify({ fecha: new Date().toISOString(), base: db.databaseName, resumen }, null, 2)
  );

  console.log(`\nBackup guardado en: ${dir}`);
  console.log('Guardá una copia fuera del repositorio (Drive, disco externo, etc.).');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error en el backup:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
