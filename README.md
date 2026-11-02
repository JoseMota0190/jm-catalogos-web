# Aguamarina Store — Catalog + Aguamarina AI (YouCam API)

> ⚠️ **This branch (`main`) is the production version of the store without YouCam.**  
> The complete hackathon delivery (Virtual Try-On, AI Style Advisor, Cloudflare Pages Functions for YouCam) lives on the **`demo`** branch:  
> 🔗 https://github.com/TU_USUARIO/jm-catalogos-web/tree/demo  
> 🚀 Hackathon preview: https://demo.aguamarina-store.pages.dev/asesora.html

Multi-tenant web catalog for handmade jewelry stores, with shopping cart, admin panel, a **session-memory style advisor**, and **real Virtual Try-On** of bracelets and necklaces via the YouCam API by Perfect Corp.

Live store: **https://aguamarina-store.pages.dev**

This is not a showcase demo: it is the real store of **Aguamarina Store** (Calabozo, Venezuela), with more than 100 products, its owner, and daily WhatsApp orders. The virtual try-on and the advisor were added on top of the same catalog customers already use every day.

---

## How the Virtual Try-On works

1. The customer reaches a specific piece from **Aguamarina AI** recommendations and chooses **Try On**.
2. At step 04 they upload the corresponding photo: neck/shoulders for a necklace, wrist for a bracelet. The browser resizes it to 1024 px before sending.
3. The frontend calls `POST /api/vto`, a Cloudflare Pages Function that uploads the photo to YouCam (File API), creates a `2d-vto/{bracelet|necklace}` task, and returns a `taskId`.
4. The client polls `GET /api/vto?taskId=…` every 2 s up to 90 s.
5. When finished, it shows the real result labeled **“YouCam API”** with actions to save the look, check availability, or order the piece via WhatsApp.

The YouCam key lives **only** as a Cloudflare Pages secret (`YOUCAM_API_KEY`). It is never sent to the browser.

Deliberate design: creating the task and polling it are **two separate endpoints**, so no request hangs waiting. If YouCam fails, the interface shows an error. **Never** does it compose a fake image that could be confused with a real result.

Compatible categories: `bracelets → bracelet`, `necklaces → necklace`. The `wholesale` category (packs and displays) does not show the try-on because they are not pieces you wear on the body.

---

## Aguamarina AI — a single experience

`asesora.html` is a standalone page (does not change traditional navigation or catalog) with four chained steps:

1. **Know your style.** Occasion, style, pieces, metal, and budget. Saved in tab memory.
2. **Discover your tones.** The person uploads a selfie with explicit consent. An immediate local reading is performed, and if `YOUCAM_API_KEY` is configured, it is refined with YouCam's **AI Facial Color Tones Analyzer**. The result is always presented as aesthetic guidance, never as a definitive classification or diagnosis. The palette can also be chosen manually.
3. **Find your accessories.** The engine crosses profile + palette + real catalog and returns three concrete pieces with an explanation of why they are recommended. Excludes wholesale and anklets (not likely on wrist).
4. **Try them virtually.** Asks for the photo only at that moment: neck/shoulders for necklaces, wrist for bracelets. YouCam generates the visualization and the result can be saved, checked, or purchased via WhatsApp.

The advisor keeps profile, palette, recommendations, and looks while the tab is open. It is not a generic Q&A chatbot: it is a guided journey with session memory.

### Privacy

- Each photo has its own consent, requested at the step where it is used.
- Photos are not saved in the catalog, in `localStorage`, or in experience state. Only the analysis result (tone and palette) is kept, and, if the person saves a look, the product reference and the YouCam result URL.
- Memory is stored in `sessionStorage` and cleared when the tab is closed. The **Restart experience** button also removes it.
- If YouCam is unavailable, local analysis still works and is identified as **Local Reading**. The virtual try-on never invents an image: if it fails, it shows the error and offers WhatsApp.

---

## Structure

```
frontend-template/            Static site served by Cloudflare Pages
├── index.html                Catalog (categories → grid) + Aguamarina AI banner
├── product.html              Product detail
├── cart.html                 Cart
├── admin.html                Admin panel
├── asesora.html              Aguamarina AI (4-step experience)
├── styles.css                Design system (tokens in :root)
├── app.js                    Logic: config, products, cart, render
├── productos.json            Backup if API does not respond
├── asesora/
│   ├── engine.js             Profile, palettes, and recommendation engine (no DOM)
│   ├── asesora.js            Advisor flow, photos, and try-on
│   └── asesora.css           Styles, all prefixed `ai-`
└── ...

functions/api/                Cloudflare Pages Functions (repo root)
├── tono.js                   YouCam tone analysis proxy
└── vto.js                    Virtual Try-On proxy

backend/                      REST API (Express + MongoDB + Cloudinary) on Render
├── server.js
├── productos.json
└── .env.example
```

> The Cloudflare Pages project uses `frontend-template` as static output and `/functions` at repo root for Pages Functions.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, and vanilla JavaScript. No build, no framework |
| Hosting | Cloudflare Pages (site + Functions) |
| Backend | Express 5, MongoDB Atlas, Cloudinary (Render) |
| Virtual Try-On | YouCam API v2 (Perfect Corp) |
| Payments | None: the order is closed via WhatsApp |

---

## Local development

### 1. Frontend + Functions

```bash
npm install -g wrangler
wrangler pages dev frontend-template --functions functions --binding YOUCAM_API_KEY=your_test_key
```

Open `http://localhost:8788`. `wrangler` serves static files and runs `functions/api/vto.js` and `functions/api/tono.js`, which you need to test try-on and tone analysis.

> Opening `asesora.html` or `index.html` by double-clicking **does not** work for AI functions: there is no `/api/vto` nor `/api/tono`. Catalog and local experience are visible, but the try-on will show an honest error and analysis remains local reading.

### 2. Backend (optional)

```bash
cd backend
npm install
npm start
```

Required variables in `backend/.env` (see `backend/.env.example`): `MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `SUPER_ADMIN_PASSWORD`, `PORT`.

Without backend, the frontend uses `productos.json` as backup.

---

## Deploy

**Cloudflare Pages**
- Root directory: repository root
- Build command: *(none)*
- Build output directory: `frontend-template`
- Functions directory: `functions`
- Secret variable: `YOUCAM_API_KEY`

**Render** (backend)
- Root directory: `backend`
- Build: `npm install` · Start: `npm start`

---

## Security notes

- YouCam API key is a Pages secret; it is not in the repository nor in HTML.
- `product_img` is validated against an allowlist of hosts (`i.ibb.co`, `res.cloudinary.com`) before sending to YouCam, because the API downloads that URL: without the allowlist it would be an SSRF.
- Photos larger than 9 MB and formats other than JPG/PNG are rejected.
- `Origin` of requests is validated to limit unit consumption from external sites.

---

## For the judges

- **Live store:** https://aguamarina-store.pages.dev  
- **Backend:** https://jm-catalogos-web-1.onrender.com/ping  
- **Repository:** https://github.com/TU_USUARIO/jm-catalogos-web  
- **Hackathon branch:** https://github.com/TU_USUARIO/jm-catalogos-web/tree/demo  
- **Hackathon preview:** https://demo.aguamarina-store.pages.dev/asesora.html  
- **Devpost:** https://youcam-api-skin-ai-ecommerce.devpost.com/

---

## License

MIT — see `LICENSE`.
