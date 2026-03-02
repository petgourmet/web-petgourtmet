/**
 * TanStack Query — Barrel exports para Pet Gourmet
 * Importar desde '@/lib/query' en lugar de rutas largas
 *
 * Uso:
 *   import { useAdminStats, useOrders, useProfile } from '@/lib/query'
 */

// Keys
export { queryKeys } from './keys'

// Providers
export { QueryProviders } from './providers'

// Hooks Admin
export { useAdminStats } from './hooks/use-admin-stats'
export type { AdminStats } from './hooks/use-admin-stats'

export { useOrders } from './hooks/use-orders'
export type { UseOrdersOptions } from './hooks/use-orders'

// Hooks Usuario
export {
    useProfile,
    useUserOrders,
    useUserSubscriptions,
    useUpdateProfile,
    usePauseSubscription,
    useResumeSubscription,
    useCancelSubscription,
} from './hooks/use-profile'
export type { UserProfile } from './hooks/use-profile'

// Hooks Productos
export {
    useProducts,
    useActiveProducts,
    useInvalidateProducts,
} from './hooks/use-products'
