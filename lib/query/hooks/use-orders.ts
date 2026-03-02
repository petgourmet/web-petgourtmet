'use client'

/**
 * useOrders — TanStack Query hook con Supabase Realtime integrado
 *
 * ANTES (orders/page.tsx):
 *   - fetchOrders() llamado en useEffect + en cada evento Realtime SIN debounce
 *   - Si 10 órdenes se actualizan en 1 segundo → 10 fetchOrders() paralelos
 *
 * DESPUÉS:
 *   - useQuery maneja cache y deduplicación automáticamente
 *   - Realtime invalida el cache con 500ms de debounce
 *   - TanStack re-fetcha en background → UI no pierde el scroll/posición
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchOptimizedOrdersAdmin } from '@/lib/query-optimizations'
import { queryKeys } from '../keys'

export interface UseOrdersOptions {
    page?: number
    status?: string
    search?: string
    enableRealtime?: boolean
}

async function fetchOrdersData(
    page: number,
    status: string,
    search: string
) {
    const supabase = createClient()

    // Reutiliza la función optimizada existente (con JOIN, no N+1)
    // useCache: false → TanStack maneja el cache, no el Map interno
    const allOrders = await fetchOptimizedOrdersAdmin(supabase, false)

    // Filtrar por estado
    let filtered = allOrders
    if (status !== 'all') {
        filtered = filtered.filter(o => o.status === status)
    }

    // Filtrar por búsqueda
    if (search.trim()) {
        const term = search.toLowerCase()
        filtered = filtered.filter(o =>
            o.id?.toString().includes(term) ||
            (o.customer_email || '').toLowerCase().includes(term) ||
            (o.customer_name || '').toLowerCase().includes(term)
        )
    }

    return {
        orders: filtered,
        total: filtered.length,
    }
}

export function useOrders({
    page = 1,
    status = 'all',
    search = '',
    enableRealtime = true,
}: UseOrdersOptions = {}) {
    const queryClient = useQueryClient()
    const debounceRef = useRef<NodeJS.Timeout>()
    const supabase = createClient()

    // Query principal con cache
    const query = useQuery({
        queryKey: queryKeys.orders.list({ page, status, search }),
        queryFn: () => fetchOrdersData(page, status, search),
        staleTime: 30 * 1000,    // 30 segundos
        gcTime: 2 * 60 * 1000,
        placeholderData: prev => prev, // Mantener datos anteriores mientras carga (sin flicker)
    })

    // Supabase Realtime — invalida con debounce en lugar de re-fetch directo
    useEffect(() => {
        if (!enableRealtime) return

        const invalidate = () => {
            clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
                queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
            }, 500) // 500ms debounce — evita cascada de re-fetches
        }

        const ordersChannel = supabase
            .channel('tq_admin_orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, invalidate)
            .subscribe()

        const itemsChannel = supabase
            .channel('tq_admin_order_items')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, invalidate)
            .subscribe()

        return () => {
            clearTimeout(debounceRef.current)
            ordersChannel.unsubscribe()
            itemsChannel.unsubscribe()
        }
    }, [enableRealtime, queryClient])

    return query
}
