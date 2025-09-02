import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")
  
  // Manejar errores de autenticación
  if (error) {
    console.error('Error de autenticación:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    )
  }

  if (code) {
    try {
      const supabase = createClient()
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Error al intercambiar código por sesión:', exchangeError)
        return NextResponse.redirect(
          new URL(`/auth/login?error=${encodeURIComponent('Error de verificación. Por favor, intenta nuevamente.')}`, requestUrl.origin)
        )
      }
      
      if (data.user) {
        // Verificación exitosa - redirigir al perfil con mensaje de éxito
        return NextResponse.redirect(
          new URL('/perfil?verified=true', requestUrl.origin)
        )
      }
    } catch (error) {
      console.error('Error inesperado durante la autenticación:', error)
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent('Error inesperado. Por favor, intenta nuevamente.')}`, requestUrl.origin)
      )
    }
  }

  // Si no hay código ni error, redirigir al login
  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
}
