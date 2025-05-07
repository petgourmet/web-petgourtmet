import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Cliente con la clave de servicio para operaciones administrativas
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
)

// Función para obtener un cliente con la clave de servicio
export function getAdminClient() {
  return supabaseAdmin
}
