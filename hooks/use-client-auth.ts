"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export function useClientAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true
    let authSubscription: any = null
    
    // Crear instancia fresca del cliente de Supabase
    const supabase = createClient()

    // Función simple para obtener el rol - SIN CACHÉ
    const getUserRole = async (userId: string): Promise<string> => {
      try {
        // Consulta directa sin caché
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single()
          
        if (error || !profile) {
          return 'user'
        }
        
        return (profile as any).role || 'user'
      } catch (error) {
        return 'user'
      }
    }
    
    // Función para manejar cambios de autenticación
    const handleAuthChange = async (event: string, session: any) => {
      if (!isMounted) return
      
      // Manejar cualquier evento con sesión válida
      if (session?.user) {
        setUser(session.user)
        
        // Cargar el rol
        const role = await getUserRole(session.user.id)
        if (isMounted) {
          setUserRole(role)
          setLoading(false) // SIEMPRE terminar la carga después de obtener el rol
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserRole(null)
        setLoading(false)
      }
    }
    
    const loadInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!isMounted) {
          setLoading(false)
          return
        }
        
        if (error || !session?.user) {
          if (isMounted) {
            setUser(null)
            setUserRole(null)
            setLoading(false)
          }
          return
        }
        
        if (isMounted) {
          setUser(session.user)
        }
        
        // Obtener rol del usuario
        const role = await getUserRole(session.user.id)
        
        if (isMounted) {
          setUserRole(role)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error cargando sesión:', error)
        if (isMounted) {
          setUser(null)
          setUserRole(null)
          setLoading(false)
        }
      }
    }
    
    // Configurar listener de cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange)
    authSubscription = subscription
    
    // Cargar sesión inicial
    loadInitialSession()
    
    return () => {
      isMounted = false
      if (authSubscription) {
        authSubscription.unsubscribe()
        authSubscription = null
      }
    }
  }, [])

  const signOut = async () => {
    try {
      // Limpiar estado local primero
      setUser(null)
      setUserRole(null)
      setLoading(false)
      
      // Cerrar sesión en Supabase
      const supabase = createClient()
      await supabase.auth.signOut()
      
      // Forzar recarga completa de la página para limpiar TODO
      window.location.href = '/'
    } catch (error) {
      // Siempre redirigir aunque haya error
      window.location.href = '/'
    }
  }

  const isAdmin = userRole === 'admin'
  const isClient = userRole === 'user'

  return {
    user,
    loading,
    userRole,
    isAdmin,
    isClient,
    signOut,
  }
}
