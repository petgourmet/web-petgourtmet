"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useClientAuth } from "@/hooks/use-client-auth"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { user, loading, isAdmin } = useClientAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Guardar la URL actual para redirigir después del login
        sessionStorage.setItem("redirectAfterLogin", pathname)
        router.push("/auth/login")
      } else if (requireAdmin && !isAdmin) {
        // Si se requiere ser admin y el usuario no lo es
        router.push("/unauthorized")
      }
      setIsChecking(false)
    }
  }, [loading, user, isAdmin, requireAdmin, router, pathname])

  if (loading || isChecking) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Solo mostrar el contenido si el usuario está autenticado y tiene los permisos necesarios
  if (!user || (requireAdmin && !isAdmin)) {
    return null
  }

  return <>{children}</>
}
