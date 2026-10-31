# Ludo Buddy

A responsive Ludo game with pass-and-play mode and private online rooms. No account is required. Online game state and move validation live on the Node.js server.

## Included

- 2–4 player local games and private online rooms with shareable links.
- Server-authoritative turns, dice rolls, captures, safe squares, and home runs.
- Four themes, generated background music, and sound-effect controls.
- React + Vite frontend and a persistent Socket.IO backend.

## Local development

Requires Node.js 20+ and npm.

```sh
npm install
npm run dev
```

Open the Vite URL (usually `http://localhost:5173`). The server listens on port 3001. To point the frontend to a different backend, set `VITE_SERVER_URL` in `client/.env.local`, such as `http://localhost:3001`. Open two browser windows to create and join an online room. Browsers require a user gesture before audio can play.

## Frontend deployment (Vercel)

Import the repository, set the **Root Directory** to `client`, and add `VITE_SERVER_URL` as the public HTTPS origin of your backend (no path). Vercel builds the Vite app to `client/dist`; `client/vercel.json` supports room-link refreshes.

## Backend deployment

Deploy the repository root as a long-running Node web service on Render, Railway, Fly.io, or another host supporting persistent WebSocket connections. It uses the root `start` script and listens on the host-provided `PORT` (3001 locally). Set `CLIENT_ORIGIN` to the frontend origin. A comma-separated allowlist is supported; leaving it unset allows any origin. `/health` is a health endpoint.

Room state is held in memory, so use one backend instance unless you add a Socket.IO adapter and shared storage. Disconnected seats can be reclaimed, and empty rooms expire after 15 minutes.

## Rules

Each player has four tokens. Roll a six to leave base. Tokens go clockwise around a shared 52-space track, then up their home lane; an exact count is needed to finish. Star spaces are safe. Landing on an opponent on an unprotected space sends that token to base. A six, capture, or token reaching home grants another turn. The first player to finish all four tokens wins.

## Layout

- `client/` — React + Vite interface
- `server/` — Express health endpoint and Socket.IO room/game logic

Music is synthesized in the browser; theme choice is remembered on-device.
