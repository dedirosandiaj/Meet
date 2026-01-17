
import { createClient } from '@supabase/supabase-js';

// --- KONFIGURASI SUPABASE ---
// Saat deploy di Vercel, pastikan Anda menambahkan Environment Variables:
// VITE_SUPABASE_URL
// VITE_SUPABASE_ANON_KEY

// Use casting to avoid TypeScript errors if Vite types are not loaded
const env = (import.meta as any).env;

const DEFAULT_URL = 'https://bonbrcdouqazowgcasgu.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbmJyY2RvdXFhem93Z2Nhc2d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzM2NzgsImV4cCI6MjA4NDE0OTY3OH0.bM5lEGmi60tUov0yRpB59kdujEWAY_91FcTwiBOLOj8';

const SUPABASE_URL = env?.VITE_SUPABASE_URL || DEFAULT_URL;
const SUPABASE_ANON_KEY = env?.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
