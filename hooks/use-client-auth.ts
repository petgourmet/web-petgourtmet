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
    
    console.log('🔵 [useClientAuth] Iniciando hook...')
    
    // Crear instancia fresca del cliente de Supabase
    const supabase = createClient()

    // Función simple para obtener el rol - SIN CACHÉ
    const getUserRole = async (userId: string): Promise<string> => {
      console.log('🔵 [getUserRole] Obteniendo rol para:', userId)
      try {
        // Crear un timeout de 10 segundos (aumentado)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout obteniendo rol')), 10000)
        })
        
        // Consulta directa sin caché con timeout
        const queryPromise = supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle() // Usar maybeSingle en lugar de single para evitar errores si no existe
        
        const { data: profile, error } = await Promise.race([
          queryPromise,
          timeoutPromise
        ]) as any
          
        if (error) {
          console.log('⚠️ [getUserRole] Error:', error.message, error.code)
          // Si el perfil no existe (PGRST116 = no rows), retornar 'user' por defecto
          if (error.code === 'PGRST116') {
            console.log('⚠️ [getUserRole] Perfil no encontrado, retornando user por defecto')
            return 'user'
          }
          return 'user'
        }
        
        if (!profile) {
          console.log('⚠️ [getUserRole] Sin perfil encontrado, retornando user por defecto')
          return 'user'
        }
        
        const role = (profile as any).role || 'user'
        console.log('✅ [getUserRole] Rol obtenido:', role)
        return role
      } catch (error: any) {
        console.error('❌ [getUserRole] Error:', error.message)
        // En caso de timeout o error desconocido, denegar acceso privilegiado
        return 'user'
      }
    }
    
    // Función para manejar cambios de autenticación
    const handleAuthChange = async (event: string, session: any) => {
      console.log('🔵 [handleAuthChange] Evento:', event, 'Session:', !!session)
      if (!isMounted) return
      
      // Manejar cualquier evento con sesión válida
      if (session?.user) {
        console.log('✅ [handleAuthChange] Usuario detectado:', session.user.email)
        setUser(session.user)
        
        // Cargar el rol en segundo plano, no bloquear
        getUserRole(session.user.id).then(role => {
          if (isMounted) {
            console.log('✅ [handleAuthChange] Rol establecido:', role)
            setUserRole(role)
          }
        }).catch(err => {
          console.error('❌ [handleAuthChange] Error obteniendo rol:', err)
          if (isMounted) {
            // En caso de error, denegar acceso privilegiado
            setUserRole('user')
          }
        })
        
        // TERMINAR CARGA INMEDIATAMENTE, no esperar el rol
        setLoading(false)
        console.log('✅ [handleAuthChange] Loading establecido a FALSE')
      } else if (event === 'SIGNED_OUT') {
        console.log('🔴 [handleAuthChange] Usuario cerró sesión')
        setUser(null)
        setUserRole(null)
        setLoading(false)
      }
    }
    
    const loadInitialSession = async () => {
      console.log('🔵 [loadInitialSession] Cargando sesión inicial...')
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        console.log('🔵 [loadInitialSession] Session obtenida:', !!session, 'Error:', !!error)
        
        if (!isMounted) {
          console.log('⚠️ [loadInitialSession] Componente desmontado, abortando')
          setLoading(false)
          return
        }
        
        if (error || !session?.user) {
          console.log('⚠️ [loadInitialSession] Sin sesión o error, estableciendo loading a false')
          if (isMounted) {
            setUser(null)
            setUserRole(null)
            setLoading(false)
          }
          return
        }
        
        console.log('✅ [loadInitialSession] Usuario encontrado:', session.user.email)
        if (isMounted) {
          setUser(session.user)
        }
        
        // Cargar rol en segundo plano, no bloquear
        getUserRole(session.user.id).then(role => {
          if (isMounted) {
            console.log('✅ [loadInitialSession] Rol establecido:', role)
            setUserRole(role)
          }
        }).catch(err => {
          console.error('❌ [loadInitialSession] Error obteniendo rol:', err)
          if (isMounted) {
            // En caso de error, denegar acceso privilegiado
            setUserRole('user')
          }
        })
        
        // TERMINAR CARGA INMEDIATAMENTE
        if (isMounted) {
          setLoading(false)
          console.log('✅ [loadInitialSession] Todo listo, loading = FALSE')
        }
      } catch (error) {
        console.error('❌ [loadInitialSession] Error:', error)
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
