'use client'

/**
 * Hooks de perfil de usuario — TanStack Query
 *
 * ANTES (perfil/page.tsx):
 *   - Promise.all([fetchUserProfile(), fetchOrders(), fetchSubscriptions()])
 *   - fetchOrders hacía 2 queries: orders → luego order_items en N+1
 *   - Sin cache: cada tab switch → re-fetch completo
 *
 * DESPUÉS:
 *   - Queries independientes con staleTime propio por tipo de dato
 *   - fetchUserOrders usa JOIN SQL directo → no hay N+1
 *   - Si el usuario cambia de tab y vuelve → datos del cache instantáneamente
 *   - Mutations invalidan solo el slice relevante del cache
 */

import {
    useQuery,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '../keys'
import { toast } from 'sonner'

// ── Tipos ─────────────────────────────────────────────────────────

export interface UserProfile {
    id: string
    email: string
    full_name: string
    phone?: string
    address?: string
}

// ── Fetchers ──────────────────────────────────────────────────────

async function fetchProfile(userId: string): Promise<UserProfile | null> {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

    // PGRST116 = no encontrado → perfil nuevo, retornar null en lugar de throw
    if (error && error.code !== 'PGRST116') throw error
    return data
}

async function fetchUserOrders(userId: string) {
    const supabase = createClient()

    // Query optimizada con JOIN — elimina el patrón N+1 del código original
    // ANTES: orders → luego order_items (2 queries)
    // AHORA: 1 sola query con join
    const { data, error } = await supabase
        .from('orders')
        .select(`
      *,
      order_items (
        id,
        product_id,
        quantity,
        price,
        size,
        product_name,
        products (
          id,
          name,
          image,
          price
        )
      )
    `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
}

async function fetchUserSubscriptions(userId: string) {
    const supabase = createClient()

    // Buscar por user_id
    const { data: byUserId, error: error1 } = await supabase
        .from('unified_subscriptions')
        .select(`
      *,
      products (
        id,
        name,
        image,
        price
      )
    `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error1) throw error1

    // También buscar por email del usuario autenticado (fallback si user_id no se guardó)
    const { data: { user } } = await supabase.auth.getUser()
    let byEmail: typeof byUserId = []
    if (user?.email) {
        const { data: emailData, error: error2 } = await supabase
            .from('unified_subscriptions')
            .select(`
          *,
          products (
            id,
            name,
            image,
            price
          )
        `)
            .eq('customer_email', user.email)
            .is('user_id', null)
            .order('created_at', { ascending: false })

        if (!error2 && emailData) {
            byEmail = emailData
        }
    }

    // Combinar resultados sin duplicados
    const allSubs = [...(byUserId ?? []), ...(byEmail ?? [])]

    // Deduplicar por stripe_subscription_id (lógica preservada del original)
    const seen = new Set<string>()
    return allSubs.filter(sub => {
        if (!sub.stripe_subscription_id) return true
        if (seen.has(sub.stripe_subscription_id)) return false
        seen.add(sub.stripe_subscription_id)
        return true
    })
}

// ── Hooks públicos ────────────────────────────────────────────────

export function useProfile(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.profile.byUser(userId!),
        queryFn: () => fetchProfile(userId!),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,   // 5 minutos — perfil cambia poco
    })
}

export function useUserOrders(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.profile.orders(userId!),
        queryFn: () => fetchUserOrders(userId!),
        enabled: !!userId,
        staleTime: 60 * 1000,        // 1 minuto
        gcTime: 3 * 60 * 1000,
    })
}

export function useUserSubscriptions(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.profile.subscriptions(userId!),
        queryFn: () => fetchUserSubscriptions(userId!),
        enabled: !!userId,
        staleTime: 30 * 1000,        // 30 segundos — estado puede cambiar por webhooks
        gcTime: 2 * 60 * 1000,
    })
}

// ── Mutation: actualizar perfil ───────────────────────────────────

export function useUpdateProfile(userId: string) {
    const queryClient = useQueryClient()
    const supabase = createClient()

    return useMutation({
        mutationFn: async (profileData: Partial<UserProfile>) => {
            // Actualizar auth metadata
            await supabase.auth.updateUser({
                data: {
                    full_name: profileData.full_name,
                    phone: profileData.phone,
                },
            })

            // Actualizar tabla profiles
            const { error } = await supabase.from('profiles').upsert({
                id: userId,
                ...profileData,
                updated_at: new Date().toISOString(),
            } as any)

            if (error) throw error
        },
        onSuccess: () => {
            // Invalida solo el perfil de este usuario → auto re-fetch
            queryClient.invalidateQueries({
                queryKey: queryKeys.profile.byUser(userId),
            })
            toast.success('Perfil actualizado correctamente')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Error al guardar el perfil')
        },
    })
}

// ── Mutations: suscripciones ──────────────────────────────────────

function useSubscriptionAction(endpoint: string, userId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (subscriptionId: string | number) => {
            const res = await fetch(`/api/subscriptions/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscriptionId }),
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || `Error al ${endpoint} suscripción`)
            }
        },
        onSuccess: () => {
            // Invalida suscripciones del usuario y stats admin → auto re-fetch
            queryClient.invalidateQueries({
                queryKey: queryKeys.profile.subscriptions(userId),
            })
            queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
        },
        onError: (error: Error) => {
            toast.error(error.message)
        },
    })
}

export const usePauseSubscription = (userId: string) =>
    useSubscriptionAction('pause', userId)

export const useResumeSubscription = (userId: string) =>
    useSubscriptionAction('resume', userId)

export const useCancelSubscription = (userId: string) =>
    useSubscriptionAction('cancel', userId)
