-- Verificación final del constraint único y análisis de duplicados

-- 1. Verificar si el constraint único existe
SELECT 
    'CONSTRAINT_CHECK' as check_type,
    CASE 
        WHEN EXISTS(
            SELECT 1 FROM pg_constraint 
            WHERE conrelid = 'unified_subscriptions'::regclass 
                AND conname = 'unique_user_external_reference'
        ) THEN 'EXISTE'
        ELSE 'NO_EXISTE'
    END as constraint_status;

-- 2. Mostrar todos los constraints únicos actuales
SELECT 
    'EXISTING_CONSTRAINTS' as check_type,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'unified_subscriptions'::regclass 
    AND contype = 'u';

-- 3. Verificar registros del usuario cristoferscalante@gmail.com
SELECT 
    'USER_RECORDS' as check_type,
    us.id,
    us.user_id,
    us.external_reference,
    us.status,
    us.created_at,
    us.updated_at
FROM unified_subscriptions us
JOIN profiles p ON us.user_id = p.id
WHERE p.email = 'cristoferscalante@gmail.com'
ORDER BY us.created_at DESC;

-- 4. Buscar todos los duplicados por user_id + external_reference
SELECT 
    'DUPLICATES_ANALYSIS' as check_type,
    user_id,
    external_reference,
    COUNT(*) as duplicate_count,
    string_agg(id::text, ', ') as record_ids,
    string_agg(status, ', ') as statuses
FROM unified_subscriptions
GROUP BY user_id, external_reference
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 5. Verificar si hay registros con external_reference NULL o vacío
SELECT 
    'NULL_EXTERNAL_REF' as check_type,
    COUNT(*) as records_with_null_external_ref
FROM unified_subscriptions
WHERE external_reference IS NULL OR external_reference = '';

-- 6. Intentar crear el constraint si no existe (esto fallará si hay duplicados)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'unified_subscriptions'::regclass 
            AND conname = 'unique_user_external_reference'
    ) THEN
        BEGIN
            ALTER TABLE unified_subscriptions 
            ADD CONSTRAINT unique_user_external_reference 
            UNIQUE (user_id, external_reference);
            
            RAISE NOTICE 'CONSTRAINT CREADO EXITOSAMENTE';
        EXCEPTION WHEN unique_violation THEN
            RAISE NOTICE 'ERROR: No se puede crear el constraint debido a registros duplicados existentes';
        END;
    ELSE
        RAISE NOTICE 'CONSTRAINT YA EXISTE';
    END IF;
END $$;