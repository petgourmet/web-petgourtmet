"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verificar si el usuario está autenticado
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error || !session) {
          console.log("No hay sesión activa, redirigiendo a login")
          setIsAuthenticated(false)
          router.push("/auth/login")
          return
        }

        // Si se requiere rol de admin, verificar
        if (requireAdmin) {
          // Primero intentar buscar por ID (método principal)
          let { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, role, email")
            .eq("id", session.user.id)
            .single()

          // Si no encuentra por ID, buscar por email como fallback
          if (profileError || !profile) {
            console.log("Perfil no encontrado por ID, buscando por email...")
            const { data: profileByEmail, error: emailError } = await supabase
              .from("profiles")
              .select("id, role, email")
              .eq("email", session.user.email)
              .order("created_at", { ascending: true }) // Usar el más antiguo (original)
              .limit(1)
              .single()

            if (!emailError && profileByEmail) {
              profile = profileByEmail
              console.log("Perfil encontrado por email:", profile.email)
              
              // Sincronizar el ID del perfil con el ID de auth si es diferente
              if (profile.id !== session.user.id) {
                console.log("Sincronizando ID de perfil con auth.users...")
                // Actualizar el perfil existente con el ID correcto de auth
                await supabase
                  .from("profiles")
                  .update({ id: session.user.id, updated_at: new Date().toISOString() })
                  .eq("id", profile.id)
              }
            }
          }

          if (!profile || profile.role !== "admin") {
            console.log("Usuario no es admin, redirigiendo a unauthorized")
            setIsAdmin(false)
            router.push("/admin/unauthorized")
            return
          }

          setIsAdmin(true)
        }

        setIsAuthenticated(true)
      } catch (error) {
        console.error("Error al verificar autenticación:", error)
        setIsAuthenticated(false)
        router.push("/auth/login")
      }
    }

    checkAuth()
  }, [router, requireAdmin])

  // Mostrar loader mientras se verifica la autenticación
  if (isAuthenticated === null || (requireAdmin && isAdmin === null)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Si no está autenticado o no es admin (cuando se requiere), no mostrar nada
  if (!isAuthenticated || (requireAdmin && !isAdmin)) {
    return null
  }

  // Si está autenticado y tiene los permisos necesarios, mostrar el contenido
  return <>{children}</>
}
