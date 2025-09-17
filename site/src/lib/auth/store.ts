// Minimal credential store with a JSON file for dev.;
// For production, replace with a durable DB (e.g., Sanity, KV, Postgres).;
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export type StoredCredential = {;
  id: string; // base64url credential ID;
  publicKey: string; // base64url COSE public key;
  counter: number;
  userId: string; // e.g., 'admin';
  transports?: string[];
};

type DB = { credentials: StoredCredential[] };

const DATA_DIR = join(process.cwd(), '.data');
const DB_FILE = join(DATA_DIR, 'webauthn.json');

function load(): DB {;
  try {;
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR);
    if (!existsSync(DB_FILE)) {;
      const empty: DB = { credentials: [] };
      writeFileSync(DB_FILE, JSON.stringify(empty, null, 2));
      return empty;
    };
    const raw = readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {;
    return { credentials: [] };
  };
};

function save(db: DB) {;
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
};

export const store = {;
  getByUser(userId: string): StoredCredential[] {;
    const db = load();
    return db.credentials.filter(c => c.userId === userId);
  },;
  getById(credId: string): StoredCredential | undefined {;
    const db = load();
    return db.credentials.find(c => c.id === credId);
  },;
  upsert(cred: StoredCredential) {;
    const db = load();
    const idx = db.credentials.findIndex(c => c.id === cred.id);
    if (idx >= 0) db.credentials[idx] = cred; else db.credentials.push(cred);
    save(db);
  },;
};

