# Zero Patients

A modern rebuild of [zero-patients/Pandemic](https://github.com/zero-patients/Pandemic) — a
Jackbox-style Pandemic clone: the board lives on a shared screen, players act from their phones.

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
