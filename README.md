# Vintage Postcards & Letters

A full-stack web application for writing, sealing, and sending vintage-style letters and postcards between friends, featuring aged paper aesthetics, animated envelopes with a red wax seal, and a catalog of **100 Argentine postage stamps** organized by era.

---

## Description & Features

- **Animated Writing & Sending**: Compose letters with a subject and message on vintage paper, pick a postage stamp, and watch a multi-stage sending animation (tucking the letter into the envelope, folding the flap, pressing the wax seal, flipping, and sending).
- **Envelope Opening Animation**: Recipients open incoming envelopes with a step-by-step unsealing animation that automatically marks the letter as read.
- **Argentine Postage Stamp Catalog**: 100 real `.webp` stamps filterable by era (*Before 1959*, *1960–1979*, *1980–1999*, *2000–2009*, *2010 onwards*), plus legacy stamp support for older letters and an enlarged zoom modal.
- **Friend System with Postal Codes**: Each user gets a unique friend code (`POSTAL-XXXXXX`). Users can send, accept, or reject friend requests (searching by username or friend code) and remove friends.
- **Inbox & Sent Management**: Dedicated *Inbox* and *Sent* views, with single or bulk deletion of sent letters.
- **Authentication**: User registration and login with hashed passwords and JSON Web Token (JWT) sessions.

---

## Tech Stack

### Frontend (`client/`)
- **React 18** (`react`, `react-dom`)
- **Vite 5** (`vite`, `@vitejs/plugin-react`) with an `/api` dev proxy to the backend
- **Lucide React** (`lucide-react`) for icons
- **CSS / Tailwind** for styling and envelope/paper/wax-seal animations

### Backend (`server/` & `api/`)
- **Node.js** (18+)
- **Express 4** (`express`)
- **JWT** (`jsonwebtoken`) for stateless authentication (7-day expiration)
- **bcryptjs** (`bcryptjs`) for password hashing
- **CORS** (`cors`) & **dotenv** (`dotenv`)

### Persistence & Deployment
- **Dual Storage (`server/db.js`)**:
  - **Production / Serverless**: Upstash Redis / Vercel KV via REST API (`KV_REST_API_URL` + `KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`).
  - **Local Development**: JSON file storage (`server/data.json`, or `/tmp/data.json` on Vercel without Redis configured).
- **Vercel** (`vercel.json` + `api/index.js`): Static build of the React client (`client/dist`) and Express backend mounted as a Serverless Function at `/api/*`.

---

## Project Structure

```text
postales-vintage/
├── api/
│   └── index.js              # Vercel serverless entrypoint (exports server/server.js)
├── client/
│   ├── src/
│   │   ├── assets/           # Vintage paper texture and 100+ stamp images
│   │   ├── App.jsx           # Main UI, animations, auth, inbox/sent, and friends
│   │   ├── StampPickerModal.jsx
│   │   ├── StampVisual.jsx
│   │   ├── stampsData.js     # Era categories and stamp lookup helpers
│   │   └── stamps.json       # Stamp catalog metadata
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── db.js                 # Persistence layer (Upstash Redis / local JSON)
│   ├── server.js             # Express REST API + JWT auth
│   ├── data.json             # Initial local JSON database
│   └── package.json
├── scripts/                  # Helper scripts for fetching/processing stamps
├── package.json              # Root dependencies for Vercel runtime
└── vercel.json               # Vercel build, output, and rewrite configuration
```

---

## API Endpoints

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Register a new user and generate a `friendCode` | No |
| `POST` | `/api/auth/login` | Authenticate user and issue a JWT | No |
| `GET` | `/api/me` | Get authenticated user profile | Yes |
| `GET` | `/api/friends` | List confirmed friends | Yes |
| `GET` | `/api/friends/requests` | List incoming and outgoing friend requests | Yes |
| `POST` | `/api/friends/add` | Send friend request by `username` or `friendCode` | Yes |
| `POST` | `/api/friends/requests/:id/accept` | Accept a friend request | Yes |
| `POST` | `/api/friends/requests/:id/reject` | Reject a friend request | Yes |
| `DELETE` | `/api/friends/:friendId` | Remove a friend | Yes |
| `GET` | `/api/letters` | Fetch `inbox` and `sent` letters | Yes |
| `POST` | `/api/letters` | Send a new letter/postcard to a friend | Yes |
| `PATCH` | `/api/letters/:id/open` | Mark a received letter as opened | Yes |
| `DELETE` | `/api/letters/:id` | Delete a sent letter | Yes |
| `DELETE` | `/api/letters/sent/all` | Delete all letters sent by the user | Yes |

---

## Local Setup & Usage

### Prerequisites
- Node.js 18 or higher

### 1. Start the server (Express)
```bash
cd server
npm install
npm start
```
The backend will run on `http://localhost:4000`.

#### Optional environment variables (`server/.env`)
- `PORT`: Server port (defaults to `4000`).
- `JWT_SECRET`: Secret key used to sign JWT tokens.
- `ENVIO_INMEDIATO`: `true` by default (instant delivery). Set to `false` to enable a 4-hour delivery delay.
- `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`): Persist data in Redis instead of `data.json`.

### 2. Start the client (React + Vite)
In a separate terminal:
```bash
cd client
npm install
npm run dev
```
Open the URL shown by Vite (default `http://localhost:5173`). Requests to `/api` are automatically proxied to `http://127.0.0.1:4000`.

---

## Deploying to Vercel

The repository includes [`vercel.json`](vercel.json) configured to deploy both frontend and backend in a single Vercel project:
- **Build Command**: `npm --prefix client install && npm --prefix client run build`
- **Output Directory**: `client/dist`
- **Serverless Function**: `api/index.js` (bundles `server/**`)
- **Rewrites**: `/api/(.*)` -> `/api` and all other routes to the SPA `index.html`.

For production deployments, configure `JWT_SECRET` and **Upstash Redis / Vercel KV** credentials in your Vercel project's environment variables.
