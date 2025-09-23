-- Verificar si existe el constraint único 'unique_user_external_reference'
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'unified_subscriptions'::regclass 
    AND conname = 'unique_user_external_reference';

-- Verificar todos los índices únicos en la tabla unified_subscriptions
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'unified_subscriptions' 
    AND indexdef LIKE '%UNIQUE%';

-- Buscar registros duplicados del usuario cristoferscalante@gmail.com
SELECT 
    us.id,
    us.user_id,
    us.external_reference,
    us.status,
    us.created_at,
    us.updated_at,
    p.email
FROM unified_subscriptions us
JOIN profiles p ON us.user_id = p.id
WHERE p.email = 'cristoferscalante@gmail.com'
ORDER BY us.created_at DESC;

-- Verificar si hay duplicados por user_id + external_reference en toda la tabla
SELECT 
    user_id,
    external_reference,
    COUNT(*) as duplicate_count,
    array_agg(us.id) as record_ids,
    array_agg(us.status) as statuses
FROM unified_subscriptions us
GROUP BY user_id, external_reference
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Verificar la estructura de la tabla unified_subscriptions
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'unified_subscriptions' 
    AND table_schema = 'public'
ORDER BY ordinal_position;