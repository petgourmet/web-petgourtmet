-- Verificar constraints únicos en la tabla unified_subscriptions
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.unified_subscriptions'::regclass
    AND contype = 'u';

-- Verificar índices únicos
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'unified_subscriptions' 
    AND schemaname = 'public'
    AND indexdef LIKE '%UNIQUE%';

-- Verificar registros duplicados actuales
SELECT 
    user_id,
    external_reference,
    COUNT(*) as count,
    array_agg(id ORDER BY created_at) as ids,
    array_agg(status ORDER BY created_at) as statuses
FROM unified_subscriptions 
WHERE user_id = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
GROUP BY user_id, external_reference
HAVING COUNT(*) > 1;

-- Ver todos los registros del usuario problemático
SELECT 
    id,
    external_reference,
    status,
    subscription_type,
    created_at,
    mercadopago_subscription_id,
    product_name,
    transaction_amount
FROM unified_subscriptions 
WHERE user_id = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
ORDER BY created_at;