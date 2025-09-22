-- Verificar constraints únicos en la tabla unified_subscriptions
SELECT 
    constraint_name, 
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'unified_subscriptions' 
    AND constraint_type = 'UNIQUE';

-- Verificar estructura completa de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'unified_subscriptions'
ORDER BY ordinal_position;

-- Verificar índices únicos
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'unified_subscriptions'
    AND indexdef LIKE '%UNIQUE%';