# ENO Family

A prototype banking app built around **Eno Family**: a consent-based link
between an elderly account holder (the **senior**) and a trusted family
member (the **copilot**) who helps keep their account safe — without ever
seeing full transaction detail or being able to move money unilaterally.

The UI is in Spanish (matching the target users); this README is in English.

## What it does

- **Two interfaces for the senior**: an oversized, high-contrast "Easy Mode"
  and a conventional standard dashboard, toggleable at will.
- **Eno Family linking**: the senior generates a real, server-issued 6-digit
  code; the copilot enters it; the senior signs off with their NIP. All of
  it is backed by a real backend + Postgres-shaped SQLite store and
  socket.io — no simulate buttons, no client-side pretend state.
- **High-value transfer holds**: a senior's transfer above a threshold isn't
  sent immediately — it's held for the copilot to approve or stop, with the
  senior notified in real time either way.
- **Delegated virtual cards**: the copilot can request a category-limited
  virtual card (via a scripted "Eno" chat assistant or a direct form); it
  only exists once the senior authorizes it with their NIP. Neither path can
  bypass the other.
- **Subscription monitoring ("Fugas por suscripción")**: both the senior's
  own dashboard and the copilot's monitoring view show the senior's real
  recurring bills (from Nessie's `/bills` endpoint) — the copilot sees the
  same names, never the amounts.
- **Emergency / support call button**: shows a "calling support" pop-up;
  no real call is placed.
- Real account data (balance, transfers) comes from Capital One's
  [Nessie](http://api.nessieisreal.com) sandbox API; purchases/movements use
  a deterministic hardcoded month (Nessie's sandbox purchases feed is
  unreliable — see `src/data/mockPurchases.js`).

## Live Demo

The application backend and frontend are currently deployed on Vultr. You can test the live prototype here: [http://66.42.81.252]

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React 18 + Vite, Tailwind CSS, `lucide-react` icons |
| Backend | Node/Express, `socket.io`, SQLite via Node's built-in `node:sqlite` |
| External API | Capital One Nessie (accounts, transfers, bills) |
| Testing | Playwright, driven as plain scripts (not a test runner) |

## Project structure

```
src/
  components/        UI components (one screen/widget per file)
  context/           AppContext.jsx — session, linking state, card requests
  hooks/              useAccountData.js — Nessie account + local purchases
  services/          Fetch wrappers: Nessie API, links/transfers/cards APIs, socket.io client
  data/              mockPurchases.js — deterministic month of purchase data
server/
  src/
    index.js         Express app + socket.io server
    db.js            SQLite schema (links, transfer_requests, card_requests)
    socket.js        Per-customerId socket.io rooms
    routes/          links.js, transfers.js, cardRequests.js
scripts/             Playwright verification scripts (see Testing below)
```

The frontend and backend are two independent Node projects (separate
`package.json`s, separate `node_modules`) — there's no workspace tooling,
so each needs its own `npm install`.

## Prerequisites

- **Node.js 22+** (the backend uses the built-in `node:sqlite` module).
- A free Nessie API key from <http://api.nessieisreal.com>.

## Setup

1. **Frontend deps + env**
   ```bash
   npm install
   cp .env.example .env
   # then edit .env and paste your Nessie key into VITE_NESSIE_API_KEY
   ```

2. **Backend deps + env**
   ```bash
   cd server
   npm install
   cp .env.example .env
   cd ..
   ```
   The backend's `.env` needs no editing to get started — SQLite and the
   default ports just work. `CORS_ORIGIN` must match wherever the frontend
   actually runs (see below) if you ever change its port.

3. **Run the backend** (own terminal)
   ```bash
   cd server
   npm run dev
   ```
   Listens on `http://localhost:4000`. Watch its startup log — env/dotenv
   issues surface there, not just when you click something in the UI later.

4. **Run the frontend** (separate terminal, from the repo root)
   ```bash
   npm run dev
   ```
   Opens on `http://localhost:5173` by default (see `vite.config.js`).

5. Open the printed URL, sign in with a name + a real Nessie Customer ID,
   and use "Eno Family" to link a second persona (open the app in a second
   browser tab/profile signed in with a different Customer ID to play both
   roles).

## Environment variables

**Root `.env`** (frontend, read via `import.meta.env`):

| Variable | Meaning |
|---|---|
| `VITE_NESSIE_API_KEY` | Your Nessie sandbox API key |
| `VITE_API_URL` | Base URL of the backend (default `http://localhost:4000`) |

**`server/.env`** (backend):

| Variable | Meaning |
|---|---|
| `PORT` | Backend HTTP + socket.io port (default `4000`) |
| `DATABASE_URL` | Path to the SQLite file (default `./data/links.db`) |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated |

Neither `.env` file is committed (see `.gitignore`) — copy the matching
`.env.example` to get started.

## Testing

`scripts/*.mjs` are standalone Playwright scripts (not wired into a test
runner) that drive the real app in a real browser against the real backend.
Nessie itself is stubbed in most of them so runs are fast and don't touch
the live sandbox; a couple deliberately hit the real Nessie API to verify
end-to-end behavior.

With both dev servers already running:

```bash
node scripts/verify-flow.mjs        # full linking flow, both personas, both dashboards
node scripts/verify-links.mjs       # Eno Family linking in isolation
node scripts/verify-transfer-hold.mjs  # high-value transfer hold/approve/reject
node scripts/verify-eno-chat.mjs    # Eno chat -> virtual card request flow
node scripts/verify-live-api.mjs    # real Nessie API, no stubbing
```

Playwright needs its browser binaries installed once: `npx playwright install chromium`.

## Notes on a few deliberate design choices

- **SQLite, not Postgres**, despite the `DATABASE_URL`-shaped env var —
  there's no Postgres instance to develop against here, and swapping it in
  later only means rewriting `server/src/db.js`, not the routes that use it.
- **Purchases are hardcoded, not fetched from Nessie** (`src/data/mockPurchases.js`) —
  Nessie's sandbox purchases feed has real data-integrity issues (some
  accounts 400 on GET). Account balance and bills still come from the real
  API.
- **High-value transfer approval never calls Nessie** — the copilot's
  decision is a status change plus a socket.io notification; the senior's
  side reflects it with the same optimistic balance/purchase update a
  normal transfer already uses. No money actually moves in either case —
  this is a sandbox prototype.
