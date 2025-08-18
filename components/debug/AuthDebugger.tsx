'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useClientAuth } from '@/hooks/use-client-auth'

interface DebugLog {
  timestamp: string
  type: 'info' | 'warning' | 'error' | 'success'
  message: string
  data?: any
}

interface AuthState {
  user: any
  isLoading: boolean
  role: string
  session: any
}

export default function AuthDebugger() {
  const [isVisible, setIsVisible] = useState(true) // Temporalmente visible para debugging
  const [logs, setLogs] = useState<DebugLog[]>([])
  const [authStates, setAuthStates] = useState<AuthState[]>([])
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null)
  const [tableTests, setTableTests] = useState<any>({})
  const renderCount = useRef(0)
  const lastRenderTime = useRef(Date.now())
  
  // Hook de autenticación para monitorear
  const { user, isLoading, role } = useClientAuth()
  const supabase = createClient()

  // Función para agregar logs
  const addLog = (type: DebugLog['type'], message: string, data?: any) => {
    const log: DebugLog = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    }
    setLogs(prev => [log, ...prev.slice(0, 49)]) // Mantener solo 50 logs
  }

  // Monitorear cambios en el estado de autenticación
  useEffect(() => {
    renderCount.current += 1
    const now = Date.now()
    const timeSinceLastRender = now - lastRenderTime.current
    lastRenderTime.current = now

    const currentState: AuthState = {
      user: user ? { id: user.id, email: user.email } : null,
      isLoading,
      role,
      session: null
    }

    setAuthStates(prev => [currentState, ...prev.slice(0, 9)]) // Mantener 10 estados

    if (timeSinceLastRender < 100) {
      addLog('warning', `Re-render rápido detectado (${timeSinceLastRender}ms)`, {
        renderCount: renderCount.current,
        user: user?.email,
        isLoading,
        role
      })
    } else {
      addLog('info', `Estado actualizado (render #${renderCount.current})`, {
        user: user?.email,
        isLoading,
        role,
        timeSinceLastRender
      })
    }
  }, [user, isLoading, role])

  // Verificar estado de Supabase
  const testSupabaseConnection = async () => {
    try {
      addLog('info', 'Probando conexión a Supabase...')
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        addLog('error', 'Error obteniendo sesión', sessionError)
      } else {
        addLog('success', 'Sesión obtenida', {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email
        })
      }

      // Probar conectividad básica
      const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true })
      
      if (error) {
        addLog('error', 'Error conectando a profiles', error)
      } else {
        addLog('success', 'Conexión a profiles exitosa', { count: data })
      }

      setSupabaseStatus({
        session: !!session,
        connectivity: !error,
        lastCheck: new Date().toISOString()
      })
    } catch (err) {
      addLog('error', 'Error de red', err)
      setSupabaseStatus({
        session: false,
        connectivity: false,
        error: err,
        lastCheck: new Date().toISOString()
      })
    }
  }

  // Probar acceso a tablas específicas
  const testTableAccess = async (tableName: string) => {
    try {
      addLog('info', `Probando acceso a tabla: ${tableName}`)
      
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .limit(1)
      
      if (error) {
        addLog('error', `Error accediendo a ${tableName}`, error)
        setTableTests(prev => ({ ...prev, [tableName]: { accessible: false, error: error.message } }))
      } else {
        addLog('success', `Acceso a ${tableName} exitoso`, { count })
        setTableTests(prev => ({ ...prev, [tableName]: { accessible: true, count } }))
      }
    } catch (err) {
      addLog('error', `Error de red en ${tableName}`, err)
      setTableTests(prev => ({ ...prev, [tableName]: { accessible: false, error: 'Network error' } }))
    }
  }

  // Simular carga de datos del usuario
  const testUserDataLoad = async () => {
    if (!user) {
      addLog('warning', 'No hay usuario autenticado para probar carga de datos')
      return
    }

    addLog('info', 'Iniciando prueba de carga de datos del usuario')

    // Probar carga de perfil
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        addLog('error', 'Error cargando perfil', profileError)
      } else {
        addLog('success', 'Perfil cargado exitosamente', profile)
      }
    } catch (err) {
      addLog('error', 'Error de red cargando perfil', err)
    }

    // Probar carga de órdenes
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .limit(5)

      if (ordersError) {
        addLog('error', 'Error cargando órdenes', ordersError)
      } else {
        addLog('success', `Órdenes cargadas: ${orders?.length || 0}`, orders)
      }
    } catch (err) {
      addLog('error', 'Error de red cargando órdenes', err)
    }

    // Probar carga de suscripciones
    try {
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .limit(5)

      if (subsError) {
        addLog('error', 'Error cargando suscripciones', subsError)
      } else {
        addLog('success', `Suscripciones cargadas: ${subscriptions?.length || 0}`, subscriptions)
      }
    } catch (err) {
      addLog('error', 'Error de red cargando suscripciones', err)
    }
  }

  // Limpiar logs
  const clearLogs = () => {
    setLogs([])
    setAuthStates([])
    renderCount.current = 0
    addLog('info', 'Logs limpiados')
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg font-mono text-sm"
        >
          🐛 Debug Auth
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <h2 className="text-lg font-bold font-mono">🐛 Auth Debugger - PetGourmet</h2>
          <button
            onClick={() => setIsVisible(false)}
            className="text-white hover:text-gray-300 text-xl"
          >
            ×
          </button>
        </div>

        <div className="p-4 max-h-[80vh] overflow-y-auto">
          {/* Estado actual */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-bold text-blue-800 mb-2">Estado Actual</h3>
              <div className="text-sm space-y-1">
                <div>Renders: <span className="font-mono">{renderCount.current}</span></div>
                <div>Usuario: <span className="font-mono">{user?.email || 'No autenticado'}</span></div>
                <div>Cargando: <span className="font-mono">{isLoading ? 'Sí' : 'No'}</span></div>
                <div>Rol: <span className="font-mono">{role || 'N/A'}</span></div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-bold text-green-800 mb-2">Supabase Status</h3>
              <div className="text-sm space-y-1">
                <div>Sesión: <span className="font-mono">{supabaseStatus?.session ? '✅' : '❌'}</span></div>
                <div>Conectividad: <span className="font-mono">{supabaseStatus?.connectivity ? '✅' : '❌'}</span></div>
                <div>Última verificación: <span className="font-mono text-xs">
                  {supabaseStatus?.lastCheck ? new Date(supabaseStatus.lastCheck).toLocaleTimeString() : 'N/A'}
                </span></div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-bold text-purple-800 mb-2">Acceso a Tablas</h3>
              <div className="text-sm space-y-1">
                {Object.entries(tableTests).map(([table, result]: [string, any]) => (
                  <div key={table}>
                    {table}: <span className="font-mono">{result.accessible ? '✅' : '❌'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Controles */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={testSupabaseConnection}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
            >
              Probar Conexión
            </button>
            <button
              onClick={() => testTableAccess('profiles')}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
            >
              Probar Profiles
            </button>
            <button
              onClick={() => testTableAccess('orders')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
            >
              Probar Orders
            </button>
            <button
              onClick={() => testTableAccess('subscriptions')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
            >
              Probar Subscriptions
            </button>
            <button
              onClick={testUserDataLoad}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm"
            >
              Probar Carga de Datos
            </button>
            <button
              onClick={clearLogs}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
            >
              Limpiar Logs
            </button>
          </div>

          {/* Logs */}
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs max-h-96 overflow-y-auto">
            <h3 className="text-white mb-2 font-bold">Logs de Debugging:</h3>
            {logs.length === 0 ? (
              <div className="text-gray-500">No hay logs disponibles...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={`mb-1 ${
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'warning' ? 'text-yellow-400' :
                  log.type === 'success' ? 'text-green-400' :
                  'text-blue-400'
                }`}>
                  <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className="ml-2">{log.type.toUpperCase()}:</span>
                  <span className="ml-2">{log.message}</span>
                  {log.data && (
                    <div className="ml-8 text-gray-400 text-xs">
                      {JSON.stringify(log.data, null, 2)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Estados de autenticación recientes */}
          {authStates.length > 0 && (
            <div className="mt-4">
              <h3 className="font-bold mb-2">Estados de Autenticación Recientes:</h3>
              <div className="bg-gray-100 p-3 rounded-lg max-h-32 overflow-y-auto">
                {authStates.map((state, index) => (
                  <div key={index} className="text-xs mb-1 font-mono">
                    <span className="text-gray-500">#{authStates.length - index}:</span>
                    <span className="ml-2">User: {state.user?.email || 'null'}</span>
                    <span className="ml-2">Loading: {state.isLoading ? 'true' : 'false'}</span>
                    <span className="ml-2">Role: {state.role || 'null'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}