-- Obtener los resultados de las consultas anteriores
-- Esta consulta nos mostrará si el constraint único existe

-- 1. Verificar constraints únicos
SELECT 'CONSTRAINTS' as query_type, 
       conname AS constraint_name,
       contype AS constraint_type,
       pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.unified_subscriptions'::regclass
    AND contype = 'u'

UNION ALL

-- 2. Verificar índices únicos
SELECT 'INDEXES' as query_type,
       indexname as constraint_name,
       'index' as constraint_type,
       indexdef as constraint_definition
FROM pg_indexes 
WHERE tablename = 'unified_subscriptions' 
    AND schemaname = 'public'
    AND indexdef LIKE '%UNIQUE%';

-- 3. Mostrar todos los registros del usuario problemático
SELECT 
    'USER_RECORDS' as info_type,
    us.id::text,
    us.external_reference,
    us.status,
    us.product_name,
    us.base_price::text,
    us.transaction_amount::text,
    us.mercadopago_subscription_id,
    us.created_at::text,
    u.email
FROM unified_subscriptions us
JOIN auth.users u ON us.user_id = u.id
WHERE u.email = 'cristoferscalante@gmail.com'
ORDER BY us.created_at DESC;

-- 4. Verificar duplicados globales por user_id + external_reference
SELECT 
    'GLOBAL_DUPLICATES' as info_type,
    user_id::text as id,
    external_reference,
    COUNT(*)::text as status,
    array_agg(id)::text as product_name,
    '' as base_price,
    '' as transaction_amount,
    '' as mercadopago_subscription_id,
    '' as created_at,
    '' as email
FROM unified_subscriptions
GROUP BY user_id, external_reference
HAVING COUNT(*) > 1;