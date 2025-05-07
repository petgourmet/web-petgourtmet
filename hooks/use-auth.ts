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
        // Verificar si el usuario es administrador basado en su email
        // Esto evita la recursión al no consultar la tabla profiles
        const adminEmails = ["admin@petgourmet.com", "cristoferscalante@gmail.com"]
        setIsAdmin(adminEmails.includes(session.user.email || ""))
      } else {
        setIsAdmin(false)
      }
    })

    // Verificar la sesión actual al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)

      if (session?.user) {
        // Verificar si el usuario es administrador basado en su email
        const adminEmails = ["admin@petgourmet.com", "cristoferscalante@gmail.com"]
        setIsAdmin(adminEmails.includes(session.user.email || ""))
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
