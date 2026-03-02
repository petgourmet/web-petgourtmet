'use client'

/**
 * useAdminStats — TanStack Query hook
 *
 * ANTES (dashboard/page.tsx):
 *   5 queries secuenciales en useEffect, sin cache, sin deduplicación.
 *   Cada recarga del admin panel → 5 roundtrips a Supabase.
 *
 * DESPUÉS:
 *   - Una sola llamada Promise.all (paralela)
 *   - Cache durante 2 minutos en el browser
 *   - Si el admin abre el dashboard 5 veces en 2 min → 0 queries extra
 *   - staleTime configurable: stats no necesitan actualizarse en tiempo real
 */

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '../keys'

export interface AdminStats {
    totalUsers: number
    totalBlogs: number
    totalProducts: number
    totalOrders: number
    activeSubscriptions: number
}

async function fetchAdminStats(): Promise<AdminStats> {
    const supabase = createClient()

    const [usersRes, blogsRes, productsRes, ordersRes, subsRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('blogs').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase
            .from('unified_subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active'),
    ])

    return {
        totalUsers: usersRes.count ?? 0,
        totalBlogs: blogsRes.count ?? 0,
        totalProducts: productsRes.count ?? 0,
        totalOrders: ordersRes.count ?? 0,
        activeSubscriptions: subsRes.count ?? 0,
    }
}

export function useAdminStats() {
    return useQuery({
        queryKey: queryKeys.adminStats,
        queryFn: fetchAdminStats,
        staleTime: 2 * 60 * 1000,   // 2 minutos
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    })
}
