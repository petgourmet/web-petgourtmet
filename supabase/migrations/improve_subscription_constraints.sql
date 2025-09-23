-- Mejora de constraints únicos para prevenir duplicación de suscripciones
-- Fecha: 2024-01-15
-- Descripción: Agrega constraints únicos mejorados y índices para prevenir duplicados

-- 1. Agregar constraint único para external_reference (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unified_subscriptions_external_reference_unique'
    ) THEN
        ALTER TABLE unified_subscriptions 
        ADD CONSTRAINT unified_subscriptions_external_reference_unique 
        UNIQUE (external_reference);
        
        RAISE NOTICE 'Constraint único para external_reference agregado';
    ELSE
        RAISE NOTICE 'Constraint único para external_reference ya existe';
    END IF;
END $$;

-- 2. Agregar constraint único compuesto para prevenir múltiples suscripciones activas
-- del mismo usuario para el mismo plan
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'unified_subscriptions_user_plan_active_unique'
    ) THEN
        -- Crear constraint único parcial (solo para suscripciones activas)
        CREATE UNIQUE INDEX unified_subscriptions_user_plan_active_unique
        ON unified_subscriptions (user_id, subscription_type)
        WHERE status IN ('active', 'pending', 'processing');
        
        RAISE NOTICE 'Constraint único para user_id + subscription_type (activas) agregado';
    ELSE
        RAISE NOTICE 'Constraint único para user_id + subscription_type ya existe';
    END IF;
END $$;

-- 3. Agregar índice para búsquedas rápidas por external_reference
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_unified_subscriptions_external_reference'
    ) THEN
        CREATE INDEX idx_unified_subscriptions_external_reference
        ON unified_subscriptions (external_reference);
        
        RAISE NOTICE 'Índice para external_reference agregado';
    ELSE
        RAISE NOTICE 'Índice para external_reference ya existe';
    END IF;
END $$;

-- 4. Agregar índice compuesto para búsquedas por usuario y plan
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_unified_subscriptions_user_plan_status'
    ) THEN
        CREATE INDEX idx_unified_subscriptions_user_plan_status
        ON unified_subscriptions (user_id, subscription_type, status);
        
        RAISE NOTICE 'Índice compuesto para user_id + subscription_type + status agregado';
    ELSE
        RAISE NOTICE 'Índice compuesto ya existe';
    END IF;
END $$;

-- 5. Agregar índice para búsquedas por fecha de creación (para detectar duplicados recientes)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_unified_subscriptions_created_at'
    ) THEN
        CREATE INDEX idx_unified_subscriptions_created_at
        ON unified_subscriptions (created_at DESC);
        
        RAISE NOTICE 'Índice para created_at agregado';
    ELSE
        RAISE NOTICE 'Índice para created_at ya existe';
    END IF;
END $$;

-- 6. Función para validar external_reference antes de insertar
CREATE OR REPLACE FUNCTION validate_external_reference()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar formato de external_reference
    IF NEW.external_reference IS NULL OR NEW.external_reference = '' THEN
        RAISE EXCEPTION 'external_reference no puede estar vacío';
    END IF;
    
    -- Validar formato esperado: SUB-{userId}-{planId}-{hash}
    IF NEW.external_reference !~ '^SUB-[a-zA-Z0-9\-]+-.+-[a-fA-F0-9]{8}$' THEN
        RAISE EXCEPTION 'external_reference debe tener formato: SUB-{userId}-{planId}-{hash8}';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear trigger para validar external_reference
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_validate_external_reference'
    ) THEN
        CREATE TRIGGER trigger_validate_external_reference
        BEFORE INSERT OR UPDATE ON unified_subscriptions
        FOR EACH ROW
        EXECUTE FUNCTION validate_external_reference();
        
        RAISE NOTICE 'Trigger de validación para external_reference agregado';
    ELSE
        RAISE NOTICE 'Trigger de validación ya existe';
    END IF;
END $$;

-- 8. Función para limpiar duplicados automáticamente
CREATE OR REPLACE FUNCTION cleanup_subscription_duplicates()
RETURNS TABLE(
    external_reference_cleaned TEXT,
    duplicates_removed INTEGER
) AS $$
DECLARE
    duplicate_record RECORD;
    removed_count INTEGER := 0;
BEGIN
    -- Buscar external_references con duplicados
    FOR duplicate_record IN
        SELECT 
            s.external_reference,
            COUNT(*) as duplicate_count,
            MIN(s.id) as keep_id
        FROM unified_subscriptions s
        GROUP BY s.external_reference
        HAVING COUNT(*) > 1
    LOOP
        -- Eliminar duplicados, manteniendo el más antiguo
        DELETE FROM unified_subscriptions 
        WHERE external_reference = duplicate_record.external_reference 
        AND id != duplicate_record.keep_id;
        
        GET DIAGNOSTICS removed_count = ROW_COUNT;
        
        external_reference_cleaned := duplicate_record.external_reference;
        duplicates_removed := removed_count;
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- 9. Agregar comentarios a la tabla para documentación
COMMENT ON COLUMN unified_subscriptions.external_reference IS 
'Referencia externa determinística con formato SUB-{userId}-{planId}-{hash8}. Debe ser única.';

COMMENT ON INDEX unified_subscriptions_user_plan_active_unique IS 
'Previene múltiples suscripciones activas del mismo usuario para el mismo plan.';

-- 10. Verificar integridad de datos existentes
DO $$
DECLARE
    duplicate_count INTEGER;
    null_reference_count INTEGER;
BEGIN
    -- Contar duplicados por external_reference
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT external_reference
        FROM unified_subscriptions
        WHERE external_reference IS NOT NULL
        GROUP BY external_reference
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- Contar registros sin external_reference
    SELECT COUNT(*) INTO null_reference_count
    FROM unified_subscriptions
    WHERE external_reference IS NULL OR external_reference = '';
    
    RAISE NOTICE 'Verificación de integridad completada:';
    RAISE NOTICE '- Duplicados por external_reference: %', duplicate_count;
    RAISE NOTICE '- Registros sin external_reference: %', null_reference_count;
    
    IF duplicate_count > 0 THEN
        RAISE WARNING 'Se encontraron % duplicados. Ejecutar cleanup_subscription_duplicates() para limpiar.', duplicate_count;
    END IF;
    
    IF null_reference_count > 0 THEN
        RAISE WARNING 'Se encontraron % registros sin external_reference. Actualizar manualmente.', null_reference_count;
    END IF;
END $$;

-- Mensaje final
-- Migración de constraints de suscripciones completada exitosamente.
-- Nuevos constraints y funciones disponibles:
-- - unified_subscriptions_external_reference_unique
-- - unified_subscriptions_user_plan_active_unique
-- - validate_external_reference()
-- - cleanup_subscription_duplicates()