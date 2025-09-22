-- Consulta para verificar constraints únicos en unified_subscriptions
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.unified_subscriptions'::regclass 
    AND contype = 'u';

-- También verificar índices únicos
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'unified_subscriptions' 
    AND schemaname = 'public'
    AND indexdef LIKE '%UNIQUE%';