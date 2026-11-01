/**
 * Cloudflare Pages Function — /api/tono
 *
 * Proxy del AI Facial Color Tones Analyzer de YouCam API.
 * La key vive SOLO en el entorno de Cloudflare Pages (YOUCAM_API_KEY).
 *
 * Contrato con el cliente:
 *   POST /api/tono  (multipart: photo)  -> { taskId }
 *   GET  /api/tono?taskId=...           -> { status, color?, face_quality? }
 *
 * Igual que el VTO, crear la tarea y sondearla van separados para que ninguna
 * petición quede colgada esperando.
 */

const BASE = "https://yce-api-01.makeupar.com";

const MAX_BYTES = 10 * 1024 * 1024;
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

/** Bloquea llamadas desde orígenes ajenos (mitiga el consumo de unidades). */
function originAllowed(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
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

const authHeaders = (env) => ({
  Authorization: `Bearer ${env.YOUCAM_API_KEY}`,
  "Content-Type": "application/json",
});

/** Sube la foto con el File API y devuelve el file_id. */
async function subirFoto(photo, env) {
  const fileRes = await fetch(`${BASE}/s2s/v2.0/file`, {
    method: "POST",
    headers: authHeaders(env),
    body: JSON.stringify({
      files: [
        {
          content_type: photo.type,
          file_name: photo.type === "image/png" ? "selfie.png" : "selfie.jpg",
          file_size: photo.size,
        },
      ],
    }),
  });
  const fileJson = await fileRes.json().catch(() => null);
  if (!fileRes.ok) {
    const err = new Error("El File API rechazó la solicitud");
    err.detail = fileJson;
    throw err;
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
    const err = new Error("Respuesta inesperada del File API");
    err.detail = fileJson;
    throw err;
  }

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: uploadHeaders || { "Content-Type": photo.type },
    body: await photo.arrayBuffer(),
  });
  if (!uploadRes.ok) {
    throw new Error(`La subida falló (HTTP ${uploadRes.status})`);
  }

  return fileId;
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
  if (!photo || typeof photo === "string") return json({ error: "Falta la foto" }, 400);
  if (!ALLOWED_TYPES.has(photo.type)) {
    return json({ error: "Formato no soportado: usá JPG o PNG" }, 400);
  }
  if (photo.size > MAX_BYTES) return json({ error: "La foto supera los 10 MB" }, 400);

  try {
    const fileId = await subirFoto(photo, env);

    const taskRes = await fetch(`${BASE}/s2s/v2.0/task/skin-tone-analysis`, {
      method: "POST",
      headers: authHeaders(env),
      body: JSON.stringify({
        src_file_id: fileId,
        face_angle_strictness_level: "medium",
      }),
    });
    const taskJson = await taskRes.json().catch(() => null);
    if (!taskRes.ok) {
      return json({ error: "No se pudo crear la tarea", detail: taskJson }, 502);
    }

    const taskId = pick(taskJson, ["data.task_id", "result.task_id", "task_id"]);
    if (!taskId) return json({ error: "La tarea no devolvió id", detail: taskJson }, 502);

    return json({ taskId });
  } catch (err) {
    return json({ error: err.message || `Error de red: ${String(err)}`, detail: err.detail }, 502);
  }
}

export async function onRequestGet({ request, env }) {
  if (!env.YOUCAM_API_KEY) return json({ error: "Falta el secreto YOUCAM_API_KEY" }, 500);
  if (!originAllowed(request)) return json({ error: "Origen no permitido" }, 403);

  const taskId = new URL(request.url).searchParams.get("taskId");
  if (!taskId) return json({ error: "Falta taskId" }, 400);

  try {
    const res = await fetch(
      `${BASE}/s2s/v2.0/task/skin-tone-analysis/${encodeURIComponent(taskId)}`,
      { headers: { Authorization: `Bearer ${env.YOUCAM_API_KEY}` } }
    );
    const payload = await res.json().catch(() => null);
    if (!res.ok) return json({ error: "No se pudo consultar la tarea", detail: payload }, 502);

    const status = pick(payload, ["data.task_status", "result.task_status", "task_status"]);

    if (status === "success") {
      const color = pick(payload, ["data.results.color", "result.results.color", "results.color"]);
      const faceQuality = pick(payload, [
        "data.results.face_quality",
        "result.results.face_quality",
        "results.face_quality",
      ]);
      if (!color) return json({ error: "Tarea resuelta sin colores", detail: payload }, 502);
      return json({ status: "success", color, face_quality: faceQuality });
    }
    if (status === "error") {
      return json({
        status: "error",
        error: pick(payload, ["data.error_message", "data.error", "result.error"]) || "La tarea falló",
        code: pick(payload, ["data.error", "result.error"]),
      });
    }
    return json({ status: status || "running" });
  } catch (err) {
    return json({ error: `Error de red: ${String(err)}` }, 500);
  }
}
