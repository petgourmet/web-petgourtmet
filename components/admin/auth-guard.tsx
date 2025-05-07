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
          router.push("/admin/login")
          return
        }

        // Si se requiere rol de admin, verificar
        if (requireAdmin) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single()

          if (profileError || !profile || profile.role !== "admin") {
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
        router.push("/admin/login")
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
