-- Investigar por qué se crean duplicados a pesar del constraint único

-- 1. Verificar que el constraint único existe y está activo
SELECT 
    'CONSTRAINT_STATUS' as check_type,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition,
    convalidated as is_validated
FROM pg_constraint 
WHERE conrelid = 'unified_subscriptions'::regclass 
    AND conname = 'unique_user_external_reference';

-- 2. Verificar registros duplicados actuales del usuario
SELECT 
    'CURRENT_DUPLICATES' as check_type,
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

-- 3. Verificar si los external_reference son realmente diferentes
SELECT 
    'EXTERNAL_REF_ANALYSIS' as check_type,
    us.external_reference,
    LENGTH(us.external_reference) as ref_length,
    us.external_reference = LAG(us.external_reference) OVER (ORDER BY us.created_at) as same_as_previous,
    us.id,
    us.created_at
FROM unified_subscriptions us
JOIN profiles p ON us.user_id = p.id
WHERE p.email = 'cristoferscalante@gmail.com'
ORDER BY us.created_at DESC;

-- 4. Buscar registros con external_reference NULL o vacío
SELECT 
    'NULL_EMPTY_REFS' as check_type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN external_reference IS NULL THEN 1 END) as null_refs,
    COUNT(CASE WHEN external_reference = '' THEN 1 END) as empty_refs,
    COUNT(CASE WHEN external_reference IS NOT NULL AND external_reference != '' THEN 1 END) as valid_refs
FROM unified_subscriptions us
JOIN profiles p ON us.user_id = p.id
WHERE p.email = 'cristoferscalante@gmail.com';

-- 5. Intentar insertar un duplicado para probar el constraint
DO $$
DECLARE
    test_user_id UUID;
    test_external_ref TEXT;
BEGIN
    -- Obtener datos de un registro existente
    SELECT us.user_id, us.external_reference 
    INTO test_user_id, test_external_ref
    FROM unified_subscriptions us
    JOIN profiles p ON us.user_id = p.id
    WHERE p.email = 'cristoferscalante@gmail.com'
    LIMIT 1;
    
    IF test_user_id IS NOT NULL AND test_external_ref IS NOT NULL THEN
        BEGIN
            INSERT INTO unified_subscriptions (user_id, external_reference, status, subscription_type)
            VALUES (test_user_id, test_external_ref, 'pending', 'weekly');
            
            RAISE NOTICE 'ERROR: Se pudo insertar un duplicado - el constraint no está funcionando';
            
            -- Eliminar el registro de prueba
            DELETE FROM unified_subscriptions 
            WHERE user_id = test_user_id 
                AND external_reference = test_external_ref 
                AND status = 'pending'
                AND created_at > NOW() - INTERVAL '1 minute';
                
        EXCEPTION WHEN unique_violation THEN
            RAISE NOTICE 'CORRECTO: El constraint único está funcionando - no se puede insertar duplicado';
        END;
    ELSE
        RAISE NOTICE 'No se encontraron datos para la prueba';
    END IF;
END $$;

-- 6. Verificar todos los duplicados globales
SELECT 
    'GLOBAL_DUPLICATES' as check_type,
    user_id,
    external_reference,
    COUNT(*) as duplicate_count,
    string_agg(id::text, ', ') as record_ids
FROM unified_subscriptions
WHERE external_reference IS NOT NULL
GROUP BY user_id, external_reference
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;