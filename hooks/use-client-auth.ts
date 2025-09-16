"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

// Constantes para optimización
const TIMEOUT_MS = 5000 // Reducido de 10 segundos a 5
const ROLE_CACHE_KEY = 'user_role_cache'
const CACHE_EXPIRY_MS = 5 * 60 * 1000 // 5 minutos
const MAX_RETRIES = 2

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
    
    // Función para obtener rol desde caché
    const getCachedRole = (userId: string): string | null => {
      try {
        const cached = localStorage.getItem(`${ROLE_CACHE_KEY}_${userId}`)
        if (cached) {
          const { role, timestamp } = JSON.parse(cached)
          if (Date.now() - timestamp < CACHE_EXPIRY_MS) {
            console.log('📦 [useClientAuth] Rol obtenido desde caché:', role)
            return role
          }
        }
      } catch (error) {
        console.warn('⚠️ [useClientAuth] Error leyendo caché:', error)
      }
      return null
    }

    // Función para guardar rol en caché
    const setCachedRole = (userId: string, role: string) => {
      try {
        const cacheData = { role, timestamp: Date.now() }
        localStorage.setItem(`${ROLE_CACHE_KEY}_${userId}`, JSON.stringify(cacheData))
      } catch (error) {
        console.warn('⚠️ [useClientAuth] Error guardando en caché:', error)
      }
    }

    // Función para obtener el rol del usuario con retry y timeout
    const getUserRole = async (userId: string, retryCount = 0): Promise<string> => {
      // Intentar obtener desde caché primero
      const cachedRole = getCachedRole(userId)
      if (cachedRole) {
        return cachedRole
      }

      try {
        console.log(`🔍 [useClientAuth] Obteniendo rol del usuario... (intento ${retryCount + 1})`)
        
        // Usar Promise.race para timeout más eficiente
        const rolePromise = supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single()

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout obteniendo rol')), TIMEOUT_MS)
        })

        const { data: profile, error: profileError } = await Promise.race([
          rolePromise,
          timeoutPromise
        ]) as any
          
        if (profileError) {
          throw new Error(profileError.message)
        }
        
        const role = profile?.role || 'user'
        console.log('✅ [useClientAuth] Perfil obtenido, rol:', role)
        
        // Guardar en caché
        setCachedRole(userId, role)
        
        return role
      } catch (error) {
        console.error(`💥 [useClientAuth] Error obteniendo rol (intento ${retryCount + 1}):`, error)
        
        // Retry logic
        if (retryCount < MAX_RETRIES) {
          console.log(`🔄 [useClientAuth] Reintentando obtener rol...`)
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))) // Backoff exponencial
          return getUserRole(userId, retryCount + 1)
        }
        
        console.warn('⚠️ [useClientAuth] Máximo de reintentos alcanzado, usando rol por defecto')
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
        
        // Timeout de seguridad optimizado para evitar carga infinita
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn(`⏰ [useClientAuth] Timeout: Forzando fin de carga después de ${TIMEOUT_MS/1000} segundos`)
            setLoading(false)
          }
        }, TIMEOUT_MS)
        
        console.log('📡 [useClientAuth] Obteniendo sesión inicial...')
        
        // Usar Promise.race para timeout más eficiente en getSession
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout obteniendo sesión')), TIMEOUT_MS)
        })

        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any
        
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
