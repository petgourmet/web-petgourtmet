-- Migración para optimizar el sistema de suscripciones dinámico
-- Elimina campos obsoletos y optimiza la estructura para el nuevo sistema sin planes

-- 1. LIMPIAR CAMPOS OBSOLETOS DE LA TABLA PRODUCTS
-- Eliminar URLs hardcodeadas de MercadoPago que ya no se usan
ALTER TABLE products 
DROP COLUMN IF EXISTS weekly_mercadopago_url,
DROP COLUMN IF EXISTS biweekly_mercadopago_url,
DROP COLUMN IF EXISTS monthly_mercadopago_url,
DROP COLUMN IF EXISTS quarterly_mercadopago_url,
DROP COLUMN IF EXISTS annual_mercadopago_url;

-- 2. LIMPIAR CAMPOS OBSOLETOS DE UNIFIED_SUBSCRIPTIONS
-- Mantener preapproval_plan_id como nullable para compatibilidad con datos existentes
-- pero limpiar mercadopago_plan_id que ya no se usa
ALTER TABLE unified_subscriptions 
DROP COLUMN IF EXISTS mercadopago_plan_id;

-- 3. OPTIMIZAR UNIFIED_SUBSCRIPTIONS PARA EL NUEVO SISTEMA
-- Agregar índices para mejorar el rendimiento de consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_unified_subscriptions_user_status 
ON unified_subscriptions(user_id, status) 
WHERE status IN ('active', 'pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_unified_subscriptions_product_type 
ON unified_subscriptions(product_id, subscription_type) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_unified_subscriptions_next_billing 
ON unified_subscriptions(next_billing_date) 
WHERE status = 'active' AND next_billing_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_unified_subscriptions_external_ref 
ON unified_subscriptions(external_reference) 
WHERE external_reference IS NOT NULL;

-- 4. CREAR TABLA DE MÉTRICAS DE SUSCRIPCIONES
CREATE TABLE IF NOT EXISTS subscription_metrics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    subscription_type VARCHAR(50) NOT NULL,
    product_id INTEGER REFERENCES products(id),
    
    -- Métricas de suscripciones
    new_subscriptions INTEGER DEFAULT 0,
    cancelled_subscriptions INTEGER DEFAULT 0,
    active_subscriptions INTEGER DEFAULT 0,
    paused_subscriptions INTEGER DEFAULT 0,
    
    -- Métricas financieras
    total_revenue NUMERIC(10,2) DEFAULT 0,
    average_subscription_value NUMERIC(10,2) DEFAULT 0,
    
    -- Métricas de retención
    churn_rate NUMERIC(5,2) DEFAULT 0,
    retention_rate NUMERIC(5,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint para evitar duplicados por fecha/tipo/producto
    UNIQUE(date, subscription_type, product_id)
);

-- Índices para la tabla de métricas
CREATE INDEX IF NOT EXISTS idx_subscription_metrics_date 
ON subscription_metrics(date DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_metrics_product_type 
ON subscription_metrics(product_id, subscription_type);

-- 5. OPTIMIZAR PRODUCT_SUBSCRIPTION_CONFIG
-- Agregar índice compuesto para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_product_subscription_config_lookup 
ON product_subscription_config(product_id, subscription_type, is_available) 
WHERE is_available = true;

-- 6. OPTIMIZAR BILLING_HISTORY
-- Agregar índices para consultas de historial
CREATE INDEX IF NOT EXISTS idx_billing_history_subscription_date 
ON billing_history(subscription_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_billing_history_status_date 
ON billing_history(status, transaction_date DESC) 
WHERE status IN ('approved', 'pending');

-- 7. OPTIMIZAR SUBSCRIPTION_NOTIFICATIONS
-- Agregar índice para notificaciones pendientes
CREATE INDEX IF NOT EXISTS idx_subscription_notifications_pending 
ON subscription_notifications(notification_sent, created_at) 
WHERE notification_sent = false;

-- 8. FUNCIÓN PARA CALCULAR MÉTRICAS DIARIAS
CREATE OR REPLACE FUNCTION calculate_daily_subscription_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
    -- Insertar o actualizar métricas por tipo de suscripción y producto
    INSERT INTO subscription_metrics (
        date, 
        subscription_type, 
        product_id,
        new_subscriptions,
        cancelled_subscriptions,
        active_subscriptions,
        paused_subscriptions,
        total_revenue,
        average_subscription_value
    )
    SELECT 
        target_date,
        us.subscription_type,
        us.product_id,
        COUNT(*) FILTER (WHERE DATE(us.created_at) = target_date) as new_subscriptions,
        COUNT(*) FILTER (WHERE DATE(us.cancelled_at) = target_date) as cancelled_subscriptions,
        COUNT(*) FILTER (WHERE us.status = 'active') as active_subscriptions,
        COUNT(*) FILTER (WHERE us.status = 'paused') as paused_subscriptions,
        COALESCE(SUM(us.discounted_price) FILTER (WHERE us.status = 'active'), 0) as total_revenue,
        COALESCE(AVG(us.discounted_price) FILTER (WHERE us.status = 'active'), 0) as average_subscription_value
    FROM unified_subscriptions us
    WHERE us.product_id IS NOT NULL
    GROUP BY us.subscription_type, us.product_id
    ON CONFLICT (date, subscription_type, product_id) 
    DO UPDATE SET
        new_subscriptions = EXCLUDED.new_subscriptions,
        cancelled_subscriptions = EXCLUDED.cancelled_subscriptions,
        active_subscriptions = EXCLUDED.active_subscriptions,
        paused_subscriptions = EXCLUDED.paused_subscriptions,
        total_revenue = EXCLUDED.total_revenue,
        average_subscription_value = EXCLUDED.average_subscription_value,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 9. TRIGGER PARA ACTUALIZAR TIMESTAMPS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a subscription_metrics
DROP TRIGGER IF EXISTS update_subscription_metrics_updated_at ON subscription_metrics;
CREATE TRIGGER update_subscription_metrics_updated_at
    BEFORE UPDATE ON subscription_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. LIMPIAR DATOS OBSOLETOS
-- Limpiar registros de unified_subscriptions con estados obsoletos o datos incompletos
UPDATE unified_subscriptions 
SET status = 'cancelled', 
    cancelled_at = NOW(),
    updated_at = NOW()
WHERE status IN ('failed', 'expired') 
  AND cancelled_at IS NULL;

-- 11. COMENTARIOS Y DOCUMENTACIÓN
COMMENT ON TABLE subscription_metrics IS 'Métricas diarias agregadas del sistema de suscripciones para análisis y reportes';
COMMENT ON FUNCTION calculate_daily_subscription_metrics(DATE) IS 'Calcula y actualiza las métricas diarias de suscripciones para una fecha específica';

-- 12. PERMISOS Y SEGURIDAD
-- Habilitar RLS en la nueva tabla de métricas
ALTER TABLE subscription_metrics ENABLE ROW LEVEL SECURITY;

-- Política para que solo admins puedan ver métricas
CREATE POLICY "Admin can view subscription metrics" ON subscription_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Política para que el sistema pueda insertar/actualizar métricas
CREATE POLICY "System can manage subscription metrics" ON subscription_metrics
    FOR ALL USING (true);

-- 13. VALIDACIÓN FINAL
-- Verificar que las tablas principales tienen los índices necesarios
DO $$
BEGIN
    -- Verificar que unified_subscriptions tiene external_reference único
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unified_subscriptions_external_reference_key'
    ) THEN
        ALTER TABLE unified_subscriptions 
        ADD CONSTRAINT unified_subscriptions_external_reference_key 
        UNIQUE (external_reference);
    END IF;
END $$;

-- Mensaje de finalización
SELECT 'Migración de optimización del sistema de suscripciones completada exitosamente' as resulta