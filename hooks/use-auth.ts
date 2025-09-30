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
    let authSubscription: any = null // Variable para almacenar la suscripción
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)

      if (session?.user) {
        // Verificar si el usuario es administrador consultando la base de datos
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        
        if (profileError) {
          console.error('Error verificando rol de usuario:', profileError)
          setIsAdmin(false)
        } else {
          setIsAdmin(profile?.role === 'admin')
        }
      } else {
        setIsAdmin(false)
      }
    })
    
    authSubscription = subscription

    // Verificar la sesión actual al cargar
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)

      if (session?.user) {
        // Verificar si el usuario es administrador consultando la base de datos
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        
        if (profileError) {
          console.error('Error verificando rol de usuario:', profileError)
          setIsAdmin(false)
        } else {
          setIsAdmin(profile?.role === 'admin')
        }
      }
    })

    return () => {
      // Asegurar que se desuscriba correctamente
      if (authSubscription) {
        authSubscription.unsubscribe()
        authSubscription = null
      }
    }
  }, []) // Remover router de dependencias para evitar re-renders innecesarios

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
      router.push("/auth/login")
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
