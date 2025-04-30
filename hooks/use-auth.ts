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
        const { data, error } = await supabase.from("profiles").select("role").eq("id", session.user.id).single()

        if (!error && data) {
          setIsAdmin(data.role === "admin")
        } else {
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
              setIsAdmin(false)
            }
          })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    router.push("/admin/login")
    return { error }
  }

  return {
    user,
    loading,
    isAdmin,
    signIn,
    signOut,
  }
}
