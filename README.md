# Zero Patients

A modern rebuild of [zero-patients/Pandemic](https://github.com/zero-patients/Pandemic) — a
Jackbox-style Pandemic clone: the board lives on a shared screen, players act from their phones.

**Play it:** https://mitchellsam.github.io/zero-patients/ — open it on a laptop or TV to host,
then join from phones with the room code. The server runs on Render's free tier and sleeps when
idle, so the first game of a session takes ~30–60s to start while it wakes.

## Architecture

Pure game engine, authoritative server, thin clients.

```
packages/
├── shared/    # protocol: zod action/event/room schemas, GameSnapshot, and the city
│              # graph (generated from the original repo's data, adjacency bugs fixed)
└── engine/    # the rules: a pure `applyAction(state, playerId, action)` reducer.
               # No I/O, seeded RNG in-state → deterministic and replayable.
apps/
├── server/    # socket.io: rooms, reconnect tokens, action routing, snapshots
│              # `npm run dev -w @zero-patients/server` (PORT=3001)
└── web/       # Vite + React: `/` create/join, `/board/:code` TV view,
               # `/play/:code` phone controller
               # `npm run dev -w @zero-patients/web` (5173, VITE_SERVER_URL to point elsewhere)
```

The engine validates every action and returns `{ state, events }` — events drive
board animations. Clients never enforce rules.

## Status

- [x] Engine v1: all 8 actions, turn phases, epidemics, outbreak chains, win/loss,
      4 roles (medic, scientist, researcher, operations expert), hand limit
- [ ] Event cards (Airlift etc.), remaining roles (dispatcher, quarantine specialist,
      contingency planner), ops-expert charter power
- [x] Server: 4-letter room codes, socket.io protocol (zod-validated at the edge),
      reconnect tokens, board/spectator watch, snapshot redaction (deck order stays server-side)
- [ ] Redis-backed rooms (in-memory for now; single node)
- [x] Web: board (TV) with live SVG map + controller (phone) with legality-aware
      actions; reconnect via localStorage token. Design per `../pandemic-board-mockup.html`
      and `../pandemic-controller-mockup.html` (custom CSS ported from the mockups;
      Tailwind deferred)
- [ ] Animations (Motion), sounds, QR code on the lobby screen

## Development

```sh
npm install
npm test          # engine test suite (vitest)
npm run typecheck
```

Player counts 2–4. Epidemic difficulty: 4 (easy) / 5 (normal) / 6 (heroic).

## Deployment

The two halves are hosted separately, because the client is static and the server is not.

| Half | Host | What runs there |
| --- | --- | --- |
| `apps/web` | GitHub Pages | The built React app — home, board, and controller screens |
| `apps/server` + `packages/engine` | Render (free plan) | socket.io, rooms, and all authoritative game logic |

`packages/shared` compiles into both sides so they agree on the protocol. Game state lives in
server memory, so a Render restart drops any game in progress.

**Client** — `.github/workflows/deploy-pages.yml` builds and publishes on every push to `main`.
It bakes in two build-time values: `VITE_BASE` (the `/zero-patients/` subpath Pages serves from)
and `VITE_SERVER_URL`, which comes from the repo variable `SERVER_URL`. Because the server URL is
baked in at build time, changing it means updating the variable *and* rebuilding:

```sh
gh variable set SERVER_URL --repo MitchellSam/zero-patients --body "https://<server>.onrender.com"
gh workflow run deploy-pages.yml --repo MitchellSam/zero-patients
```

Deep links (`/board/ABCD`) rely on `404.html`, a copy of `index.html` that the workflow makes —
GitHub Pages answers unknown paths with it, and the router takes over. Those URLs return an HTTP
404 status while rendering correctly; that is expected.

**Server** — defined by [`render.yaml`](render.yaml) and managed as a Render Blueprint, so that
file is the source of truth: edit it, commit, then sync the Blueprint from the Render dashboard.
Pushes to `main` auto-deploy the service. To recreate the server from scratch, use
**New → Blueprint** in the Render dashboard and pick this repo.
