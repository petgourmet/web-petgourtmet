"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export function useClientAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setUser(session?.user || null)

        if (session?.user) {
          // Obtener el rol del usuario desde la tabla profiles
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single()

          if (profileError) {
            console.error("Error al obtener el perfil:", profileError)
          } else {
            setUserRole(profileData?.role || "user")
          }
        }
      } catch (error) {
        console.error("Error al obtener la sesión:", error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)

      if (session?.user) {
        // Actualizar el rol cuando cambia la autenticación
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setUserRole(data.role)
            }
          })
      } else {
        setUserRole(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const isAdmin = userRole === "admin"
  const isClient = userRole === "user"

  return {
    user,
    loading,
    userRole,
    isAdmin,
    isClient,
    signOut,
  }
}
