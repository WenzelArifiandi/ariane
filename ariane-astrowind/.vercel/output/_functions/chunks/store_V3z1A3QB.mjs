import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = join(process.cwd(), ".data");
const DB_FILE = join(DATA_DIR, "webauthn.json");
function load() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR);
    if (!existsSync(DB_FILE)) {
      const empty = { credentials: [] };
      writeFileSync(DB_FILE, JSON.stringify(empty, null, 2));
      return empty;
    }
    const raw = readFileSync(DB_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { credentials: [] };
  }
}
function save(db) {
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
const store = {
  getByUser(userId) {
    const db = load();
    return db.credentials.filter((c) => c.userId === userId);
  },
  getById(credId) {
    const db = load();
    return db.credentials.find((c) => c.id === credId);
  },
  upsert(cred) {
    const db = load();
    const idx = db.credentials.findIndex((c) => c.id === cred.id);
    if (idx >= 0) db.credentials[idx] = cred;
    else db.credentials.push(cred);
    save(db);
  }
};

export { store as s };
