// Administración de recursos de Render desde la API oficial.
//
// La API key se lee de la variable RENDER_API_KEY o del archivo
// indicado con --key-file (por defecto %TEMP%\render-key.txt).
// NUNCA hace falta escribir la key en este archivo ni en el repo.
//
// Uso:
//   node scripts/render-admin.js list
//   node scripts/render-admin.js disconnect-blueprint <nombre-o-id>
//   node scripts/render-admin.js delete-service <nombre-o-id>
//   node scripts/render-admin.js delete-postgres <nombre-o-id>
//
// Protección: se niega a tocar cualquier cosa que mencione Aguamarina /
// jm-catalogos. Para esas no hay excepción.

const fs = require('fs');
const path = require('path');

const BASE = 'https://api.render.com/v1';
const PROTEGIDOS = /aguamarina|jm-catalogos/i;

function leerKey() {
  if (process.env.RENDER_API_KEY) return process.env.RENDER_API_KEY.trim();
  const arg = process.argv.indexOf('--key-file');
  const file = arg !== -1 ? process.argv[arg + 1] : path.join(process.env.TEMP || '.', 'render-key.txt');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  throw new Error(`Falta la API key. Definí RENDER_API_KEY o creá ${file}`);
}

async function api(ruta, opciones = {}) {
  const res = await fetch(BASE + ruta, {
    ...opciones,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${leerKey()}`,
      ...(opciones.headers || {}),
    },
  });
  if (res.status === 204) return null;
  const texto = await res.text();
  let data;
  try { data = texto ? JSON.parse(texto) : null; } catch { data = texto; }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} en ${ruta}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
}

async function paginar(ruta, ownerId) {
  const items = [];
  let cursor = '';
  do {
    const qs = new URLSearchParams({ limit: '100' });
    if (ownerId) qs.set('ownerId', ownerId);
    if (cursor) qs.set('cursor', cursor);
    const pagina = await api(`${ruta}?${qs}`);
    for (const item of pagina || []) {
      items.push(item);
      cursor = item.cursor || '';
    }
    if (!pagina || pagina.length === 0) break;
  } while (cursor);
  return items;
}

function desenvolver(items) {
  return items.map(i => i.service || i.blueprint || i.postgres || i.owner || i);
}

async function listar() {
  const owners = desenvolver(await paginar('/owners'));
  console.log('\n=== WORKSPACES ===');
  for (const o of owners) console.log(`  ${o.name || o.id}  (${o.id})`);

  const servicios = desenvolver(await paginar('/services'));
  console.log('\n=== SERVICIOS ===');
  for (const s of servicios) {
    console.log(`  ${s.name}`);
    console.log(`    id: ${s.id}`);
    console.log(`    tipo: ${s.type} | plan: ${s.plan || s.serviceDetails?.plan} | suspendido: ${s.suspended || 'no'}`);
    console.log(`    url: ${s.serviceDetails?.url || s.url || '-'}`);
  }

  const blueprints = desenvolver(await paginar('/blueprints'));
  console.log('\n=== BLUEPRINTS ===');
  for (const b of blueprints) {
    console.log(`  ${b.name}  (${b.id})`);
  }

  const bases = desenvolver(await paginar('/postgres'));
  console.log('\n=== POSTGRES ===');
  for (const d of bases) {
    console.log(`  ${d.name}`);
    console.log(`    id: ${d.id}`);
    console.log(`    plan: ${d.plan} | estado: ${d.status || d.databaseStatus || '-'}`);
  }
}

function buscar(items, objetivo) {
  const encontrados = items.filter(i =>
    i.id === objetivo || String(i.name || '').toLowerCase() === objetivo.toLowerCase()
  );
  if (encontrados.length === 0) throw new Error(`No encontré ningún recurso llamado "${objetivo}".`);
  if (encontrados.length > 1) throw new Error(`Hay ${encontrados.length} recursos con ese nombre. Usá el id.`);
  return encontrados[0];
}

function proteger(nombre) {
  if (PROTEGIDOS.test(nombre)) {
    throw new Error(`"${nombre}" está protegido (Aguamarina). No se toca.`);
  }
}

async function desconectarBlueprint(objetivo) {
  const b = buscar(desenvolver(await paginar('/blueprints')), objetivo);
  proteger(b.name);
  await api(`/blueprints/${b.id}`, { method: 'DELETE' });
  console.log(`Blueprint desconectado: ${b.name} (${b.id})`);
}

async function borrarServicio(objetivo) {
  const s = buscar(desenvolver(await paginar('/services')), objetivo);
  proteger(s.name);
  await api(`/services/${s.id}`, { method: 'DELETE' });
  console.log(`Servicio eliminado: ${s.name} (${s.id})`);
}

async function borrarPostgres(objetivo) {
  const d = buscar(desenvolver(await paginar('/postgres')), objetivo);
  proteger(d.name);
  await api(`/postgres/${d.id}`, { method: 'DELETE' });
  console.log(`Postgres eliminado: ${d.name} (${d.id})`);
}

async function main() {
  const [comando, objetivo] = process.argv.slice(2).filter(a => !a.startsWith('--'));
  switch (comando || 'list') {
    case 'list': return listar();
    case 'disconnect-blueprint': return desconectarBlueprint(objetivo);
    case 'delete-service': return borrarServicio(objetivo);
    case 'delete-postgres': return borrarPostgres(objetivo);
    default: throw new Error(`Comando desconocido: ${comando}`);
  }
}

main().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
