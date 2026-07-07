# Zero Patients

A modern rebuild of [zero-patients/Pandemic](https://github.com/zero-patients/Pandemic) — a
Jackbox-style Pandemic clone: the board lives on a shared screen, players act from their phones.

## Architecture

Pure game engine, authoritative server, thin clients.

```
packages/
├── shared/    # protocol: zod action/event schemas + the city graph (generated
│              # from the original repo's data, with its adjacency bugs fixed)
└── engine/    # the rules: a pure `applyAction(state, playerId, action)` reducer.
               # No I/O, seeded RNG in-state → deterministic and replayable.
apps/          # (phase 2/3) socket server + web client
```

The engine validates every action and returns `{ state, events }` — events drive
board animations. Clients never enforce rules.

## Status

- [x] Engine v1: all 8 actions, turn phases, epidemics, outbreak chains, win/loss,
      4 roles (medic, scientist, researcher, operations expert), hand limit
- [ ] Event cards (Airlift etc.), remaining roles (dispatcher, quarantine specialist,
      contingency planner), ops-expert charter power
- [ ] Server: rooms, socket protocol, reconnect tokens
- [ ] Web: board (TV) + controller (phone) — see `../pandemic-board-mockup.html`
      and `../pandemic-controller-mockup.html` for the design direction

## Development

```sh
npm install
npm test          # engine test suite (vitest)
npm run typecheck
```

Player counts 2–4. Epidemic difficulty: 4 (easy) / 5 (normal) / 6 (heroic).
