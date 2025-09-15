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
    let timeoutId: NodeJS.Timeout
    
    console.log('🔄 [useClientAuth] Iniciando carga de usuario...')
    
    const supabase = createClient()
    
    // Función para obtener el rol del usuario
    const getUserRole = async (userId: string) => {
      try {
        console.log('🔍 [useClientAuth] Obteniendo rol del usuario...')
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single()
          
        if (profileError) {
          console.warn('⚠️ [useClientAuth] Error obteniendo perfil, usando rol por defecto:', profileError.message)
          return 'user'
        } else {
          console.log('✅ [useClientAuth] Perfil obtenido, rol:', profile?.role || 'user')
          return profile?.role || 'user'
        }
      } catch (error) {
        console.error('💥 [useClientAuth] Error obteniendo rol:', error)
        return 'user'
      }
    }
    
    // Función para manejar cambios de autenticación
    const handleAuthChange = async (event: string, session: any) => {
      if (!isMounted) return
      
      console.log('🔄 [useClientAuth] Cambio de autenticación:', event)
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('👤 [useClientAuth] Usuario autenticado:', session.user.email)
        setUser(session.user)
        
        // Obtener rol del usuario
        const role = await getUserRole(session.user.id)
        if (isMounted) {
          setUserRole(role)
          setLoading(false)
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 [useClientAuth] Usuario desautenticado')
        setUser(null)
        setUserRole(null)
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('🔄 [useClientAuth] Token refrescado')
        setUser(session.user)
        // Mantener el rol actual si existe
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
        console.log('🔧 [useClientAuth] Creando cliente Supabase...')
        
        // Timeout de seguridad para evitar carga infinita
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn('⏰ [useClientAuth] Timeout: Forzando fin de carga después de 10 segundos')
            setLoading(false)
          }
        }, 10000)
        
        console.log('📡 [useClientAuth] Obteniendo sesión inicial...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!isMounted) {
          console.log('🚫 [useClientAuth] Componente desmontado, cancelando...')
          return
        }
        
        if (error) {
          console.error('❌ [useClientAuth] Error obteniendo sesión:', error.message)
          setUser(null)
          setUserRole(null)
          setLoading(false)
          return
        }
        
        console.log('📋 [useClientAuth] Sesión inicial obtenida:', session ? 'Sesión activa' : 'Sin sesión')
        
        if (session?.user) {
          console.log('👤 [useClientAuth] Usuario encontrado:', session.user.email)
          setUser(session.user)
          
          // Obtener rol del usuario
          const role = await getUserRole(session.user.id)
          if (isMounted) {
            setUserRole(role)
          }
        } else {
          console.log('🚪 [useClientAuth] No hay sesión activa')
          setUser(null)
          setUserRole(null)
        }
      } catch (error) {
        console.error('💥 [useClientAuth] Error en loadInitialSession:', error)
        if (isMounted) {
          setUser(null)
          setUserRole(null)
        }
      } finally {
        if (isMounted) {
          console.log('🏁 [useClientAuth] Finalizando carga inicial, estableciendo loading = false')
          clearTimeout(timeoutId)
          setLoading(false)
        }
      }
    }
    
    // Configurar listener de cambios de autenticación
    console.log('👂 [useClientAuth] Configurando listener de cambios de autenticación...')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange)
    
    // Cargar sesión inicial
    loadInitialSession()
    
    return () => {
      console.log('🧹 [useClientAuth] Limpiando listeners y timeouts...')
      isMounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setUserRole(null)
    router.push('/')
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
