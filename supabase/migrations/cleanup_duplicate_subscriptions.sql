-- Limpiar suscripciones duplicadas
-- Mantener solo la suscripción más reciente por usuario y producto

-- 1. Marcar suscripciones duplicadas como 'duplicate_cancelled' excepto la más reciente
WITH ranked_subscriptions AS (
    SELECT 
        id,
        user_id,
        product_id,
        status,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, product_id 
            ORDER BY 
                CASE 
                    WHEN status = 'active' THEN 1
                    WHEN status = 'processing' THEN 2
                    WHEN status = 'pending' THEN 3
                    ELSE 4
                END,
                created_at DESC
        ) as rn
    FROM unified_subscriptions 
    WHERE status IN ('active', 'pending', 'processing')
        AND user_id IS NOT NULL 
        AND product_id IS NOT NULL
),
duplicates_to_cancel AS (
    SELECT id
    FROM ranked_subscriptions
    WHERE rn > 1
)
UPDATE unified_subscriptions 
SET 
    status = 'duplicate_cancelled',
    updated_at = NOW(),
    cancelled_at = NOW(),
    reason = 'Duplicate subscription detected and cancelled automatically'
WHERE id IN (SELECT id FROM duplicates_to_cancel);

-- 2. Mostrar resumen de la limpieza
SELECT 
    'Suscripciones marcadas como duplicate_cancelled' as action,
    COUNT(*) as count
FROM unified_subscriptions 
WHERE status = 'duplicate_cancelled'
    AND reason = 'Duplicate subscription detected and cancelled automatically';

-- 3. Verificar que no quedan duplicados activos
SELECT 
    user_id,
    product_id,
    product_name,
    COUNT(*) as active_subscriptions
FROM unified_subscriptions 
WHERE status IN ('active', 'pending', 'processing')
    AND user_id IS NOT NULL 
    AND product_id IS NOT NULL
GROUP BY user_id, product_id, product_name
HAVING COUNT(*) > 1;

-- 4. Mostrar estadísticas finales
SELECT 
    status,
    COUNT(*) as count
FROM unified_subscriptions
GROUP BY status
ORDER BY 
    CASE status
        WHEN 'active' THEN 1
        WHEN 'pending' THEN 2
        WHEN 'processing' THEN 3
        WHEN 'duplicate_cancelled' THEN 4
        WHEN 'cancelled' THEN 5
        WHEN 'failed' THEN 6
        ELSE 7
    END;