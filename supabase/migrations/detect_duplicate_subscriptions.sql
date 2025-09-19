-- Detectar suscripciones duplicadas
-- Buscar usuarios que tengan múltiples suscripciones activas para el mismo producto

-- 1. Detectar duplicados por usuario y producto
SELECT 
    user_id,
    product_id,
    product_name,
    COUNT(*) as subscription_count,
    STRING_AGG(id::text, ', ') as subscription_ids,
    STRING_AGG(status, ', ') as statuses,
    STRING_AGG(external_reference, ', ') as external_references
FROM unified_subscriptions 
WHERE status IN ('active', 'pending', 'processing')
    AND user_id IS NOT NULL 
    AND product_id IS NOT NULL
GROUP BY user_id, product_id, product_name
HAVING COUNT(*) > 1
ORDER BY subscription_count DESC;

-- 2. Detectar duplicados por external_reference
SELECT 
    external_reference,
    COUNT(*) as subscription_count,
    STRING_AGG(id::text, ', ') as subscription_ids,
    STRING_AGG(status, ', ') as statuses,
    STRING_AGG(user_id::text, ', ') as user_ids
FROM unified_subscriptions 
WHERE external_reference IS NOT NULL 
    AND external_reference != ''
GROUP BY external_reference
HAVING COUNT(*) > 1
ORDER BY subscription_count DESC;

-- 3. Mostrar detalles completos de suscripciones duplicadas
WITH duplicates AS (
    SELECT 
        user_id,
        product_id,
        COUNT(*) as count
    FROM unified_subscriptions 
    WHERE status IN ('active', 'pending', 'processing')
        AND user_id IS NOT NULL 
        AND product_id IS NOT NULL
    GROUP BY user_id, product_id
    HAVING COUNT(*) > 1
)
SELECT 
    us.id,
    us.user_id,
    us.product_id,
    us.product_name,
    us.status,
    us.external_reference,
    us.created_at,
    us.updated_at,
    us.mercadopago_subscription_id,
    us.subscription_type,
    us.discounted_price
FROM unified_subscriptions us
INNER JOIN duplicates d ON us.user_id = d.user_id AND us.product_id = d.product_id
WHERE us.status IN ('active', 'pending', 'processing')
ORDER BY us.user_id, us.product_id, us.created_at;

-- 4. Contar total de suscripciones por estado
SELECT 
    status,
    COUNT(*) as count
FROM unified_subscriptions
GROUP BY status
ORDER BY count DESC;