/**
 * Cloudflare Pages Function — /api/vto
 *
 * Proxy del Virtual Try-On de YouCam API. La key vive SOLO en el entorno de
 * Cloudflare Pages (Settings > Variables and Secrets > YOUCAM_API_KEY).
 *
 * Contrato con el cliente:
 *   POST /api/vto   (multipart: photo, category, product_img)  -> { taskId, category }
 *   GET  /api/vto?taskId=...&category=...                      -> { status, url? }
 *
 * Se parte en dos llamadas a propósito: crear la tarea y sondearla por separado
 * evita requests largos que mueran por timeout. El cliente sondea cada 2 s.
 *
 * No hay endpoint de docs verificado todavía: las rutas de los campos se
 * resuelven con `pick()`, que tolera las variantes conocidas de la API V2.
 * Una vez validado con scripts/youcam-check.mjs, se pueden fijar.
 */

const BASE = "https://yce-api-01.makeupar.com";

const CATEGORIES = new Set(["bracelet", "necklace"]);

// Hosts permitidos para la imagen del producto (evita SSRF: YouCam descarga esa URL).
const ALLOWED_IMAGE_HOSTS = new Set([
  "i.ibb.co",
  "res.cloudinary.com",
  "aguamarina-store.pages.dev",
]);

const MAX_BYTES = 9 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

/** Resuelve el primer valor existente entre varias rutas tipo "a.b.0.c". */
function pick(obj, paths) {
  for (const path of paths) {
    let cur = obj;
    for (const key of path.split(".")) {
      if (cur === null || cur === undefined) break;
      cur = cur[key];
    }
    if (cur !== null && cur !== undefined && cur !== "") return cur;
  }
  return null;
}

/** Extrae la URL de resultado de las formas que devuelve la API. */
function resultUrl(payload) {
  const results = pick(payload, ["data.results", "result.results"]);
  const url = pick(payload, [
    "data.results.0.url",
    "data.results.url",
    "result.results.0.url",
    "result.results.url",
    "data.result_url",
    "result.result_url",
  ]);
  if (url) return url;
  if (Array.isArray(results)) {
    const first = results.find((r) => typeof r === "string" || r?.url);
    if (typeof first === "string") return first;
    if (first?.url) return first.url;
  }
  return null;
}

function isAllowedImageUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  return parsed.protocol === "https:" && ALLOWED_IMAGE_HOSTS.has(parsed.hostname);
}

/** Bloquea llamadas desde orígenes ajenos (mitiga el consumo de unidades). */
function originAllowed(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true; // same-origin sin cabecera Origin
  try {
    const host = new URL(origin).hostname;
    return (
      host === new URL(request.url).hostname ||
      host.endsWith(".pages.dev") ||
      host === "localhost" ||
      host === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.YOUCAM_API_KEY) return json({ error: "Falta el secreto YOUCAM_API_KEY" }, 500);
  if (!originAllowed(request)) return json({ error: "Origen no permitido" }, 403);

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Se esperaba multipart/form-data" }, 400);
  }

  const photo = form.get("photo");
  const category = form.get("category");
  const productImg = form.get("product_img");

  if (!photo || typeof photo === "string") return json({ error: "Falta la foto" }, 400);
  if (!CATEGORIES.has(category)) return json({ error: "Categoría no soportada" }, 400);
  if (!productImg || !isAllowedImageUrl(productImg)) {
    return json({ error: "Imagen de producto inválida o de un host no permitido" }, 400);
  }
  if (!ALLOWED_TYPES.has(photo.type)) return json({ error: "Formato no soportado: usá JPG o PNG" }, 400);
  if (photo.size > MAX_BYTES) return json({ error: "La foto supera los 9 MB" }, 400);

  const auth = {
    Authorization: `Bearer ${env.YOUCAM_API_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    // 1) Pedir URL de subida
    const fileRes = await fetch(`${BASE}/s2s/v2.0/file`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        files: [
          {
            content_type: photo.type,
            file_name: photo.type === "image/png" ? "user.png" : "user.jpg",
            file_size: photo.size,
          },
        ],
      }),
    });
    const fileJson = await fileRes.json().catch(() => null);
    if (!fileRes.ok) {
      return json({ error: "El File API rechazó la solicitud", detail: fileJson }, 502);
    }

    const fileId = pick(fileJson, [
      "data.files.0.file_id",
      "result.files.0.file_id",
      "data.file_id",
      "result.file_id",
    ]);
    const uploadUrl = pick(fileJson, [
      "data.files.0.requests.0.url",
      "result.files.0.requests.0.url",
      "data.files.0.url",
      "data.url",
    ]);
    const uploadHeaders = pick(fileJson, [
      "data.files.0.requests.0.headers",
      "result.files.0.requests.0.headers",
    ]);

    if (!fileId || !uploadUrl) {
      return json({ error: "Respuesta inesperada del File API", detail: fileJson }, 502);
    }

    // 2) Subir los bytes a la URL firmada
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: uploadHeaders || { "Content-Type": photo.type },
      body: await photo.arrayBuffer(),
    });
    if (!uploadRes.ok) {
      return json({ error: `La subida falló (HTTP ${uploadRes.status})` }, 502);
    }

    // 3) Crear la tarea de try-on
    const taskRes = await fetch(`${BASE}/s2s/v2.0/task/2d-vto/${category}`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ src_file_id: fileId, ref_file_urls: [productImg] }),
    });
    const taskJson = await taskRes.json().catch(() => null);
    if (!taskRes.ok) {
      return json({ error: "No se pudo crear la tarea", detail: taskJson }, 502);
    }

    const taskId = pick(taskJson, ["data.task_id", "result.task_id", "task_id"]);
    if (!taskId) return json({ error: "La tarea no devolvió id", detail: taskJson }, 502);

    return json({ taskId, category });
  } catch (err) {
    return json({ error: `Error de red: ${String(err)}` }, 500);
  }
}

export async function onRequestGet({ request, env }) {
  if (!env.YOUCAM_API_KEY) return json({ error: "Falta el secreto YOUCAM_API_KEY" }, 500);
  if (!originAllowed(request)) return json({ error: "Origen no permitido" }, 403);

  const params = new URL(request.url).searchParams;
  const taskId = params.get("taskId");
  const category = params.get("category");
  if (!taskId || !CATEGORIES.has(category)) return json({ error: "Parámetros inválidos" }, 400);

  try {
    const res = await fetch(`${BASE}/s2s/v2.0/task/2d-vto/${category}/${taskId}`, {
      headers: { Authorization: `Bearer ${env.YOUCAM_API_KEY}` },
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) return json({ error: "No se pudo consultar la tarea", detail: payload }, 502);

    const status = pick(payload, [
      "data.task_status",
      "result.task_status",
      "task_status",
    ]);

    if (status === "success") {
      const url = resultUrl(payload);
      if (!url) return json({ error: "Tarea resuelta sin URL de resultado", detail: payload }, 502);
      return json({ status: "success", url });
    }
    if (status === "error") {
      return json({
        status: "error",
        error: pick(payload, ["data.error_message", "data.error", "result.error"]) || "La tarea falló",
      });
    }
    return json({ status: status || "processing" });
  } catch (err) {
    return json({ error: `Error de red: ${String(err)}` }, 500);
  }
}
