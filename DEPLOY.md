# Guia de Despliegue - Sistema de Inventario

## Arquitectura

```
Frontend (GitHub Pages) → Backend (Render.com) → MongoDB Atlas
```

## Paso 1: MongoDB Atlas (Base de Datos)

1. Ir a https://www.mongodb.com/atlas
2. Crear cuenta gratuita
3. Crear cluster gratuito (M0 Sandbox)
4. En **Database Access**: crear usuario con contraseña
5. En **Network Access**: agregar `0.0.00.0/0` (acceso desde cualquier IP)
6. En **Database > Connect**: copiar la URI de conexion
   - Formato: `mongodb+srv://<usuario>:<password>@cluster0.xxxxx.mongodb.net/inventario?retryWrites=true&w=majority`

## Paso 2: Render.com (Backend)

1. Ir a https://render.com
2. Crear cuenta gratuita
3. **New > Web Service**
4. Conectar repositorio de GitHub
5. Configurar:
   - **Name**: `inventario-api`
   - **Runtime**: Node
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && node index.js`
6. En **Environment Variables** agregar:
   - `MONGODB_URI` = URI de MongoDB Atlas ( Paso 1 )
   - `JWT_SECRET` = cadena secreta larga (ej: `mi_clave_secreta_123_xyz`)
   - `PORT` = 3000
7. Copiar la URL del servicio (ej: `https://inventario-api.onrender.com`)

## Paso 3: Actualizar Frontend

En `js/db.js`, cambiar la URL de produccion:

```javascript
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://inventario-api.onrender.com/api';
```

## Paso 4: GitHub Pages (Frontend)

1. Subir codigo a repositorio de GitHub
2. Ir a **Settings > Pages**
3. Source: **Deploy from a branch**
4. Branch: **main** / **master**, carpeta: **/ (root)**
5. Guardar
6. La app estara disponible en: `https://tuusuario.github.io/nombre-repo/`

## Paso 5: Usuarios por Defecto

Al iniciar el backend sin usuarios, ejecutar:

```bash
curl -X POST https://inventario-api.onrender.com/api/users/seed
```

Esto creara:
- **admin** / admin123 (rol: admin)
- **vendedor1** / venta123 (rol: empleado)
- **vendedor2** / venta123 (rol: empleado)

## Variables de Entorno (server/.env)

```
MONGODB_URI=mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/inventario
JWT_SECRET=mi_clave_secreta_muy_larga_aqui
PORT=3000
```

## Notas Importantes

- El backend en Render.com tarda ~30s en despertar en la primera peticion
- El plan gratuito de Render apaga el servicio tras 15 min de inactividad
- MongoDB Atlas gratuito limita a 512MB de almacenamiento
- Las credenciales por defecto son para testing, cambiarlas en produccion
