import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

// Cliente principal de Supabase para operaciones normales, incluyendo autenticación
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Solo creamos el cliente admin si realmente lo necesitamos para operaciones específicas
// y si la clave está disponible
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
export const supabaseAdmin = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null
