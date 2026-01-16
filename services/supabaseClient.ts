/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// --- KONFIGURASI SUPABASE ---
// Saat deploy di Vercel, pastikan Anda menambahkan Environment Variables:
// VITE_SUPABASE_URL
// VITE_SUPABASE_ANON_KEY

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn("⚠️ VITE_SUPABASE_URL not found. Using placeholder values.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);