# Pasos para migrar el backend

Guía para pasar el backend de Render a una cuenta nueva, sin tocar los datos.
Hacé los bloques en orden. No saltees el 3.

---

## 0. Antes de empezar

Tené a mano:

- [ ] Usuario y contraseña de MongoDB Atlas (proyecto **Aguamarina**).
- [ ] Acceso a GitHub con la cuenta `JoseMota0190`.
- [ ] Acceso a Render (podés crear cuenta nueva con GitHub).
- [ ] Acceso al panel del cronjob: puede ser **cron-job.org** o **UptimeRobot**.
- [ ] La contraseña `SUPER_ADMIN_PASSWORD` del backend actual.

Tiempo estimado:

- Bloque 1 (Atlas): 15 minutos.
- Bloque 2 (Render): 25 minutos.
- Bloques 3 a 5: 30 minutos.
- Total: alrededor de 1 hora y 15 minutos.

Importante: no borres nada del backend viejo hasta terminar el bloque 6.

---

## 1. MongoDB Atlas — obtener la llave

- [ ] Entrá a https://cloud.mongodb.com e iniciá sesión.
- [ ] Abrí el proyecto **Aguamarina**.
- [ ] En el cluster **Aguamarina**, tocá **Connect**.
- [ ] Elegí **Drivers**.
- [ ] En "Driver", elegí **Node.js**.
- [ ] Copiá la cadena que empieza con `mongodb+srv://`. Guardala en un lugar seguro, no en el repo.

La cadena trae `<password>` escrito así, entre signos. Hay que reemplazarlo por la contraseña real del usuario de la base.

- [ ] Si no te acordás de la contraseña, andá a **Security → Database Access**.
- [ ] Tocá **Add New Database User**.
- [ ] Poné un usuario y una contraseña nuevos. Anotá la contraseña.
- [ ] En permisos, elegí **Read and write to any database**.
- [ ] Guardá con **Add User**.
- [ ] Volvé a la cadena y reemplazá `<password>` por esa contraseña.

Si la contraseña tiene símbolos raros (`@`, `:`, `/`, `#`), cambiala por una solo con letras y números. Evitás errores de conexión.

- [ ] Andá a **Security → Network Access**.
- [ ] Tocá **Add IP Address**.
- [ ] Elegí **Allow Access from Anywhere** (queda `0.0.0.0/0`).
- [ ] Confirmá.

Por qué: Render usa IPs que cambian. Si cerrás el acceso a una IP fija, el backend no conecta.

- [ ] Andá a **Browse Collections**.
- [ ] Verificá que estén las 4 colecciones: `stores`, `productos`, `configs`, `ventas`.
- [ ] Abrí `productos` y fijate que haya datos.

Si ves las 4 colecciones con datos, la base está bien. No hay que migrar nada.

Advertencia: **no pegues la URI en ningún archivo del repo**. Ni en `README`, ni en un `.md`, ni en el código. Va solo en Render, en el bloque 2.

---

## 2. Render — crear el servicio

- [ ] Entrá a https://render.com y creá cuenta con GitHub, o iniciá sesión en la cuenta nueva.
- [ ] Tocá **New +** y elegí **Web Service**.
- [ ] Conectá el repo `JoseMota0190/jm-catalogos-web`.
- [ ] Completá los campos así, tal cual:

| Campo | Valor |
|---|---|
| Name | `jm-catalogos-backend` |
| Language / Runtime | `Node` |
| Branch | `main` |
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | `Free` |

- [ ] Tocá **Create Web Service** o **Deploy Web Service**.

Después del deploy:

- [ ] Abrí la pestaña **Environment**.
- [ ] Agregá estas 5 variables, una por una, con **Add Environment Variable**:

| Variable | Valor |
|---|---|
| `MONGODB_URI` | la cadena del bloque 1, con la contraseña real |
| `CLOUDINARY_CLOUD_NAME` | el cloud name de Cloudinary |
| `CLOUDINARY_API_KEY` | la API key de Cloudinary |
| `CLOUDINARY_API_SECRET` | el API secret de Cloudinary |
| `SUPER_ADMIN_PASSWORD` | la contraseña maestra que ya usás |

- [ ] No agregues `PORT`. Render lo pone solo.
- [ ] Guardá. Render redeploya solo.

Esperá a que el estado diga **Live**.

- [ ] Copiá la URL del servicio, arriba de todo. Es algo como `https://jm-catalogos-backend-xxxx.onrender.com`.
- [ ] Guardala. En esta guía se llama `URL_NUEVA`.

Si el deploy falla: abrí **Logs** y buscá la primera línea en rojo.

---

## 3. Verificar el backend nuevo

No sigas hasta que todo este bloque dé bien.

Abrí **PowerShell** y pegá estos comandos, uno por uno. Cambiá `URL_NUEVA` por tu URL, sin barra al final.

- [ ] Ping:

```powershell
$URL = "URL_NUEVA"
Invoke-RestMethod "$URL/ping"
```

Tiene que devolver `status ok`.

- [ ] Config de Aguamarina:

```powershell
Invoke-RestMethod "$URL/api/config?store=aguamarina"
```

Tiene que aparecer el nombre de la tienda.

- [ ] Productos de Aguamarina (tienen que ser 113):

```powershell
(Invoke-RestMethod "$URL/api/productos" -Headers @{ "x-store-id" = "aguamarina" }).Count
```

- [ ] Productos de Karaz (tienen que ser 34):

```powershell
(Invoke-RestMethod "$URL/api/productos" -Headers @{ "x-store-id" = "karaz" }).Count
```

- [ ] Seed protegido (tiene que devolver `401`):

```powershell
curl.exe -s -o NUL -w "%{http_code}" -X POST "$URL/api/seed" -H "x-store-id: aguamarina"
```

También podés probar en el navegador:

- [ ] Abrí `URL_NUEVA/ping` → `{"status":"ok"}`
- [ ] Abrí `URL_NUEVA/api/config?store=aguamarina` → datos de la tienda

Si algo falla:

- [ ] Abrí **Logs** en Render y leé el último error.
- [ ] Si dice error de conexión a Mongo, volvé a **Atlas → Security → Network Access** y revisá que esté `0.0.0.0/0`.
- [ ] Si dice "No autorizado" en `/api/config`, revisá que el `x-store-id` esté bien escrito.
- [ ] Si los productos dan 0, la URI puede estar apuntando a otra base. Revisá el bloque 1.

---

## 4. Apuntar los frontends a la URL nueva

Hacer esto solo si el bloque 3 pasó completo. Si lo hacés antes, las tiendas quedan sin productos.

**Repo `jm-catalogos-web`:**

- [ ] Abrí `frontend-template/app.js`.
- [ ] Buscá la línea 15: `const API_URL = ...`.
- [ ] Reemplazá la URL vieja por `URL_NUEVA`.
- [ ] Guardá, hacé commit y push a `main`.

**Repo `karaz-store`:**

- [ ] Abrí `app.js` en la raíz del repo.
- [ ] Buscá la misma línea `const API_URL = ...`.
- [ ] Reemplazá la URL vieja por `URL_NUEVA`.
- [ ] Guardá, hacé commit y push a `main`.

Cloudflare Pages redeploya solo al hacer push. No hay que tocar nada en el panel.

- [ ] Esperá 2 o 3 minutos.
- [ ] Abrí https://aguamarina-store.pages.dev y recargá con `Ctrl + F5`.
- [ ] Fijate que se vean los productos.

---

## 5. Cronjob

Sin cronjob, el plan free duerme a los 15 minutos sin visitas. La primera visita después tarda unos 50 segundos.

Primero, encontrá cuál es el cronjob:

- [ ] Buscá en tu correo "cron-job.org", "UptimeRobot" o "uptime".
- [ ] Revisá las pestañas abiertas y los marcadores del navegador.
- [ ] Si no aparece, entrá a https://cron-job.org y a https://uptimerobot.com y probá recuperar la cuenta con tu email.

Cuando lo encuentres:

- [ ] Abrí el monitor o job que apunta al backend viejo.
- [ ] Editá la URL y poné `URL_NUEVA/ping`.
- [ ] Método: `GET`.
- [ ] Intervalo: cada 14 minutos (el servicio duerme a los 15).
- [ ] Horario: **solo de 8:00 a 23:00**. No lo dejes 24/7.
- [ ] Guardá.
- [ ] Esperá la primera ejecución y confirmá que el estado esté en verde.

Si no encontrás el cronjob viejo, creá uno nuevo en cron-job.org con esos mismos datos.

### Por qué no 24/7 (incidente del 30/10/2026)

Un cronjob cada 10 minutos durante las 24 horas mantiene el servicio encendido todo el mes y consume casi las **750 horas gratis** de Render. El 30 de octubre de 2026 Render suspendió `jm-catalogos-web-1` con el evento **"Suspended by Free Tier Usage Exceeded"** y no volvió hasta el siguiente ciclo de facturación.

Con horario de 8:00 a 23:00 se usan unas **450 horas al mes**, con margen de sobra. Fuera de ese horario la primera visita tarda ~50 segundos en despertar el backend, y eso es aceptable.

Según la documentación de Render, las 750 horas son **por mes calendario** y se reinician **al inicio de cada mes (UTC)**. La suspensión dura hasta ese reinicio; no hay forma de adelantarla sin pasar a un plan pago.

Cómo revisarlo:

- [ ] Render → **Billing** → mirar "Free instance hours" y la fecha de reinicio del ciclo.
- [ ] Render → servicio → **Events** → confirmar que no vuelva a aparecer "Free Tier Usage Exceeded".
- [ ] En cron-job.org, editar el job → **Schedule** → limitar las horas activas.

---

## 6. Checklist final

- [ ] Aguamarina carga con sus 113 productos.
- [ ] Karaz carga con sus 34 productos.
- [ ] El admin de Aguamarina entra con su contraseña.
- [ ] Se puede crear o editar un producto (probá con uno de prueba y borralo).
- [ ] El probador virtual abre y devuelve una imagen.
- [ ] El cronjob está en verde y apunta a `URL_NUEVA/ping`.
- [ ] `URL_NUEVA/ping` responde rápido, sin esperar 50 segundos.

Cuando todo esté en verde, el backend viejo ya no se usa.

---

## 7. Pendientes conocidos (después del deploy)

- [ ] **Backups en OFF.** Atlas no está respaldando solo. Corré `cd backend; npm run backup` (con `MONGODB_URI` en el entorno) al menos una vez por semana y guardá la carpeta `backend/backups/<fecha>/` fuera del repositorio. También podés exportar cada colección desde Atlas → **Browse Collections → Export Collection**.
- [ ] **Contraseñas de admin en texto plano.** En la colección `stores`, el campo `adminPassword` se guarda sin encriptar. Es deuda técnica. No lo arregles en caliente: primero hacé el backup del punto anterior.
- [ ] **Confirmar el dueño del cronjob.** Entrá al panel y verificá que la cuenta sea tuya y no la perdida. Si no podés entrar, creá uno nuevo y borrá el viejo cuando el nuevo esté en verde.

---

## 8. Si la tienda vuelve a mostrar el catálogo viejo

Síntoma: aparecen productos que ya se habían borrado y faltan los últimos que se subieron, como si la tienda hubiera vuelto meses atrás.

Qué pasó: el backend de Render estaba dormido, suspendido o caído, y el frontend no pudo cargar `/api/productos`. Antes hacía un *fallback* silencioso a `productos.json` (el respaldo estático). Desde el arreglo del 01/11/2026, cuando eso pasa la tienda muestra un aviso rojo abajo: **"No pudimos conectar con la tienda…"**, con un botón **Reintentar**. Si ves ese aviso, el catálogo que se muestra NO es el de la base.

Pasos para diagnosticar:

- [ ] Abrí `URL_NUEVA/ping`. Si tarda ~50 s, el servicio estaba dormido; si devuelve error o una página de "suspended", revisá Render.
- [ ] En Render → servicio → **Events**, buscá `Suspended by Free Tier Usage Exceeded`.
- [ ] En Render → **Billing**, mirá "Free instance hours". Las 750 horas se reinician al inicio del mes (UTC).
- [ ] Revisá que el cronjob/UptimeRobot apunte a `URL_NUEVA/ping` y que **solo** corra de 8:00 a 23:00. Un monitor 24/7 vuelve a agotar las horas y Render suspende el servicio hasta el mes siguiente.
- [ ] Cuando el backend responda, recargá la tienda con `Ctrl + F5`.

Los datos de la base no se pierden por este fallo. Lo que sí se pierde son los cambios que se intentaron guardar mientras el backend estaba caído: esas peticiones nunca llegaron al servidor y hay que volver a hacerlas.

Importante: `productos.json` es solo un respaldo de emergencia. Conviene regenerarlo después de cambios grandes:

```powershell
$URL = "URL_NUEVA"
$productos = Invoke-RestMethod "$URL/api/productos" -Headers @{ "x-store-id" = "aguamarina" }
$productos | ConvertTo-Json -Depth 5 | Set-Content "frontend-template\productos.json" -Encoding utf8
```

Y después commitear el archivo para que Cloudflare lo publique.

