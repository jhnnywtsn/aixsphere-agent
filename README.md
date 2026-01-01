# aixsphere-agent

A lightweight Vite + React workbench for managing agents and experimenting with prompt reverse engineering.

## Features
- Prompt reverse-engineering panel that extracts tone, formatting signals, and recurring keywords from any model output.
- Media dashboard placeholder for reviewing captured agent footage.
- Socket.io chat panel for quick back-and-forth with a running agent backend.

## Scripts
- `npm run start` – launch the Vite dev server.
- `npm run build` – create a production build.

> The chat panel expects a socket.io server at `http://192.168.0.86:8000`. Update the URL in `Chat.jsx` if your backend differs.
