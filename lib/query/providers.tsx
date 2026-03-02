'use client'

/**
 * QueryClientProvider para Pet Gourmet — Next.js 15 App Router
 *
 * PATRÓN:
 *  - Servidor → siempre crea una instancia nueva (evita state compartido entre requests)
 *  - Browser  → reutiliza singleton para que React Suspense no pierda el cache
 *
 * Por qué staleTime: 60_000 por defecto:
 *  Con SSR, sin staleTime > 0 TanStack refetchea inmediatamente al hidratar
 *  en el cliente, anulando el beneficio del prefetch del servidor.
 */

import { QueryClient, QueryClientProvider, isServer } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ReactNode } from 'react'

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,          // 1 minuto — evita re-fetch inmediato post-SSR
                gcTime: 5 * 60 * 1000,         // 5 minutos — tiempo en GC antes de limpiar cache
                retry: 1,                       // 1 reintento en error
                refetchOnWindowFocus: false,    // Control explícito en e-commerce
                refetchOnReconnect: true,       // Refetch al reconectar red
            },
        },
    })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
    if (isServer) {
        return makeQueryClient()
    }
    if (!browserQueryClient) {
        browserQueryClient = makeQueryClient()
    }
    return browserQueryClient
}

interface ProvidersProps {
    children: ReactNode
}

export function QueryProviders({ children }: ProvidersProps) {
    const queryClient = getQueryClient()

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools
                    initialIsOpen={false}
                    buttonPosition="bottom-right"
                />
            )}
        </QueryClientProvider>
    )
}
