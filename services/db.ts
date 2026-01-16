// THIS FILE IS DEPRECATED IN FAVOR OF services/storage.ts USING SUPABASE
// PLEASE USE SUPABASE SQL EDITOR TO SETUP TABLES.

export const dbQuery = {
  select: () => [],
  run: () => {},
  get: () => null
};

export const initSqlite = async () => {
    console.warn("Using Supabase. Local SQLite is disabled.");
    return null;
};
