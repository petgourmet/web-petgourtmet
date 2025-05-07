import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { createClient as supabaseCreateClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Supabase URL is not defined. Please check your NEXT_PUBLIC_SUPABASE_URL environment variable."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "Supabase Anon Key is not defined. Please check your NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable."
  );
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Verificar si la clave de servicio está disponible antes de crear el cliente de administrador
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
export const supabaseAdmin =
  serviceRoleKey && supabaseUrl ? supabaseCreateClient<Database>(supabaseUrl, serviceRoleKey) : null

// Exportar la función createClient para compatibilidad con código existente
export const createClient = supabaseCreateClient
