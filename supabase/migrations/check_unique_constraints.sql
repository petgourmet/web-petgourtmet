-- Verificar constraints únicos específicos en unified_subscriptions
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    tc.table_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'unified_subscriptions' 
    AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.constraint_name, kcu.ordinal_position;

-- Verificar índices únicos
SELECT 
    i.relname as index_name,
    a.attname as column_name,
    ix.indisunique as is_unique
FROM pg_class t,
     pg_class i,
     pg_index ix,
     pg_attribute a
WHERE t.oid = ix.indrelid
    AND i.oid = ix.indexrelid
    AND a.attrelid = t.oid
    AND a.attnum = ANY(ix.indkey)
    AND t.relkind = 'r'
    AND t.relname = 'unified_subscriptions'
    AND ix.indisunique = true
ORDER BY i.relname, a.attname;

-- Verificar si existe constraint específico user_id + external_reference
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'unified_subscriptions' 
        AND tc.constraint_type = 'UNIQUE'
        AND tc.constraint_name IN (
            SELECT constraint_name 
            FROM information_schema.key_column_usage 
            WHERE table_name = 'unified_subscriptions' 
                AND column_name IN ('user_id', 'external_reference')
            GROUP BY constraint_name 
            HAVING COUNT(*) = 2
        )
) as has_user_external_unique_constraint;