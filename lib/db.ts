/**
 * CATATAN UNTUK DEPLOYMENT VERCEL:
 * 
 * Vercel Serverless Functions bersifat ephemeral (sementara).
 * Anda TIDAK BISA menggunakan file SQLite lokal ('db.sqlite') untuk penyimpanan persisten.
 * File akan ter-reset setiap kali fungsi redeploy.
 * 
 * Solusi: Gunakan Managed SQLite seperti TURSO (https://turso.tech).
 * 
 * 1. Install driver: npm install @libsql/client
 * 2. Setup env vars di Vercel: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
 */

/*
// CONTOH IMPLEMENTASI KONEKSI (Uncomment jika sudah setup Turso)

import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = {
  getUsers: async () => {
    const rs = await client.execute("SELECT * FROM users");
    return rs.rows;
  },
  createUser: async (user: any) => {
    await client.execute({
      sql: "INSERT INTO users (id, name, email, role, password, token) VALUES (?, ?, ?, ?, ?, ?)",
      args: [user.id, user.name, user.email, user.role, user.password, user.token]
    });
  }
};
*/

// Mock export agar tidak error saat build
export const dbInfo = "Gunakan Turso/LibSQL untuk Vercel + SQLite";