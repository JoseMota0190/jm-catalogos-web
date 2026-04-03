# Aguamarina Backend

API REST para gestión de tiendas de bisutería artesanal.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/productos` | Listar todos los productos |
| GET | `/api/productos/:categoria` | Filtrar por categoría |
| POST | `/api/productos` | Crear producto (con imagen) |
| PUT | `/api/productos/:id` | Actualizar producto |
| DELETE | `/api/productos/:id` | Eliminar producto |
| GET | `/api/config` | Obtener configuración |
| PUT | `/api/config` | Actualizar configuración |
| POST | `/api/login` | Login admin |
| POST | `/api/seed` | Cargar productos iniciales |

## Variables de Entorno

Crear archivo `.env` con:

```env
MONGODB_URI=mongodb+srv://...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
ADMIN_PASSWORD=tu_contraseña
STORE_NAME=Nombre de la Tienda
WHATSAPP_NUMBER=58...
PORT=3000
```

## Desarrollo Local

```bash
npm install
npm start
```

## Deploy en Render

1. Crear cuenta en [render.com](https://render.com)
2. Crear Web Service con:
   - Build Command: `npm install`
   - Start Command: `npm start`
3. Agregar Variables de Entorno en el panel de Render
4. Conectar este repositorio o hacer push

## MongoDB Atlas

1. Crear cuenta en [mongodb.com/atlas](https://mongodb.com/atlas)
2. Crear cluster gratuito
3. Crear database user
4. Copiar connection string

## Cloudinary

1. Crear cuenta en [cloudinary.com](https://cloudinary.com)
2. Obtener cloud_name, api_key, api_secret del dashboard