'use client'

import React, { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface RealtimeStatusProps {
  showLabel?: boolean
  className?: string
}

export function RealtimeStatus({ showLabel = true, className = '' }: RealtimeStatusProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Verificar estado inicial de conexión
    checkConnection()

    // Configurar listener para cambios de estado
    const channel = supabase.channel('connection_status')
    
    channel.on('system', {}, (payload) => {
      console.log('🔗 Estado de conexión:', payload)
      setIsConnected(payload.status === 'SUBSCRIBED')
      setLastUpdate(new Date())
    })

    channel.subscribe((status) => {
      console.log('📡 Supabase Realtime status:', status)
      setIsConnected(status === 'SUBSCRIBED')
      setLastUpdate(new Date())
    })

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('unified_subscriptions')
        .select('count')
        .limit(1)
        .single()
      
      setIsConnected(!error)
      setLastUpdate(new Date())
    } catch (error) {
      setIsConnected(false)
      setLastUpdate(new Date())
    }
  }

  const formatLastUpdate = () => {
    if (!lastUpdate) return 'Nunca'
    
    const now = new Date()
    const diff = now.getTime() - lastUpdate.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    
    if (seconds < 60) {
      return `hace ${seconds}s`
    } else if (minutes < 60) {
      return `hace ${minutes}m`
    } else {
      return lastUpdate.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant={isConnected ? 'default' : 'destructive'}
        className="flex items-center gap-1"
      >
        {isConnected ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        {showLabel && (
          <span>
            {isConnected ? 'Tiempo Real' : 'Desconectado'}
          </span>
        )}
      </Badge>
      
      {lastUpdate && (
        <span className="text-xs text-gray-500">
          {formatLastUpdate()}
        </span>
      )}
      
      <button
        onClick={checkConnection}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        title="Verificar conexión"
      >
        <RefreshCw className="h-3 w-3" />
      </button>
    </div>
  )
}

export default RealtimeStatus