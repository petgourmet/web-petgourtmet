"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { enhancedCacheService } from "@/lib/cache-service-enhanced"
import type { User } from "@supabase/supabase-js"

export function useClientAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true
    let authSubscription: any = null
    let storageListener: any = null
    
    // Crear instancia fresca del cliente de Supabase
    const supabase = createClient()

    // Función simple para obtener el rol - sin timeouts ni reintentos
    const getUserRole = async (userId: string): Promise<string> => {
      // Intentar obtener desde caché primero
      const cachedRole = enhancedCacheService.getUserRole(userId)
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
        enhancedCacheService.setUserRole(userId, role)
        
        return role
      } catch (error) {
        // Cualquier error, retornar rol por defecto
        return 'user'
      }
    }
    
    // Función para manejar cambios de autenticación
    const handleAuthChange = async (event: string, session: any) => {
      if (!isMounted) return
      
      console.log('🔐 Auth event:', event, 'User:', session?.user?.email, 'Session exists:', !!session)
      
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
      } else if (event === 'INITIAL_SESSION' && session?.user) {
        // Manejar sesión inicial
        setUser(session.user)
        const role = await getUserRole(session.user.id)
        if (isMounted) {
          setUserRole(role)
          setLoading(false)
        }
      }
    }
    
    // Listener de storage para detectar cambios de sesión en otras pestañas o después de login
    const handleStorageChange = async (e: StorageEvent) => {
      if (!isMounted) return
      
      // Detectar cambios en las keys de Supabase Auth
      if (e.key && e.key.includes('supabase.auth.token')) {
        console.log('🔄 Storage change detected, reloading session...')
        setLoading(true)
        await loadInitialSession()
      }
    }
    
    const loadInitialSession = async () => {
      try {
        console.log('🔍 Loading initial session...')
        
        // Obtener sesión desde Supabase de manera directa
        const { data: { session }, error } = await supabase.auth.getSession()
        
        console.log('📊 Session response:', { 
          hasSession: !!session, 
          hasUser: !!session?.user, 
          email: session?.user?.email,
          error: error?.message 
        })
        
        if (!isMounted) return
        
        if (error) {
          console.error('❌ Error loading session:', error)
          setUser(null)
          setUserRole(null)
          setLoading(false)
          return
        }
        
        if (session?.user) {
          console.log('✅ Session loaded:', session.user.email)
          setUser(session.user)
          
          // Guardar sesión en caché
          enhancedCacheService.setUserSession(session.user.id, session)
          enhancedCacheService.setUserSession('current', session)
          
          // Obtener rol del usuario
          const role = await getUserRole(session.user.id)
          if (isMounted) {
            setUserRole(role)
          }
        } else {
          console.log('ℹ️ No active session found')
          setUser(null)
          setUserRole(null)
          enhancedCacheService.setUserSession('current', null)
        }
      } catch (error) {
        console.error('❌ Error in loadInitialSession:', error)
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
    
    // Configurar listener de storage
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange)
      storageListener = handleStorageChange
    }
    
    // Cargar sesión inicial
    loadInitialSession()
    
    return () => {
      isMounted = false
      if (authSubscription) {
        authSubscription.unsubscribe()
        authSubscription = null
      }
      if (storageListener && typeof window !== 'undefined') {
        window.removeEventListener('storage', storageListener)
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
      enhancedCacheService.clear()
      
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
