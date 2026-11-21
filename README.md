# Postales & Cartas Vintage (React + Node.js)

Aplicación web para escribir y enviar cartas y postales entre amigos con estética de papel envejecido, sobre con sello de lacre rojo, tipografía de máquina de escribir y estampillas personalizables.

## Requisitos
- Node.js 18 o superior

## 1. Iniciar el servidor (Node.js + Express)
```bash
cd server
cp .env.example .env
npm install
npm start
```
El servidor queda corriendo en `http://localhost:4000`.
Por defecto `ENVIO_INMEDIATO=true` para que puedas probar los envíos al instante. Si luego quieres activar la demora por distancia, cambia `ENVIO_INMEDIATO=false` en `server/.env`.

## 2. Iniciar el cliente (React + Vite)
En otra terminal:
```bash
cd client
npm install
npm run dev
```
Abre la URL que muestra Vite (por defecto `http://localhost:5173`).
