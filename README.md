# Postales & Cartas Vintage

Aplicación web full-stack para escribir, sellar y enviar cartas y postales entre amigos con estética de papel envejecido, sobre animado con sello de lacre rojo y un catálogo de **100 estampillas postales argentinas** organizadas por década.

---

## Descripción y Funcionalidades

- **Redacción y envío animado**: Escritura de cartas con título y cuerpo sobre papel vintage, selección de estampilla y secuencia animada al enviar (guardado en el sobre, cierre de solapa, sellado con lacre, giro y envío).
- **Apertura de sobres**: Al recibir una carta, el destinatario puede abrir el sobre con animación paso a paso y marcarla automáticamente como leída.
- **Catálogo de estampillas argentinas**: 100 estampillas reales en formato `.webp` filtrables por época (*Hasta 1959*, *1960–1979*, *1980–1999*, *2000–2009*, *2010 en adelante*), además de soporte para estampillas *legacy* en cartas históricas y vista ampliada (zoom).
- **Sistema de amigos con código postal**: Cada usuario recibe un código único (`POSTAL-XXXXXX`). Permite enviar, aceptar o rechazar solicitudes de amistad (buscando por nombre de usuario o código) y eliminar amistades.
- **Bandejas y gestión**: Bandeja de entrada (*Inbox*), cartas enviadas (*Sent*) y eliminación individual o masiva de cartas enviadas.
- **Autenticación**: Registro e inicio de sesión con contraseñas hasheadas y sesiones mediante JSON Web Tokens (JWT).

---

## Tecnologías Utilizadas

### Frontend (`client/`)
- **React 18** (`react`, `react-dom`)
- **Vite 5** (`vite`, `@vitejs/plugin-react`) con proxy `/api` hacia el backend en desarrollo
- **Lucide React** (`lucide-react`) para iconografía
- **CSS / Tailwind** para estilos y animaciones de sobre, papel y lacre

### Backend (`server/` & `api/`)
- **Node.js** (18+)
- **Express 4** (`express`)
- **JWT** (`jsonwebtoken`) para autenticación stateless (expiración 7 días)
- **bcryptjs** (`bcryptjs`) para hash de contraseñas
- **CORS** (`cors`) y **dotenv** (`dotenv`)

### Persistencia y Despliegue
- **Almacenamiento dual (`server/db.js`)**:
  - **Producción / Serverless**: Upstash Redis / Vercel KV mediante API REST (`KV_REST_API_URL` + `KV_REST_API_TOKEN` o `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`).
  - **Desarrollo local**: Archivo JSON (`server/data.json`, o `/tmp/data.json` en entorno Vercel sin Redis).
- **Vercel** (`vercel.json` + `api/index.js`): Build estático del cliente (`client/dist`) y backend Express montado como Serverless Function en `/api/*`.

---

## Estructura del Proyecto

```text
postales-vintage/
├── api/
│   └── index.js              # Entrypoint serverless para Vercel (exporta server/server.js)
├── client/
│   ├── src/
│   │   ├── assets/           # Textura de papel y 100+ imágenes de estampillas
│   │   ├── App.jsx           # Interfaz principal, animaciones, auth, bandejas y amigos
│   │   ├── StampPickerModal.jsx
│   │   ├── StampVisual.jsx
│   │   ├── stampsData.js     # Categorías por época y resolución de estampillas
│   │   └── stamps.json       # Metadatos del catálogo de estampillas
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── db.js                 # Capa de persistencia (Upstash Redis / JSON local)
│   ├── server.js             # API REST con Express + JWT
│   ├── data.json             # Base de datos local inicial
│   └── package.json
├── scripts/                  # Scripts auxiliares para descarga/procesado de estampillas
├── package.json              # Dependencias raíz para el runtime de Vercel
└── vercel.json               # Configuración de build, output y rewrites en Vercel
```

---

## Endpoints de la API

| Método | Ruta | Descripción | Auth |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Registro de usuario y generación de `friendCode` | No |
| `POST` | `/api/auth/login` | Inicio de sesión y emisión de JWT | No |
| `GET` | `/api/me` | Datos del usuario autenticado | Sí |
| `GET` | `/api/friends` | Lista de amigos confirmados | Sí |
| `GET` | `/api/friends/requests` | Solicitudes de amistad entrantes y salientes | Sí |
| `POST` | `/api/friends/add` | Enviar solicitud por `username` o `friendCode` | Sí |
| `POST` | `/api/friends/requests/:id/accept` | Aceptar solicitud de amistad | Sí |
| `POST` | `/api/friends/requests/:id/reject` | Rechazar solicitud de amistad | Sí |
| `DELETE` | `/api/friends/:friendId` | Eliminar amistad | Sí |
| `GET` | `/api/letters` | Obtener bandeja de entrada (`inbox`) y enviados (`sent`) | Sí |
| `POST` | `/api/letters` | Enviar una nueva carta/postal a un amigo | Sí |
| `PATCH` | `/api/letters/:id/open` | Marcar una carta recibida como abierta | Sí |
| `DELETE` | `/api/letters/:id` | Borrar una carta enviada | Sí |
| `DELETE` | `/api/letters/sent/all` | Borrar todas las cartas enviadas del usuario | Sí |

---

## Instalación y Uso Local

### Requisitos
- Node.js 18 o superior

### 1. Iniciar el servidor (Express)
```bash
cd server
npm install
npm start
```
El backend queda escuchando en `http://localhost:4000`.

#### Variables de entorno opcionales (`server/.env`)
- `PORT`: Puerto del servidor (por defecto `4000`).
- `JWT_SECRET`: Clave secreta para firmar los tokens JWT.
- `ENVIO_INMEDIATO`: `true` por defecto (entrega instantánea). Si se define `false`, aplica una demora de 4 horas en la entrega.
- `KV_REST_API_URL` / `KV_REST_API_TOKEN` (o `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`): Para persistir datos en Redis en lugar del archivo `data.json`.

### 2. Iniciar el cliente (React + Vite)
En otra terminal:
```bash
cd client
npm install
npm run dev
```
Abre la URL que indica Vite (por defecto `http://localhost:5173`). Las peticiones a `/api` se redirigen automáticamente a `http://127.0.0.1:4000`.

---

## Despliegue en Vercel

El proyecto incluye [`vercel.json`](vercel.json) listo para desplegar frontend y backend en un mismo proyecto de Vercel:
- **Build Command**: `npm --prefix client install && npm --prefix client run build`
- **Output Directory**: `client/dist`
- **Serverless Function**: `api/index.js` (incluye `server/**`)
- **Rewrites**: `/api/(.*)` -> `/api` y el resto de rutas al `index.html` de la SPA.

En producción se recomienda configurar `JWT_SECRET` y las credenciales de **Upstash Redis / Vercel KV** en las variables de entorno del proyecto en Vercel.
