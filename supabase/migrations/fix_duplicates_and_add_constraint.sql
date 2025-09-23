-- Solución definitiva para el problema de duplicados en unified_subscriptions
-- Paso 1: Identificar y limpiar duplicados existentes
-- Paso 2: Agregar constraint único para prevenir futuros duplicados

BEGIN;

-- 1. Identificar registros duplicados del usuario cristoferscalante@gmail.com
DO $$
DECLARE
    user_uuid UUID;
    duplicate_record RECORD;
    keep_record_id BIGINT;
BEGIN
    -- Obtener el UUID del usuario
    SELECT p.id INTO user_uuid
    FROM profiles p 
    WHERE p.email = 'cristoferscalante@gmail.com';
    
    IF user_uuid IS NULL THEN
        RAISE NOTICE 'Usuario cristoferscalante@gmail.com no encontrado';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Usuario encontrado: %', user_uuid;
    
    -- Mostrar registros actuales del usuario
    RAISE NOTICE '--- REGISTROS ACTUALES DEL USUARIO ---';
    FOR duplicate_record IN 
        SELECT id, external_reference, status, created_at, updated_at
        FROM unified_subscriptions 
        WHERE user_id = user_uuid
        ORDER BY created_at DESC
    LOOP
        RAISE NOTICE 'ID: %, External Ref: %, Status: %, Created: %, Updated: %', 
            duplicate_record.id, duplicate_record.external_reference, 
            duplicate_record.status, duplicate_record.created_at, duplicate_record.updated_at;
    END LOOP;
    
    -- Identificar el registro que debe mantenerse (el más reciente con datos completos)
    SELECT id INTO keep_record_id
    FROM unified_subscriptions 
    WHERE user_id = user_uuid
    ORDER BY 
        CASE WHEN status = 'active' THEN 1 ELSE 2 END,  -- Priorizar activos
        CASE WHEN updated_at IS NOT NULL THEN 1 ELSE 2 END,  -- Priorizar actualizados
        created_at DESC  -- Más reciente
    LIMIT 1;
    
    RAISE NOTICE 'Registro a mantener: %', keep_record_id;
    
    -- Eliminar registros duplicados (mantener solo el correcto)
    DELETE FROM unified_subscriptions 
    WHERE user_id = user_uuid 
        AND id != keep_record_id;
    
    GET DIAGNOSTICS duplicate_record.id = ROW_COUNT;
    RAISE NOTICE 'Registros duplicados eliminados: %', duplicate_record.id;
    
END $$;

-- 2. Verificar que no hay más duplicados globales antes de agregar constraint
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT user_id, external_reference, COUNT(*)
        FROM unified_subscriptions
        WHERE external_reference IS NOT NULL
        GROUP BY user_id, external_reference
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Aún existen % grupos de registros duplicados. No se puede agregar el constraint único.', duplicate_count;
    ELSE
        RAISE NOTICE 'No se encontraron duplicados. Procediendo a agregar constraint único.';
    END IF;
END $$;

-- 3. Agregar constraint único para prevenir futuros duplicados
ALTER TABLE unified_subscriptions 
ADD CONSTRAINT unique_user_external_reference 
UNIQUE (user_id, external_reference);

-- 4. Verificar que el constraint se creó correctamente
SELECT 
    'CONSTRAINT_VERIFICATION' as check_type,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'unified_subscriptions'::regclass 
    AND conname = 'unique_user_external_reference';

-- 5. Mostrar estado final del usuario
SELECT 
    'FINAL_USER_STATE' as check_type,
    us.id,
    us.external_reference,
    us.status,
    us.created_at,
    us.updated_at
FROM unified_subscriptions us
JOIN profiles p ON us.user_id = p.id
WHERE p.email = 'cristoferscalante@gmail.com'
ORDER BY us.created_at DESC;

COMMIT;