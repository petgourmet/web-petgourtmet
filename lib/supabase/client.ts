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
          
          // Buscar la cookie en document.cookie
          const cookies = document.cookie.split('; ')
          const cookie = cookies.find((row) => row.startsWith(`${name}=`))
          
          if (!cookie) {
            console.log(`🍪 Cookie "${name}" not found. Available:`, cookies.map(c => c.split('=')[0]))
            return undefined
          }
          
          const value = cookie.split('=')[1]
          const decoded = value ? decodeURIComponent(value) : undefined
          console.log(`🍪 Cookie "${name}" found:`, decoded ? 'YES' : 'NO')
          return decoded
        },
        set(name: string, value: string, options: any) {
          if (typeof document === 'undefined') return
          
          // Configurar cookie con valores seguros
          const cookieOptions = [
            `${name}=${encodeURIComponent(value)}`,
            'path=/',
            options?.maxAge ? `max-age=${options.maxAge}` : '',
            options?.expires ? `expires=${options.expires}` : '',
            `SameSite=${options?.sameSite || 'Lax'}`,
            // En producción siempre usar Secure
            location.protocol === 'https:' ? 'Secure' : ''
          ].filter(Boolean).join('; ')
          
          document.cookie = cookieOptions
          console.log(`🍪 Cookie "${name}" set:`, cookieOptions)
        },
        remove(name: string, options: any) {
          if (typeof document === 'undefined') return
          
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=${options?.sameSite || 'Lax'}`
          console.log(`🍪 Cookie "${name}" removed`)
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
