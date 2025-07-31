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
  
  console.log('🚀 Hook useClientAuth inicializado')

  useEffect(() => {
    let isMounted = true
    console.log('🔄 useEffect ejecutándose...')
    
    const loadUser = async () => {
      console.log('🔐 Iniciando carga de usuario...')
      
      try {
        const supabase = createClient()
        const { data: { session }, error } = await supabase.auth.getSession()
        
        console.log('📋 Sesión obtenida:', { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          error: error?.message 
        })
        
        if (!isMounted) return
        
        if (session?.user) {
          setUser(session.user)
          
          // Obtener rol del usuario
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
            
          if (!isMounted) return
            
          if (profileError) {
            console.error('❌ Error obteniendo perfil:', profileError.message)
            setUserRole('user')
          } else {
            console.log('✅ Perfil obtenido:', profile)
            setUserRole(profile?.role || 'user')
          }
        } else {
          console.log('❌ No hay sesión activa')
          setUser(null)
          setUserRole(null)
        }
      } catch (error) {
        console.error('💥 Error en loadUser:', error)
        if (isMounted) {
          setUser(null)
          setUserRole(null)
        }
      } finally {
        if (isMounted) {
          console.log('🏁 Finalizando carga - setting loading to false')
          setLoading(false)
        }
      }
    }
    
    loadUser()
    
    return () => {
      isMounted = false
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
