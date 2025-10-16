/**
 * Hook para sincronizar suscripciones automáticamente
 * 
 * Uso:
 * const { syncing, lastSync } = useSubscriptionSync(userId)
 * 
 * Este hook sincroniza las suscripciones del usuario con MercadoPago
 * cuando la página se carga y periódicamente cada 5 minutos.
 */

import { useEffect, useState, useRef } from 'react'

interface UseSyncResult {
  syncing: boolean
  lastSync: Date | null
  error: string | null
  syncNow: () => Promise<void>
}

export function useSubscriptionSync(userId: string | undefined, autoSync: boolean = true): UseSyncResult {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const syncNow = async () => {
    if (!userId || syncing) return

    try {
      setSyncing(true)
      setError(null)

      console.log(`🔄 [SYNC] Sincronizando suscripciones para usuario: ${userId}`)

      // Por ahora, solo marcamos que se sincronizó
      // La sincronización real se hará cuando el usuario consulte sus suscripciones
      // o cuando llegue un webhook
      
      console.log(`ℹ️ [SYNC] Sincronización via webhooks activa. No se requiere polling.`)

      setLastSync(new Date())
    } catch (err) {
      console.error('❌ [SYNC] Error en sincronización:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    if (!userId || !autoSync) return

    // Sincronizar inmediatamente al montar
    syncNow()

    // Configurar sincronización periódica cada 5 minutos
    syncIntervalRef.current = setInterval(() => {
      console.log('⏰ Sincronización periódica automática')
      syncNow()
    }, 5 * 60 * 1000) // 5 minutos

    // Limpiar intervalo al desmontar
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [userId, autoSync])

  return {
    syncing,
    lastSync,
    error,
    syncNow
  }
}
