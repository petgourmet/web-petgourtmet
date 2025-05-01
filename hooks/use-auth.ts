"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)

      if (session?.user) {
        // Verificar si el usuario es administrador
        try {
          const { data, error } = await supabase.from("profiles").select("role").eq("id", session.user.id).single()

          if (!error && data) {
            setIsAdmin(data.role === "admin")
          } else {
            console.error("Error al verificar rol:", error)
            setIsAdmin(false)
          }
        } catch (err) {
          console.error("Error en verificación de rol:", err)
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(false)
      }
    })

    // Verificar la sesión actual al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)

      if (session?.user) {
        // Verificar si el usuario es administrador
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setIsAdmin(data.role === "admin")
            } else {
              console.error("Error al verificar rol inicial:", error)
              setIsAdmin(false)
            }
          })
          .catch((err) => {
            console.error("Error en verificación inicial de rol:", err)
            setIsAdmin(false)
          })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (err: any) {
      console.error("Error en signIn:", err)
      return { error: err }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      router.push("/admin/login")
      return { error }
    } catch (err: any) {
      console.error("Error en signOut:", err)
      return { error: err }
    }
  }

  return {
    user,
    loading,
    isAdmin,
    signIn,
    signOut,
  }
}
