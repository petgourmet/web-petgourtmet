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
    
    const loadUser = async () => {
      try {
        console.log('🔧 [useClientAuth] Creando cliente Supabase...')
        const supabase = createClient()
        
        // Timeout de seguridad para evitar carga infinita
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn('⏰ [useClientAuth] Timeout: Forzando fin de carga después de 10 segundos')
            setLoading(false)
          }
        }, 10000)
        
        console.log('📡 [useClientAuth] Obteniendo sesión...')
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
        
        console.log('📋 [useClientAuth] Sesión obtenida:', session ? 'Sesión activa' : 'Sin sesión')
        
        if (session?.user) {
          console.log('👤 [useClientAuth] Usuario encontrado:', session.user.email)
          setUser(session.user)
          
          console.log('🔍 [useClientAuth] Obteniendo rol del usuario...')
          // Obtener rol del usuario
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
            
          if (!isMounted) {
            console.log('🚫 [useClientAuth] Componente desmontado durante obtención de perfil...')
            return
          }
            
          if (profileError) {
            console.warn('⚠️ [useClientAuth] Error obteniendo perfil, usando rol por defecto:', profileError.message)
            setUserRole('user')
          } else {
            console.log('✅ [useClientAuth] Perfil obtenido, rol:', profile?.role || 'user')
            setUserRole(profile?.role || 'user')
          }
        } else {
          console.log('🚪 [useClientAuth] No hay sesión activa')
          // No hay sesión activa
          setUser(null)
          setUserRole(null)
        }
      } catch (error) {
        console.error('💥 [useClientAuth] Error en loadUser:', error)
        if (isMounted) {
          setUser(null)
          setUserRole(null)
        }
      } finally {
        if (isMounted) {
          console.log('🏁 [useClientAuth] Finalizando carga, estableciendo loading = false')
          clearTimeout(timeoutId)
          setLoading(false)
        } else {
          console.log('🚫 [useClientAuth] Componente desmontado, no actualizando estado')
        }
      }
    }
    
    loadUser()
    
    return () => {
      isMounted = false
      clearTimeout(timeoutId)
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
