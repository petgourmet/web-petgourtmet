-- Verificar si el constraint único existe en la tabla unified_subscriptions
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

-- Buscar registros duplicados del usuario cristoferscalante@gmail.com
SELECT 
    us.id,
    us.user_id,
    us.external_reference,
    us.status,
    us.product_name,
    us.base_price,
    us.transaction_amount,
    us.mercadopago_subscription_id,
    us.created_at,
    u.email
FROM unified_subscriptions us
JOIN auth.users u ON us.user_id = u.id
WHERE u.email = 'cristoferscalante@gmail.com'
ORDER BY us.created_at DESC;

-- Verificar si hay duplicados por external_reference
SELECT 
    external_reference,
    COUNT(*) as count,
    array_agg(us.id) as ids,
    array_agg(us.status) as statuses
FROM unified_subscriptions us
JOIN auth.users u ON us.user_id = u.id
WHERE u.email = 'cristoferscalante@gmail.com'
GROUP BY external_reference
HAVING COUNT(*) > 1;

-- Verificar si hay duplicados por user_id + external_reference
SELECT 
    user_id,
    external_reference,
    COUNT(*) as count,
    array_agg(id) as ids
FROM unified_subscriptions
GROUP BY user_id, external_reference
HAVING COUNT(*) > 1;