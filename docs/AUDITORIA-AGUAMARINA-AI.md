# Auditoría y plan — Rediseño de Aguamarina AI

Rama: `feature/aguamarina-ai`
Base: implementación ya desplegada en la rama `demo` (`77565be`).
Alcance: **solo** la experiencia `/asesora`. No se modifica `main` ni producción.

## 1. Inventario de lo que ya funciona

### Frontend

- `frontend-template/asesora.html`: experiencia de cuatro etapas.
- `frontend-template/asesora/engine.js`: perfil, paletas orientativas, lectura de tono y ranking de productos.
- `frontend-template/asesora/asesora.js`: flujo, memoria de sesión, fotos, probador YouCam y WhatsApp.
- `frontend-template/asesora/asesora.css`: estilos con prefijo `ai-`.
- `frontend-template/app.js`: catálogo, configuración, carrito y `formatPrice`.
- `frontend-template/productos.json`: respaldo local del catálogo real.

### Integraciones reutilizadas

- **Catálogo real:** `loadProducts()` consulta la API y cae a `productos.json`.
- **Tono:** `POST /api/tono` (multipart `photo`) → `taskId`; `GET /api/tono?taskId=…` → `{ status, color, face_quality }`.
- **VTO collares:** `POST /api/vto` (multipart `photo`, `category=necklace`, `product_img`) → `taskId`; `GET /api/vto?taskId=…&category=necklace` → `{ status, url }`.
- **VTO pulseras:** mismo contrato con `category=bracelet`.
- **Límites verificados:** JPG/PNG; 10 MB en tono, 9 MB en VTO; el cliente reduce a 1024 px antes de enviar.
- **Seguridad:** la `YOUCAM_API_KEY` permanece en las Pages Functions, nunca en el navegador.

## 2. Hallazgos de la auditoría visual

1. **Duplicación de progreso:** la portada de la experiencia repetía las cuatro etapas y el stepper las volvía a mostrar.
2. **Etapa 01 con aspecto de formulario:** chips de texto, sin jerarquía visual ni imágenes del catálogo.
3. **Presupuesto fijo:** los rangos 10/20/40 no se calculaban con los precios reales del catálogo.
4. **Etapa 02 demasiado utilitaria:** la carga de selfie no tenía marco, checklist de encuadre ni una animación de análisis con recorrido visual.
5. **Recomendaciones poco diferenciadas:** las tres tarjetas tenían el mismo peso y no comunicaban “mejor combinación / alternativa / algo diferente”.
6. **Probador:** al cambiar de producto se perdía la foto aunque fuera del mismo tipo de pieza.
7. **Asesora en móvil:** el panel quedaba siempre extendido y competía con el contenido principal.
8. **Dirección visual:** la página era clara y correcta, pero no transmitía todavía el estudio digital inmersivo y premium pedido.

## 3. Plan de implementación

### Shell visual

- Fondo petróleo profundo con halos turquesa y detalles dorados.
- Panel de experiencia translúcido; superficie interior marfil para mantener legibilidad.
- Stepper oscuro con progreso, etapa activa y etapas completadas.
- Asesora en panel oscuro translúcido; en móvil, desplegable.

### Etapa 01

- Tarjetas visuales con fotografías reales del catálogo para ocasión, estilo y tipo de pieza.
- Metales con muestras visuales.
- Presupuesto calculado con cuartiles de los precios reales y formateado con `formatPrice`.
- Línea contextual de la asesora que cambia con cada selección.
- Microanimaciones y estados seleccionados.

### Etapa 02

- Marco de selfie con esquinas, silueta y checklist de luz/encuadre.
- Vista previa reemplazable.
- Animación de escaneo durante el análisis.
- Resultado con barra de paleta, muestras, metales y ajuste manual.

### Etapa 03

- Tres roles: mejor combinación, alternativa y propuesta diferente.
- Curaduría sin duplicados sobre el catálogo real.
- Fotografía, nombre, precio, descripción disponible y motivo.
- Guardar favorito, probar y abrir ficha.
- Preguntas rápidas a la asesora sobre la pieza.

### Etapa 04

- Pregunta la foto solo al elegir una pieza.
- Conserva la foto al cambiar a otra pieza del mismo tipo.
- Pide una foto nueva al cambiar de collar a pulsera.
- Resultado, cambio de pieza, cambio de foto, favoritos y WhatsApp.

### Móvil

- Una columna.
- Asesora desplegable.
- Barra inferior fija con acción principal y acceso a la asesora.
- Sin comprimir la experiencia de escritorio.

### Pruebas

- Navegación entre las cuatro etapas y vuelta atrás.
- Persistencia de perfil, paleta, recomendaciones, favoritos y pieza seleccionada.
- Cambio de preferencias y recálculo.
- Catálogo real y respaldo local.
- Probador de collar y de pulsera con respuestas simuladas de la API.
- Estados de error de YouCam.
- Escritorio y móvil.
- Ausencia de errores JavaScript.
- Regresión del catálogo normal.

## 4. Restricciones respetadas

- Sin frameworks ni migración de arquitectura.
- Sin cambios en `main`, producción, Cloudflare ni Render.
- Sin inventar productos, precios, imágenes, stock ni metales.
- Sin exponer secretos en el frontend.
- Sin eliminar integraciones existentes: se reutilizan los mismos endpoints y contratos.
