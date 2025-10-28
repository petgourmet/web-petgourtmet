import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./database.types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

// Crear cliente de Supabase usando el nuevo método recomendado para navegador
export const createClient = () => {
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          if (typeof document === 'undefined') return undefined
          const value = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${name}=`))
            ?.split('=')[1]
          return value ? decodeURIComponent(value) : undefined
        },
        set(name: string, value: string, options: any) {
          if (typeof document === 'undefined') return
          const expires = options?.maxAge
            ? new Date(Date.now() + options.maxAge * 1000).toUTCString()
            : options?.expires
          document.cookie = `${name}=${encodeURIComponent(value)}; path=/; ${
            expires ? `expires=${expires};` : ''
          } ${options?.sameSite ? `SameSite=${options.sameSite};` : 'SameSite=Lax;'} ${
            options?.secure ? 'Secure;' : ''
          }`
        },
        remove(name: string, options: any) {
          if (typeof document === 'undefined') return
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; ${
            options?.sameSite ? `SameSite=${options.sameSite};` : 'SameSite=Lax;'
          }`
        },
      },
    }
  )
}

// Cliente singleton para compatibilidad con código existente
export const supabase = createClient()

// Cliente admin (solo para uso en servidor)
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = supabaseServiceKey
  ? createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

export default supabase
