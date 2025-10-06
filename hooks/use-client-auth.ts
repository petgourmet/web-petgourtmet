"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cacheService } from "@/utils/cache-service"
import type { User } from "@supabase/supabase-js"

export function useClientAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true
    let authSubscription: any = null
    
    const supabase = createClient()

    // Función simple para obtener el rol - sin timeouts ni reintentos
    const getUserRole = async (userId: string): Promise<string> => {
      // Intentar obtener desde caché primero
      const cachedRole = cacheService.getUserRole(userId)
      if (cachedRole) {
        return cachedRole
      }

      try {
        // Consulta directa sin timeouts artificiales
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single()
          
        if (error || !profile) {
          // Si hay error, usar 'user' por defecto sin hacer ruido
          return 'user'
        }
        
        const role = (profile as any).role || 'user'
        
        // Guardar en caché para próximas consultas
        cacheService.setUserRole(userId, role)
        
        return role
      } catch (error) {
        // Cualquier error, retornar rol por defecto
        return 'user'
      }
    }
    
    // Función para manejar cambios de autenticación
    const handleAuthChange = async (event: string, session: any) => {
      if (!isMounted) return
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        const role = await getUserRole(session.user.id)
        if (isMounted) {
          setUserRole(role)
          setLoading(false)
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserRole(null)
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user)
        if (!userRole) {
          const role = await getUserRole(session.user.id)
          if (isMounted) {
            setUserRole(role)
          }
        }
      }
    }
    
    const loadInitialSession = async () => {
      try {
        // Intentar obtener sesión desde caché primero
        const cachedSession = cacheService.getUserSession('current')
        if (cachedSession) {
          setUser(cachedSession.user)
          const role = await getUserRole(cachedSession.user.id)
          if (isMounted) {
            setUserRole(role)
            setLoading(false)
          }
          return
        }
        
        // Obtener sesión desde Supabase de manera directa
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (error) {
          setUser(null)
          setUserRole(null)
          setLoading(false)
          return
        }
        
        if (session?.user) {
          setUser(session.user)
          
          // Guardar sesión en caché
          cacheService.setUserSession(session.user.id, session)
          cacheService.setUserSession('current', session)
          
          // Obtener rol del usuario
          const role = await getUserRole(session.user.id)
          if (isMounted) {
            setUserRole(role)
          }
        } else {
          setUser(null)
          setUserRole(null)
          cacheService.setUserSession('current', null)
        }
      } catch (error) {
        if (isMounted) {
          setUser(null)
          setUserRole(null)
        }
      } finally {
        if (isMounted) {
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
      
      // Limpiar cachés
      cacheService.clear()
      
      // Cerrar sesión en Supabase
      const supabase = createClient()
      await supabase.auth.signOut()
      
      router.push('/')
    } catch (error) {
      // Siempre redirigir aunque haya error
      router.push('/')
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
