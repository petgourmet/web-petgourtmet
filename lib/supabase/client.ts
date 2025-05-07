import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { createClient as supabaseCreateClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// --- INICIO DE CÓDIGO DE DEPURACIÓN ---
console.log("Supabase URL desde env:", supabaseUrl);
console.log("Supabase Anon Key desde env:", supabaseAnonKey); // THIS IS THE IMPORTANT LINE
// --- FIN DE CÓDIGO DE DEPURACIÓN ---

if (!supabaseUrl) {
  throw new Error(
    "Error Crítico: La URL de Supabase (NEXT_PUBLIC_SUPABASE_URL) no está definida. Revisa tus variables de entorno y reinicia el servidor."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "Error Crítico: La Llave Anónima de Supabase (NEXT_PUBLIC_SUPABASE_ANON_KEY) no está definida. Revisa tus variables de entorno y reinicia el servidor."
  );
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Verificar si la clave de servicio está disponible antes de crear el cliente de administrador
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
export const supabaseAdmin =
  serviceRoleKey && supabaseUrl ? supabaseCreateClient<Database>(supabaseUrl, serviceRoleKey) : null

// Exportar la función createClient para compatibilidad con código existente
export const createClient = supabaseCreateClient
