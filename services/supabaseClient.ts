/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// --- KONFIGURASI SUPABASE ---
// Saat deploy di Vercel, pastikan Anda menambahkan Environment Variables:
// VITE_SUPABASE_URL
// VITE_SUPABASE_ANON_KEY

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://bonbrcdouqazowgcasgu.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbmJyY2RvdXFhem93Z2Nhc2d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzM2NzgsImV4cCI6MjA4NDE0OTY3OH0.bM5lEGmi60tUov0yRpB59kdujEWAY_91FcTwiBOLOj8';

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn("⚠️ VITE_SUPABASE_URL not found. Using placeholder values.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);