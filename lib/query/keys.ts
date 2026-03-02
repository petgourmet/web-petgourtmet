/**
 * Query Key Factory — Pet Gourmet
 * Centraliza todas las claves de TanStack Query para evitar strings mágicos
 * y permitir invalidación quirúrgica por dominio.
 */

export const queryKeys = {
    // ── Admin Stats ──────────────────────────────────────────────────
    adminStats: ['admin-stats'] as const,

    // ── Orders ───────────────────────────────────────────────────────
    orders: {
        all: ['orders'] as const,
        lists: () => [...queryKeys.orders.all, 'list'] as const,
        list: (filters: { page?: number; status?: string; search?: string }) =>
            [...queryKeys.orders.lists(), filters] as const,
        details: () => [...queryKeys.orders.all, 'detail'] as const,
        detail: (id: string) => [...queryKeys.orders.details(), id] as const,
    },

    // ── Subscriptions ────────────────────────────────────────────────
    subscriptions: {
        all: ['subscriptions'] as const,
        lists: () => [...queryKeys.subscriptions.all, 'list'] as const,
        byUser: (userId: string) =>
            [...queryKeys.subscriptions.lists(), { userId }] as const,
        adminAll: () => [...queryKeys.subscriptions.all, 'admin'] as const,
        detail: (id: string) =>
            [...queryKeys.subscriptions.all, 'detail', id] as const,
    },

    // ── Products ─────────────────────────────────────────────────────
    products: {
        all: ['products'] as const,
        lists: () => [...queryKeys.products.all, 'list'] as const,
        list: (filters?: { active?: boolean; category?: string }) =>
            [...queryKeys.products.lists(), filters] as const,
        detail: (id: string) =>
            [...queryKeys.products.all, 'detail', id] as const,
    },

    // ── User Profile ─────────────────────────────────────────────────
    profile: {
        all: ['profile'] as const,
        byUser: (userId: string) =>
            [...queryKeys.profile.all, userId] as const,
        orders: (userId: string) =>
            [...queryKeys.profile.all, userId, 'orders'] as const,
        subscriptions: (userId: string) =>
            [...queryKeys.profile.all, userId, 'subscriptions'] as const,
    },
} as const
