-- Migración para optimizar tablas de suscripciones
-- Basado en el análisis técnico: mantener separación pero optimizar

-- Crear tabla de tipos de suscripción
CREATE TABLE IF NOT EXISTS subscription_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    frequency INTEGER NOT NULL,
    frequency_type VARCHAR(20) NOT NULL CHECK (frequency_type IN ('days', 'weeks', 'months')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear enums para estados
DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('pending', 'active', 'paused', 'cancelled', 'expired', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE pending_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled', 'processed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Crear índices para pending_subscriptions (solo los que no existen)
DO $$ BEGIN
    CREATE INDEX idx_pending_subscriptions_external_ref ON pending_subscriptions(external_reference);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_pending_subscriptions_user_status ON pending_subscriptions(user_id, status);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- Crear índices para user_subscriptions (solo los que no existen)
DO $$ BEGIN
    CREATE INDEX idx_user_subscriptions_user_status ON user_subscriptions(user_id, status);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_user_subscriptions_next_billing ON user_subscriptions(next_billing_date) WHERE status = 'active';
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_user_subscriptions_external_ref ON user_subscriptions(external_reference);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE INDEX idx_user_subscriptions_mp_subscription ON user_subscriptions(mercadopago_subscription_id);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- Crear vista unificada para reportes
CREATE OR REPLACE VIEW subscription_overview AS
SELECT 
    'pending' as source_table,
    ps.id,
    ps.user_id,
    ps.subscription_type,
    ps.status,
    ps.external_reference,
    ps.created_at,
    ps.updated_at,
    ps.processed_at,
    NULL::timestamptz as next_billing_date,
    NULL::numeric as transaction_amount,
    ps.mercadopago_subscription_id
FROM pending_subscriptions ps
UNION ALL
SELECT 
    'active' as source_table,
    us.id,
    us.user_id,
    us.subscription_type,
    us.status,
    us.external_reference,
    us.created_at,
    us.updated_at,
    NULL::timestamptz as processed_at,
    us.next_billing_date,
    us.transaction_amount,
    us.mercadopago_subscription_id
FROM user_subscriptions us;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
DROP TRIGGER IF EXISTS update_pending_subscriptions_updated_at ON pending_subscriptions;
CREATE TRIGGER update_pending_subscriptions_updated_at
    BEFORE UPDATE ON pending_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insertar tipos de suscripción predefinidos
INSERT INTO subscription_types (name, display_name, frequency, frequency_type, description) VALUES
('weekly', 'Semanal', 1, 'weeks', 'Entrega cada semana'),
('biweekly', 'Quincenal', 2, 'weeks', 'Entrega cada dos semanas'),
('monthly', 'Mensual', 1, 'months', 'Entrega cada mes'),
('quarterly', 'Trimestral', 3, 'months', 'Entrega cada tres meses'),
('annual', 'Anual', 12, 'months', 'Entrega cada año')
ON CONFLICT (name) DO NOTHING;

-- Función para validar consistencia de datos
CREATE OR REPLACE FUNCTION validate_subscription_consistency()
RETURNS TABLE(issue_type TEXT, table_name TEXT, record_id INTEGER, description TEXT) AS $$
BEGIN
    -- Verificar suscripciones pendientes sin external_reference
    RETURN QUERY
    SELECT 
        'missing_external_reference'::TEXT,
        'pending_subscriptions'::TEXT,
        ps.id,
        'Suscripción pendiente sin external_reference'::TEXT
    FROM pending_subscriptions ps
    WHERE ps.external_reference IS NULL OR ps.external_reference = '';
    
    -- Verificar suscripciones activas sin next_billing_date
    RETURN QUERY
    SELECT 
        'missing_next_billing_date'::TEXT,
        'user_subscriptions'::TEXT,
        us.id,
        'Suscripción activa sin next_billing_date'::TEXT
    FROM user_subscriptions us
    WHERE us.status = 'active' AND us.next_billing_date IS NULL;
    
    -- Verificar duplicados por external_reference
    RETURN QUERY
    SELECT 
        'duplicate_external_reference'::TEXT,
        'cross_tables'::TEXT,
        0,
        'External reference duplicado entre tablas: ' || ps.external_reference
    FROM pending_subscriptions ps
    INNER JOIN user_subscriptions us ON ps.external_reference = us.external_reference
    WHERE ps.external_reference IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Función para limpiar suscripciones pendientes antiguas
CREATE OR REPLACE FUNCTION cleanup_stale_pending_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Marcar como expiradas las suscripciones pendientes de más de 30 días
  UPDATE pending_subscriptions 
  SET status = 'failed', updated_at = NOW()
  WHERE status = 'pending' 
  AND created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular próxima fecha de facturación
CREATE OR REPLACE FUNCTION calculate_next_billing_date(
  subscription_type_name VARCHAR(50),
  from_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  freq INTEGER;
  freq_type VARCHAR(20);
  next_date TIMESTAMPTZ;
BEGIN
  -- Obtener frecuencia del tipo de suscripción
  SELECT frequency, frequency_type INTO freq, freq_type
  FROM subscription_types
  WHERE name = subscription_type_name AND is_active = true;
  
  IF freq IS NULL THEN
    -- Default a mensual si no se encuentra el tipo
    freq := 1;
    freq_type := 'months';
  END IF;
  
  -- Calcular próxima fecha según el tipo de frecuencia
  CASE freq_type
    WHEN 'days' THEN
      next_date := from_date + (freq || ' days')::INTERVAL;
    WHEN 'weeks' THEN
      next_date := from_date + (freq || ' weeks')::INTERVAL;
    WHEN 'months' THEN
      next_date := from_date + (freq || ' months')::INTERVAL;
    ELSE
      next_date := from_date + '1 month'::INTERVAL;
  END CASE;
  
  RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON TABLE subscription_types IS 'Tabla normalizada para tipos de suscripción';
COMMENT ON VIEW subscription_overview IS 'Vista unificada para reportes de suscripciones';
COMMENT ON FUNCTION validate_subscription_consistency() IS 'Valida la consistencia de datos entre tablas de suscripciones';
COMMENT ON FUNCTION cleanup_stale_pending_subscriptions() IS 'Limpia suscripciones pendientes antiguas marcándolas como fallidas';
COMMENT ON FUNCTION calculate_next_billing_date(VARCHAR, TIMESTAMPTZ) IS 'Calcula la próxima fecha de facturación basada en el tipo de suscripción';