import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { createClient as supabaseCreateClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Verificar si las variables de entorno están disponibles
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Crear un cliente simulado para cuando las credenciales no estén disponibles
const createMockClient = () => {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }
}

// Crear el cliente real o el simulado según la disponibilidad de credenciales
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClientComponentClient<Database>({
        supabaseUrl,
        supabaseKey: supabaseAnonKey,
        options: {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
          },
          global: {
            headers: {
              "x-application-name": "pet-gourmet-admin",
            },
          },
        },
      })
    : (createMockClient() as any)

// Verificar si la clave de servicio está disponible antes de crear el cliente de administrador
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
export const supabaseAdmin =
  serviceRoleKey && supabaseUrl ? supabaseCreateClient<Database>(supabaseUrl, serviceRoleKey) : null

// Exportar la función createClient para compatibilidad con código existente
export const createClient = supabaseCreateClient
