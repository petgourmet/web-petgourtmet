-- Migración para agregar constraint único compuesto en unified_subscriptions
-- Previene duplicaciones de suscripciones activas/pendientes por usuario y producto

-- Primero, identificar y limpiar duplicados existentes
DO $$
DECLARE
    duplicate_record RECORD;
    keep_id UUID;
    duplicate_ids UUID[];
BEGIN
    -- Buscar duplicados por user_id y product_name con status activo/pendiente
    FOR duplicate_record IN
        SELECT 
            user_id, 
            product_name,
            COUNT(*) as count,
            ARRAY_AGG(id ORDER BY created_at DESC) as ids
        FROM unified_subscriptions 
        WHERE status IN ('active', 'pending')
        GROUP BY user_id, product_name
        HAVING COUNT(*) > 1
    LOOP
        -- Mantener el más reciente, marcar otros como duplicados
        keep_id := duplicate_record.ids[1];
        duplicate_ids := duplicate_record.ids[2:];
        
        -- Log de duplicados encontrados
        RAISE NOTICE 'Duplicados encontrados para user_id: %, product_name: %, manteniendo: %, marcando como duplicados: %', 
            duplicate_record.user_id, 
            duplicate_record.product_name, 
            keep_id, 
            duplicate_ids;
        
        -- Marcar duplicados como 'duplicate' en lugar de eliminarlos
        UPDATE unified_subscriptions 
        SET 
            status = 'duplicate',
            updated_at = NOW(),
            notes = COALESCE(notes, '') || ' [MIGRACIÓN: Marcado como duplicado el ' || NOW() || ']'
        WHERE id = ANY(duplicate_ids);
        
    END LOOP;
END $$;

-- Crear índice único compuesto para prevenir duplicaciones futuras
-- Solo aplica a suscripciones activas y pendientes
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_unified_subscriptions_unique_active
ON unified_subscriptions (user_id, product_name) 
WHERE status IN ('active', 'pending');

-- Agregar constraint basado en el índice
ALTER TABLE unified_subscriptions 
ADD CONSTRAINT unique_active_subscription_per_user_product 
EXCLUDE USING btree (user_id WITH =, product_name WITH =) 
WHERE (status IN ('active', 'pending'));

-- Crear función para validar duplicados antes de insertar/actualizar
CREATE OR REPLACE FUNCTION validate_subscription_uniqueness()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo validar para status activo o pendiente
    IF NEW.status IN ('active', 'pending') THEN
        -- Verificar si ya existe una suscripción activa/pendiente para el mismo usuario y producto
        IF EXISTS (
            SELECT 1 
            FROM unified_subscriptions 
            WHERE user_id = NEW.user_id 
            AND product_name = NEW.product_name 
            AND status IN ('active', 'pending')
            AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        ) THEN
            RAISE EXCEPTION 'Ya existe una suscripción activa o pendiente para este usuario y producto. User: %, Product: %', 
                NEW.user_id, NEW.product_name;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para validación automática
DROP TRIGGER IF EXISTS trigger_validate_subscription_uniqueness ON unified_subscriptions;
CREATE TRIGGER trigger_validate_subscription_uniqueness
    BEFORE INSERT OR UPDATE ON unified_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION validate_subscription_uniqueness();

-- Crear función para buscar suscripciones existentes antes de crear nuevas
CREATE OR REPLACE FUNCTION find_existing_subscription(
    p_user_id UUID,
    p_product_name TEXT,
    p_external_reference TEXT DEFAULT NULL
)
RETURNS TABLE (
    subscription_id UUID,
    status TEXT,
    external_reference TEXT,
    created_at TIMESTAMPTZ,
    can_reuse BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.id as subscription_id,
        us.status,
        us.external_reference,
        us.created_at,
        CASE 
            WHEN us.status IN ('pending', 'active') THEN TRUE
            WHEN us.status = 'cancelled' AND us.updated_at > NOW() - INTERVAL '24 hours' THEN TRUE
            ELSE FALSE
        END as can_reuse
    FROM unified_subscriptions us
    WHERE us.user_id = p_user_id
    AND us.product_name = p_product_name
    AND (
        us.status IN ('active', 'pending') OR
        (us.external_reference = p_external_reference AND p_external_reference IS NOT NULL) OR
        (us.status = 'cancelled' AND us.updated_at > NOW() - INTERVAL '24 hours')
    )
    ORDER BY 
        CASE us.status 
            WHEN 'active' THEN 1
            WHEN 'pending' THEN 2
            WHEN 'cancelled' THEN 3
            ELSE 4
        END,
        us.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Crear función para reactivar suscripción existente
CREATE OR REPLACE FUNCTION reactivate_subscription(
    p_subscription_id UUID,
    p_external_reference TEXT,
    p_mercadopago_data JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_status TEXT;
BEGIN
    -- Obtener status actual
    SELECT status INTO current_status 
    FROM unified_subscriptions 
    WHERE id = p_subscription_id;
    
    IF current_status IS NULL THEN
        RAISE EXCEPTION 'Suscripción no encontrada: %', p_subscription_id;
    END IF;
    
    -- Actualizar suscripción
    UPDATE unified_subscriptions 
    SET 
        status = 'pending',
        external_reference = p_external_reference,
        updated_at = NOW(),
        reactivated_at = NOW(),
        mercadopago_data = COALESCE(p_mercadopago_data, mercadopago_data),
        notes = COALESCE(notes, '') || ' [REACTIVADA: ' || NOW() || ']'
    WHERE id = p_subscription_id;
    
    -- Log de reactivación
    INSERT INTO subscription_events (
        subscription_id,
        event_type,
        event_data,
        created_at
    ) VALUES (
        p_subscription_id,
        'reactivated',
        jsonb_build_object(
            'previous_status', current_status,
            'new_external_reference', p_external_reference,
            'reactivated_at', NOW()
        ),
        NOW()
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Crear tabla para eventos de suscripción si no existe
CREATE TABLE IF NOT EXISTS subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES unified_subscriptions(id),
    event_type TEXT NOT NULL,
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id 
ON subscription_events(subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_type_date 
ON subscription_events(event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_unified_subscriptions_user_status 
ON unified_subscriptions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_unified_subscriptions_external_ref 
ON unified_subscriptions(external_reference) 
WHERE external_reference IS NOT NULL;

-- Comentarios para documentación
COMMENT ON CONSTRAINT unique_active_subscription_per_user_product ON unified_subscriptions IS 
'Previene duplicaciones de suscripciones activas o pendientes para el mismo usuario y producto';

COMMENT ON FUNCTION find_existing_subscription IS 
'Busca suscripciones existentes que pueden ser reutilizadas antes de crear una nueva';

COMMENT ON FUNCTION reactivate_subscription IS 
'Reactiva una suscripción existente con nuevo external_reference';

COMMENT ON FUNCTION validate_subscription_uniqueness IS 
'Valida que no existan duplicados de suscripciones activas/pendientes antes de insertar/actualizar';

-- Mensaje de finalización
DO $$
BEGIN
    RAISE NOTICE 'Migración completada: Constraint único agregado y funciones de validación creadas';
END $$;