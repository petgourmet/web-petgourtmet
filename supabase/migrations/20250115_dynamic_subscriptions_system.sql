-- Migración para Sistema de Suscripciones Dinámicas
-- Fecha: 2025-01-15
-- Descripción: Actualiza unified_subscriptions y crea nuevas tablas para suscripciones dinámicas

-- 1. Actualizar tabla unified_subscriptions para suscripciones dinámicas
ALTER TABLE unified_subscriptions 
ADD COLUMN IF NOT EXISTS frequency_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'pending' CHECK (payment_method IN ('pending', 'authorized')),
ADD COLUMN IF NOT EXISTS card_token TEXT,
ADD COLUMN IF NOT EXISTS pause_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 2. Crear tabla de configuración de suscripciones por producto
CREATE TABLE IF NOT EXISTS product_subscription_config (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    is_subscription_enabled BOOLEAN DEFAULT true,
    min_frequency_days INTEGER DEFAULT 1,
    max_frequency_days INTEGER DEFAULT 90,
    discount_monthly DECIMAL(5,2) DEFAULT 5.00,
    discount_quarterly DECIMAL(5,2) DEFAULT 10.00,
    discount_custom DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear tabla de métricas de suscripciones
CREATE TABLE IF NOT EXISTS subscription_metrics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    total_subscriptions INTEGER DEFAULT 0,
    active_subscriptions INTEGER DEFAULT 0,
    paused_subscriptions INTEGER DEFAULT 0,
    cancelled_subscriptions INTEGER DEFAULT 0,
    new_subscriptions INTEGER DEFAULT 0,
    churned_subscriptions INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    recurring_revenue DECIMAL(12,2) DEFAULT 0.00,
    failed_payments INTEGER DEFAULT 0,
    successful_payments INTEGER DEFAULT 0,
    payment_success_rate DECIMAL(5,2) DEFAULT 0.00,
    average_subscription_value DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date)
);

-- 4. Crear tabla de historial de cambios de suscripción
CREATE TABLE IF NOT EXISTS subscription_history (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES unified_subscriptions(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    old_frequency_days INTEGER,
    new_frequency_days INTEGER,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- 5. Crear tabla de intentos de pago
CREATE TABLE IF NOT EXISTS subscription_payment_attempts (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES unified_subscriptions(id) ON DELETE CASCADE,
    payment_id TEXT,
    attempt_number INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ARS',
    error_code TEXT,
    error_message TEXT,
    mercadopago_response JSONB,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- 6. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_unified_subscriptions_status_next_payment 
ON unified_subscriptions(status, next_payment_date) 
WHERE status IN ('active', 'authorized');

CREATE INDEX IF NOT EXISTS idx_unified_subscriptions_frequency 
ON unified_subscriptions(frequency_days, frequency_type);

CREATE INDEX IF NOT EXISTS idx_unified_subscriptions_payment_method 
ON unified_subscriptions(payment_method);

CREATE INDEX IF NOT EXISTS idx_product_subscription_config_product_id 
ON product_subscription_config(product_id);

CREATE INDEX IF NOT EXISTS idx_subscription_metrics_date 
ON subscription_metrics(date DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription_id 
ON subscription_history(subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_payment_attempts_subscription_id 
ON subscription_payment_attempts(subscription_id, attempted_at DESC);

-- 7. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Crear triggers para updated_at
DROP TRIGGER IF EXISTS update_product_subscription_config_updated_at ON product_subscription_config;
CREATE TRIGGER update_product_subscription_config_updated_at 
    BEFORE UPDATE ON product_subscription_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Crear función para calcular próxima fecha de pago
CREATE OR REPLACE FUNCTION calculate_next_payment_date(
    base_date TIMESTAMP WITH TIME ZONE,
    frequency_days INTEGER,
    frequency_type VARCHAR(10)
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    IF frequency_type = 'days' THEN
        RETURN base_date + (frequency_days || ' days')::INTERVAL;
    ELSIF frequency_type = 'months' THEN
        RETURN base_date + (frequency_days || ' months')::INTERVAL;
    ELSE
        RETURN base_date + (frequency_days || ' days')::INTERVAL;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 10. Crear función para registrar cambios en el historial
CREATE OR REPLACE FUNCTION log_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo registrar si hay cambios significativos
    IF (OLD.status IS DISTINCT FROM NEW.status) OR 
       (OLD.frequency_days IS DISTINCT FROM NEW.frequency_days) OR
       (OLD.payment_method IS DISTINCT FROM NEW.payment_method) THEN
        
        INSERT INTO subscription_history (
            subscription_id,
            action,
            old_status,
            new_status,
            old_frequency_days,
            new_frequency_days,
            metadata
        ) VALUES (
            NEW.id,
            CASE 
                WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'status_change'
                WHEN OLD.frequency_days IS DISTINCT FROM NEW.frequency_days THEN 'frequency_change'
                WHEN OLD.payment_method IS DISTINCT FROM NEW.payment_method THEN 'payment_method_change'
                ELSE 'update'
            END,
            OLD.status,
            NEW.status,
            OLD.frequency_days,
            NEW.frequency_days,
            jsonb_build_object(
                'old_payment_method', OLD.payment_method,
                'new_payment_method', NEW.payment_method,
                'old_pause_until', OLD.pause_until,
                'new_pause_until', NEW.pause_until
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Crear trigger para historial de cambios
DROP TRIGGER IF EXISTS log_subscription_changes ON unified_subscriptions;
CREATE TRIGGER log_subscription_changes
    AFTER UPDATE ON unified_subscriptions
    FOR EACH ROW EXECUTE FUNCTION log_subscription_change();

-- 12. Insertar configuración por defecto para productos existentes
INSERT INTO product_subscription_config (product_id)
SELECT id FROM products 
WHERE id NOT IN (SELECT product_id FROM product_subscription_config);

-- 13. Crear vista para métricas en tiempo real
CREATE OR REPLACE VIEW subscription_metrics_realtime AS
SELECT 
    CURRENT_DATE as date,
    COUNT(*) as total_subscriptions,
    COUNT(*) FILTER (WHERE status = 'active') as active_subscriptions,
    COUNT(*) FILTER (WHERE status = 'paused') as paused_subscriptions,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_subscriptions,
    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as new_subscriptions,
    COUNT(*) FILTER (WHERE status = 'cancelled' AND DATE(updated_at) = CURRENT_DATE) as churned_subscriptions,
    COALESCE(SUM(transaction_amount), 0) as total_revenue,
    COALESCE(SUM(transaction_amount) FILTER (WHERE status IN ('active', 'authorized')), 0) as recurring_revenue,
    COALESCE(AVG(transaction_amount) FILTER (WHERE status IN ('active', 'authorized')), 0) as average_subscription_value
FROM unified_subscriptions;

-- 14. Crear función para actualizar métricas diarias
CREATE OR REPLACE FUNCTION update_daily_metrics()
RETURNS void AS $$
DECLARE
    target_date DATE := CURRENT_DATE - INTERVAL '1 day';
    payment_stats RECORD;
BEGIN
    -- Obtener estadísticas de pagos del día anterior
    SELECT 
        COUNT(*) FILTER (WHERE status = 'approved') as successful_payments,
        COUNT(*) FILTER (WHERE status != 'approved') as failed_payments,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(*) FILTER (WHERE status = 'approved')::DECIMAL / COUNT(*) * 100)
            ELSE 0 
        END as success_rate
    INTO payment_stats
    FROM subscription_payments 
    WHERE DATE(created_at) = target_date;
    
    -- Insertar o actualizar métricas del día anterior
    INSERT INTO subscription_metrics (
        date,
        total_subscriptions,
        active_subscriptions,
        paused_subscriptions,
        cancelled_subscriptions,
        new_subscriptions,
        churned_subscriptions,
        total_revenue,
        recurring_revenue,
        successful_payments,
        failed_payments,
        payment_success_rate,
        average_subscription_value
    )
    SELECT 
        target_date,
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'active'),
        COUNT(*) FILTER (WHERE status = 'paused'),
        COUNT(*) FILTER (WHERE status = 'cancelled'),
        COUNT(*) FILTER (WHERE DATE(created_at) = target_date),
        COUNT(*) FILTER (WHERE status = 'cancelled' AND DATE(updated_at) = target_date),
        COALESCE(SUM(transaction_amount), 0),
        COALESCE(SUM(transaction_amount) FILTER (WHERE status IN ('active', 'authorized')), 0),
        payment_stats.successful_payments,
        payment_stats.failed_payments,
        payment_stats.success_rate,
        COALESCE(AVG(transaction_amount) FILTER (WHERE status IN ('active', 'authorized')), 0)
    FROM unified_subscriptions
    ON CONFLICT (date) DO UPDATE SET
        total_subscriptions = EXCLUDED.total_subscriptions,
        active_subscriptions = EXCLUDED.active_subscriptions,
        paused_subscriptions = EXCLUDED.paused_subscriptions,
        cancelled_subscriptions = EXCLUDED.cancelled_subscriptions,
        new_subscriptions = EXCLUDED.new_subscriptions,
        churned_subscriptions = EXCLUDED.churned_subscriptions,
        total_revenue = EXCLUDED.total_revenue,
        recurring_revenue = EXCLUDED.recurring_revenue,
        successful_payments = EXCLUDED.successful_payments,
        failed_payments = EXCLUDED.failed_payments,
        payment_success_rate = EXCLUDED.payment_success_rate,
        average_subscription_value = EXCLUDED.average_subscription_value;
END;
$$ LANGUAGE plpgsql;

-- 15. Comentarios para documentación
COMMENT ON TABLE product_subscription_config IS 'Configuración de suscripciones por producto';
COMMENT ON TABLE subscription_metrics IS 'Métricas diarias de suscripciones para dashboard administrativo';
COMMENT ON TABLE subscription_history IS 'Historial de cambios en suscripciones para auditoría';
COMMENT ON TABLE subscription_payment_attempts IS 'Registro de intentos de pago para análisis de fallos';
COMMENT ON FUNCTION calculate_next_payment_date IS 'Calcula la próxima fecha de pago basada en frecuencia';
COMMENT ON FUNCTION update_daily_metrics IS 'Actualiza métricas diarias para dashboard administrativo';