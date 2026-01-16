import { createClient } from '@supabase/supabase-js';

// --- KONFIGURASI SUPABASE ---
// Ganti nilai di bawah ini dengan Project URL dan Anon Key dari dashboard Supabase Anda.
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

if (SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
  console.error("⚠️ SUPABASE BELUM DIKONFIGURASI! Silakan edit file services/supabaseClient.ts");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
