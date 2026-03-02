'use client'

/**
 * useProducts — TanStack Query hook
 *
 * Cache agresivo: los productos cambian solo cuando el admin los edita.
 * staleTime: 10 minutos → la tienda pública puede servir productos sin re-fetch.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '../keys'

interface UseProductsOptions {
    active?: boolean
    category?: string
}

async function fetchProducts(options: UseProductsOptions = {}) {
    const supabase = createClient()

    let query = supabase
        .from('products')
        .select(`
      *,
      product_images (*),
      product_categories (*)
    `)
        .order('created_at', { ascending: false })

    if (options.active !== undefined) {
        query = query.eq('active', options.active)
    }

    const { data, error } = await query
    if (error) throw error
    return data ?? []
}

export function useProducts(options: UseProductsOptions = {}) {
    return useQuery({
        queryKey: queryKeys.products.list(options),
        queryFn: () => fetchProducts(options),
        staleTime: 10 * 60 * 1000,  // 10 minutos — productos son relativamente estáticos
        gcTime: 15 * 60 * 1000,
    })
}

export function useActiveProducts() {
    return useProducts({ active: true })
}

/**
 * Función utilitaria para invalidar productos desde cualquier componente
 * Usarla después de crear/editar/eliminar un producto desde el admin
 */
export function useInvalidateProducts() {
    const queryClient = useQueryClient()
    return () => queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
}
