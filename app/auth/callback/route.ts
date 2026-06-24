import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")
  
  // Manejar errores de autenticación
  if (error) {
    console.error('Error de autenticación OAuth:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    )
  }

  if (code) {
    try {
      // await requerido — createClient es async en Next.js 15
      const supabase = await createClient()
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Error al intercambiar código por sesión:', exchangeError)
        return NextResponse.redirect(
          new URL(`/auth/login?error=${encodeURIComponent('Error de verificación. Por favor, intenta nuevamente.')}`, requestUrl.origin)
        )
      }
      
      if (data.user) {
        // Para usuarios OAuth (Google, etc.) aseguramos que exista su perfil en la tabla.
        // El trigger de DB lo crea, pero si falla o ya existe hacemos upsert de respaldo.
        try {
          const supabaseAdmin = createServiceClient()
          await supabaseAdmin
            .from('profiles')
            .upsert(
              {
                id: data.user.id,
                email: data.user.email!,
                role: 'user',
                created_at: new Date().toISOString(),
              } as any,
              { onConflict: 'id', ignoreDuplicates: true }
            )
        } catch (profileErr) {
          // No bloquear el flujo si falla la creación del perfil
          console.warn('[auth/callback] Error al sincronizar perfil OAuth:', profileErr)
        }

        // Redirigir al perfil con mensaje de éxito
        return NextResponse.redirect(
          new URL('/perfil?verified=true', requestUrl.origin)
        )
      }
    } catch (err) {
      console.error('Error inesperado durante la autenticación:', err)
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent('Error inesperado. Por favor, intenta nuevamente.')}`, requestUrl.origin)
      )
    }
  }

  // Si no hay código ni error, redirigir al login
  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
}
