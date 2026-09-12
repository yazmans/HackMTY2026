// Storage for the Eno Family linking flow.
//
// Uses Node's built-in `node:sqlite` (stable since Node 22) instead of
// Postgres: this repo has no Postgres server to point at, and a driver
// nobody can run against real infra here isn't worth shipping untested.
// DATABASE_URL still reads like a connection string on purpose — swapping
// to real Postgres later means rewriting this file's internals (`pg` +
// parameterized SQL), not the routes that call it.
import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const DATABASE_URL = process.env.DATABASE_URL || './data/links.db'

if (DATABASE_URL !== ':memory:') {
  const dir = dirname(resolve(DATABASE_URL))
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

export const db = new DatabaseSync(DATABASE_URL)

db.exec(`
  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senior_customer_id TEXT NOT NULL,
    copilot_customer_id TEXT,
    code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    permissions TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_links_code ON links(code);
  CREATE INDEX IF NOT EXISTS idx_links_senior ON links(senior_customer_id);
  CREATE INDEX IF NOT EXISTS idx_links_copilot ON links(copilot_customer_id);

  -- High-value transfers (senior, amount over the threshold) get held for
  -- the linked copilot to approve/hold instead of executing immediately.
  CREATE TABLE IF NOT EXISTS transfer_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link_id INTEGER NOT NULL,
    payer_account_id TEXT NOT NULL,
    payee_id TEXT NOT NULL,
    amount REAL NOT NULL,
    concept TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (link_id) REFERENCES links(id)
  );
  CREATE INDEX IF NOT EXISTS idx_transfer_requests_link ON transfer_requests(link_id);
  CREATE INDEX IF NOT EXISTS idx_transfer_requests_status ON transfer_requests(status);
`)
