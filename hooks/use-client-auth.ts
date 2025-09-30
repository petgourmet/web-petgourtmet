"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cacheService } from "@/utils/cache-service"
import type { User } from "@supabase/supabase-js"

// Constantes para optimización
const TIMEOUT_MS = 3000 // Reducido a 3 segundos para mejor UX
const MAX_RETRIES = 1 // Reducido a 1 reintento para evitar demoras

export function useClientAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout
    let authSubscription: any = null // Variable para almacenar la suscripción
    
    console.log('🔄 [useClientAuth] Iniciando carga de usuario...')
    
    const supabase = createClient()
    


    // Función para obtener el rol del usuario con retry y timeout
    const getUserRole = async (userId: string, retryCount = 0): Promise<string> => {
      // Intentar obtener desde caché primero
      const cachedRole = cacheService.getUserRole(userId)
      if (cachedRole) {
        console.log('📦 [useClientAuth] Rol obtenido desde caché:', cachedRole)
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
        cacheService.setUserRole(userId, role)
        
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
        console.log('🔧 [useClientAuth] Iniciando carga de sesión...')
        
        // Timeout de seguridad optimizado
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn(`⏰ [useClientAuth] Timeout: Forzando fin de carga después de ${TIMEOUT_MS/1000} segundos`)
            setLoading(false)
          }
        }, TIMEOUT_MS)
        
        // Intentar obtener sesión desde caché primero (necesitamos userId, así que saltamos el caché aquí)
        // El caché de sesión se manejará después de obtener la sesión inicial
        
        console.log('📡 [useClientAuth] Obteniendo sesión desde Supabase...')
        
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
          
          // Guardar sesión en caché para futuras cargas
          cacheService.setUserSession(session.user.id, session)
          
          // Obtener rol del usuario
          const role = await getUserRole(session.user.id)
          if (isMounted) {
            setUserRole(role)
          }
        } else {
          console.log('🚪 [useClientAuth] No hay sesión activa')
          setUser(null)
          setUserRole(null)
          // No hay sesión que limpiar
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
    
    // Configurar listener de cambios de autenticación SOLO UNA VEZ
    console.log('👂 [useClientAuth] Configurando listener de cambios de autenticación...')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange)
    authSubscription = subscription
    
    // Cargar sesión inicial
    loadInitialSession()
    
    return () => {
      console.log('🧹 [useClientAuth] Limpiando listeners y timeouts...')
      isMounted = false
      clearTimeout(timeoutId)
      // Asegurar que se desuscriba correctamente
      if (authSubscription) {
        authSubscription.unsubscribe()
        authSubscription = null
      }
    }
  }, []) // Array de dependencias vacío para ejecutar solo una vez

  const signOut = async () => {
    try {
      console.log('🚪 [useClientAuth] Cerrando sesión...')
      
      // Limpiar estado local primero
      setUser(null)
      setUserRole(null)
      setLoading(false)
      
      // Limpiar todos los cachés
      cacheService.clear()
      console.log('🧹 [useClientAuth] Cachés limpiados')
      
      // Cerrar sesión en Supabase con timeout
      const supabase = createClient()
      const signOutPromise = supabase.auth.signOut()
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout cerrando sesión')), TIMEOUT_MS)
      })
      
      const { error } = await Promise.race([
        signOutPromise,
        timeoutPromise
      ]) as any
      
      if (error) {
        console.error('❌ [useClientAuth] Error cerrando sesión:', error)
        throw error
      }
      
      console.log('✅ [useClientAuth] Sesión cerrada exitosamente')
      router.push('/')
    } catch (error) {
      console.error('💥 [useClientAuth] Error en signOut:', error)
      // No lanzar error para evitar bloquear la UI
      // El estado local ya se limpió
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
