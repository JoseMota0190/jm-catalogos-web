# Aguamarina Store — Catálogo + Aguamarina AI (YouCam API)

Catálogo web **multi-tenant** para tiendas de bisutería artesanal, con carrito, panel de administración, una **asesora de estilo con memoria de sesión** y **Virtual Try-On real** de pulseras y collares mediante la YouCam API de Perfect Corp.

Tienda en producción: **https://aguamarina-store.pages.dev**

No es una demo de escaparate: es la tienda real de **Aguamarina Store** (Calabozo, Venezuela), con más de 100 productos, su dueña y sus pedidos por WhatsApp. El probador virtual y la asesora se añadieron sobre el mismo catálogo que las clientas ya usan a diario.

---

## Cómo funciona el probador virtual

1. La persona llega a una pieza concreta desde las recomendaciones de **Aguamarina AI** y elige **Probar**.
2. En la etapa 04 sube la foto que corresponde: cuello/hombros para un collar, muñeca para una pulsera. El navegador la reduce a 1024 px antes de enviarla.
3. El frontend llama a `POST /api/vto`, una Pages Function que guarda la foto en YouCam (File API), crea la tarea `2d-vto/{bracelet|necklace}` y devuelve un `taskId`.
4. El cliente consulta `GET /api/vto?taskId=…` cada 2 s hasta 90 s.
5. Al terminar, muestra el resultado real etiquetado **“YouCam API”** y acciones para guardar el look, consultar disponibilidad o pedir la pieza por WhatsApp.

La clave de YouCam vive **solo** como secreto de Cloudflare Pages (`YOUCAM_API_KEY`). Nunca se envía al navegador.

Diseño deliberado: crear la tarea y consultarla son **dos endpoints separados**, para que ninguna petición quede colgada esperando. Si YouCam falla, la interfaz muestra un error. **Nunca** se compone una imagen falsa que pueda confundirse con un resultado real.

Categorías compatibles: `pulseras → bracelet`, `collares → necklace`. La categoría `mayoristas` (packs y exhibidores) no muestra probador porque no son piezas que se pongan encima.

---

## Aguamarina AI — una sola experiencia

`asesora.html` es una página independiente (no cambia la navegación ni el catálogo tradicional) con cuatro etapas encadenadas:

1. **Conocé tu estilo.** Ocasión, estilo, piezas, metal y presupuesto. Queda guardado en la memoria de la pestaña.
2. **Descubrí tus tonos.** La persona sube una selfie con consentimiento explícito. Se hace una lectura local inmediata y, si `YOUCAM_API_KEY` está configurada, se refina con el **AI Facial Color Tones Analyzer** de YouCam. El resultado siempre se presenta como orientación estética, nunca como clasificación definitiva ni diagnóstico. También se puede elegir la paleta a mano.
3. **Encontrá tus accesorios.** El motor cruza perfil + paleta + catálogo real y devuelve tres piezas concretas con una explicación de por qué las recomienda. Excluye mayoristas y tobilleras (no son probables en muñeca).
4. **Probátelos virtualmente.** Pide la foto que corresponde recién en ese momento: cuello/hombros para collares, muñeca para pulseras. YouCam genera la visualización y el resultado se puede guardar, consultar o comprar por WhatsApp.

La asesora conserva el perfil, la paleta, las recomendaciones y los looks mientras la pestaña esté abierta. No es un chatbot de preguntas genéricas: es un recorrido guiado con memoria de sesión.

### Privacidad

- Cada foto tiene su propio consentimiento y se pide en la etapa en la que se usa.
- No se guardan fotos en el catálogo, en `localStorage` ni en el estado de la experiencia. Solo se conserva el resultado del análisis (tono y paleta) y, si la persona guarda un look, la referencia del producto y la URL del resultado de YouCam.
- La memoria se guarda en `sessionStorage` y se borra al cerrar la pestaña. El botón **Reiniciar experiencia** también la elimina.
- Si YouCam no está disponible, el análisis local sigue funcionando y se identifica como **Lectura local**. El probador virtual nunca inventa una imagen: si falla, muestra el error y ofrece WhatsApp.

---

## Estructura

```
frontend-template/            Sitio estático servido por Cloudflare Pages
├── index.html                Catálogo (categorías → grilla) + banner de Aguamarina AI
├── product.html              Ficha de producto
├── cart.html                 Carrito
├── admin.html                Panel de administración
├── asesora.html              Aguamarina AI (experiencia de 4 etapas)
├── styles.css                Sistema de diseño (tokens en :root)
├── app.js                    Lógica: config, productos, carrito, render
├── productos.json            Respaldo si la API no responde
├── asesora/
│   ├── engine.js             Perfil, paletas y motor de recomendación (sin DOM)
│   ├── asesora.js            Flujo de la asesora, fotos y probador
│   └── asesora.css           Estilos, todos prefijados `ai-`
└── ...

functions/api/                Pages Functions (raíz del repo)
├── tono.js                   Proxy del análisis de tono de YouCam
└── vto.js                    Proxy del probador virtual de YouCam

backend/                      API REST (Express + MongoDB + Cloudinary) en Render
├── server.js
├── productos.json
└── .env.example
```

> El proyecto de Cloudflare Pages usa `frontend-template` como salida estática y `/functions` en la raíz del repositorio para las Pages Functions.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML, CSS y JavaScript vanilla. Sin build, sin framework |
| Hosting | Cloudflare Pages (sitio + Functions) |
| Backend | Express 5, MongoDB Atlas, Cloudinary (Render) |
| Probador virtual | YouCam API v2 (Perfect Corp) |
| Pagos | Ninguno: el pedido se cierra por WhatsApp |

---

## Desarrollo local

### 1. Frontend + Functions

```bash
npm install -g wrangler
wrangler pages dev frontend-template --functions functions --binding YOUCAM_API_KEY=tu_key_de_prueba
```

Abre `http://localhost:8788`. `wrangler` sirve los archivos estáticos y ejecuta `functions/api/vto.js` y `functions/api/tono.js`, que son los que necesitas para probar el try-on y el análisis de tono.

> Abrir `asesora.html` o `index.html` con doble clic **no** funciona para las funciones de IA: no hay `/api/vto` ni `/api/tono`. El catálogo y la experiencia local sí se ven, pero el probador mostrará un error honesto y el análisis quedará como lectura local.

### 2. Backend (opcional)

```bash
cd backend
npm install
npm start
```

Variables necesarias en `backend/.env` (ver `backend/.env.example`): `MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `SUPER_ADMIN_PASSWORD`, `PORT`.

Sin backend, el frontend usa `productos.json` como respaldo.

---

## Deploy

**Cloudflare Pages**
- Root directory: raíz del repositorio
- Build command: *(ninguno)*
- Build output directory: `frontend-template`
- Functions directory: `functions`
- Variable secreta: `YOUCAM_API_KEY`

**Render** (backend)
- Root directory: `backend`
- Build: `npm install` · Start: `npm start`

---

## Notas de seguridad

- La API key de YouCam es un secreto de Pages; no está en el repositorio ni en el HTML.
- `product_img` se valida contra una lista blanca de hosts (`i.ibb.co`, `res.cloudinary.com`) antes de enviarla a YouCam, porque la API descarga esa URL: sin la lista blanca sería un SSRF.
- Se rechazan fotos de más de 9 MB y formatos distintos de JPG/PNG.
- Se valida el `Origin` de las peticiones para limitar el consumo de unidades desde sitios ajenos.

---

## Licencia

MIT — ver `LICENSE`.
