import { UserRole } from '../types';
import { USERS, INITIAL_MEETINGS } from './mock';

/**
 * SQLITE CLIENT-SIDE SERVICE
 * Uses sql.js to run a real SQLite database in the browser memory.
 * Persists data by saving the binary database file to LocalStorage.
 */

let db: any = null;
const DB_STORAGE_KEY = 'zoomclone_sqlite_db_bin';

// Helper to convert SQL Result Set to Array of Objects
const resultToObjects = (res: any) => {
  if (!res || res.length === 0) return [];
  const columns = res[0].columns;
  const values = res[0].values;
  return values.map((row: any[]) => {
    return row.reduce((obj, val, i) => {
      obj[columns[i]] = val;
      return obj;
    }, {});
  });
};

// Save DB to LocalStorage (Persistence)
const saveDatabase = () => {
  if (!db) return;
  const data = db.export();
  // Convert Uint8Array to Binary String for LocalStorage
  let binary = '';
  const len = data.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(data[i]);
  }
  localStorage.setItem(DB_STORAGE_KEY, btoa(binary));
};

export const initSqlite = async () => {
  if (db) return db;

  // @ts-ignore - sql.js is loaded via CDN in index.html
  if (!window.initSqlJs) {
    throw new Error("SQL.js not loaded. Check index.html");
  }

  // @ts-ignore
  const SQL = await window.initSqlJs({
    // Point to the WASM file on CDN
    locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
  });

  // Check if we have a saved DB
  const savedDb = localStorage.getItem(DB_STORAGE_KEY);
  
  if (savedDb) {
    console.log("Database: Loading existing SQLite DB...");
    const binary = atob(savedDb);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    db = new SQL.Database(bytes);
  } else {
    console.log("Database: Creating NEW SQLite DB...");
    db = new SQL.Database();
    runMigrations();
    seedData();
  }

  return db;
};

const runMigrations = () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      role TEXT,
      avatar TEXT,
      status TEXT,
      password TEXT,
      token TEXT
    );

    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      title TEXT,
      date TEXT,
      time TEXT,
      host TEXT,
      participantsCount INTEGER,
      status TEXT
    );
  `;
  db.run(schema);
  saveDatabase();
};

const seedData = () => {
  // Seed Users
  const userStmt = db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  USERS.forEach(u => {
    // Generate token for seeded users if missing
    const token = u.token || Math.random().toString(36).substring(7);
    userStmt.run([u.id, u.name, u.email, u.role, u.avatar, u.status, u.password, token]);
  });
  userStmt.free();

  // Seed Meetings
  const meetingStmt = db.prepare("INSERT INTO meetings VALUES (?, ?, ?, ?, ?, ?, ?)");
  INITIAL_MEETINGS.forEach(m => {
    meetingStmt.run([m.id, m.title, m.date, m.time, m.host, m.participantsCount, m.status]);
  });
  meetingStmt.free();
  
  saveDatabase();
  console.log("Database: Seeded successfully.");
};

// --- EXPORTED QUERY METHODS ---

export const dbQuery = {
  select: (sql: string, params: any[] = []) => {
    if (!db) throw new Error("DB not initialized");
    const res = db.exec(sql, params);
    return resultToObjects(res);
  },
  
  run: (sql: string, params: any[] = []) => {
    if (!db) throw new Error("DB not initialized");
    db.run(sql, params);
    saveDatabase(); // Auto-save on modification
  },
  
  // Helper for single row
  get: (sql: string, params: any[] = []) => {
    const res = dbQuery.select(sql, params);
    return res.length > 0 ? res[0] : null;
  }
};