import { createClient } from '@supabase/supabase-js';
// import type { Database } from './database.types'; // Commented out as it's not actively used and file might not exist

// Asegúrate de que las variables de entorno estén definidas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Supabase URL not found. Make sure NEXT_PUBLIC_SUPABASE_URL is set in your .env.local file or environment variables.");
}

if (!supabaseAnonKey) {
  throw new Error("Supabase anon key not found. Make sure NEXT_PUBLIC_SUPABASE_ANON_KEY is set in your .env.local file or environment variables.");
}

// Podrías usar el tipo Database aquí si lo generas con 'supabase gen types typescript > src/lib/database.types.ts'
// export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
// Por ahora, lo creamos sin el tipo genérico Database hasta que ese archivo exista
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
