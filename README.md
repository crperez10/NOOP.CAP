# CP Workspace

Aplicacion web para administrar clientes, registros, adjuntos y usuarios con dos perfiles:

- `Administrador`: puede crear, editar y eliminar datos.
- `Invitado`: puede ver e interactuar con busquedas/filtros, sin modificar informacion.

## Stack

- Frontend: HTML, CSS y JavaScript vanilla en `public/`.
- Backend: Node.js + Express.
- Base de datos: MongoDB con Mongoose.
- Archivos adjuntos: MongoDB GridFS, para que los uploads funcionen en Vercel sin depender del filesystem.
- Sesiones: `express-session` + `connect-mongo`.

## Estructura

```txt
api/index.js          Entrada serverless para Vercel
public/               Interfaz web
server/app.js         App Express reutilizable local/Vercel
server/index.js       Servidor local
server/config/        MongoDB, Passport y uploads
server/routes/        Auth, clientes, registros y adjuntos
server/models/        User, Client, Item
vercel.json           Configuracion de deploy
```

## Desarrollo Local

1. Instalar dependencias:

```bash
npm install
```

2. Crear `.env` desde `.env.example`:

```bash
copy .env.example .env
```

3. Configurar variables:

```env
PORT=3000
APP_URL=http://localhost:3000
SESSION_SECRET=un-secreto-largo
MONGODB_URI=mongodb://127.0.0.1:27017/client-data-admin
ADMIN_SEED_EMAIL=admin@example.com
ADMIN_SEED_PASSWORD=change-me
ADMIN_SEED_NAME=Cristian Perez
SEED_STARTER_CLIENTS=true
```

4. Iniciar MongoDB local o Docker:

```bash
docker compose up -d
```

5. Iniciar la app:

```bash
npm run dev
```

Abre `http://localhost:3000`.

## Deploy en Vercel

1. Sube el repositorio a GitHub.
2. En Vercel, importa el repositorio desde GitHub.
3. Configura estas Environment Variables en Vercel:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/client-data-admin
SESSION_SECRET=un-secreto-largo-y-seguro
ADMIN_SEED_EMAIL=tu-admin@example.com
ADMIN_SEED_PASSWORD=tu-password-seguro
ADMIN_SEED_NAME=Cristian Perez
SEED_STARTER_CLIENTS=false
```

4. Deploy.

`vercel.json` redirige todas las rutas a `api/index.js`, que levanta Express como Vercel Function. Los archivos de `public/` se sirven desde Express.

## Base de Datos Recomendada

Vercel no reemplaza a MongoDB como motor principal de base de datos. Para esta app conviene usar:

- MongoDB Atlas para documentos de clientes, registros, usuarios y sesiones.
- GridFS dentro de MongoDB Atlas para adjuntos.

Esto evita depender del disco temporal de Vercel Functions y mantiene datos + archivos en un servicio persistente.

## Notas Para Produccion

- No subas `.env`; ya esta ignorado por Git.
- Cambia `ADMIN_SEED_PASSWORD` despues del primer deploy si lo compartiste.
- Usa una contraseña fuerte en `SESSION_SECRET`.
- En MongoDB Atlas, permite conexiones desde Vercel. Para comenzar puedes usar `0.0.0.0/0`; para produccion conviene restringirlo si tu arquitectura lo permite.
