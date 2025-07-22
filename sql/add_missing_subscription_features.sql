-- Script para AGREGAR columnas faltantes y tablas necesarias
-- Basado en el análisis de tablas existentes en Supabase

-- 1. Agregar columnas faltantes a user_subscriptions (si no existen)
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS mercadopago_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS mercadopago_plan_id TEXT,
ADD COLUMN IF NOT EXISTS frequency INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS frequency_type TEXT DEFAULT 'months' CHECK (frequency_type IN ('days', 'weeks', 'months')),
ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS currency_id TEXT DEFAULT 'MXN',
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_recurring BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS max_charges INTEGER,
ADD COLUMN IF NOT EXISTS charges_made INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS external_reference TEXT,
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS back_url TEXT;

-- 2. Crear tabla subscription_payments (si no existe)
CREATE TABLE IF NOT EXISTS subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    mercadopago_payment_id TEXT UNIQUE,
    
    -- Información del pago
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'in_process', 'rejected', 'cancelled', 'refunded', 'charged_back')),
    amount DECIMAL(10,2) NOT NULL,
    currency_id TEXT NOT NULL DEFAULT 'MXN',
    
    -- Fechas
    payment_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Información adicional
    external_reference TEXT,
    payment_method_id TEXT,
    transaction_amount DECIMAL(10,2),
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear tabla scheduled_notifications (si no existe)
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    
    -- Tipo de notificación
    notification_type TEXT NOT NULL CHECK (notification_type IN ('payment_reminder', 'payment_success', 'payment_failed', 'subscription_cancelled')),
    
    -- Configuración de tiempo
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Estado
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    
    -- Contenido
    recipient_email TEXT NOT NULL,
    subject TEXT,
    message_template TEXT,
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Agregar columnas a orders para mejor tracking de suscripciones
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS has_subscription BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_frequency TEXT,
ADD COLUMN IF NOT EXISTS subscription_discount DECIMAL(5,2);

-- 5. Crear índices necesarios
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_next_payment ON user_subscriptions(next_payment_date) WHERE next_payment_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_mercadopago ON user_subscriptions(mercadopago_subscription_id) WHERE mercadopago_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_date ON subscription_payments(payment_date) WHERE payment_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_for ON scheduled_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_type ON scheduled_notifications(notification_type);

-- 6. Triggers para updated_at en nuevas tablas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers a las nuevas tablas
CREATE TRIGGER IF NOT EXISTS update_subscription_payments_updated_at 
    BEFORE UPDATE ON subscription_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_scheduled_notifications_updated_at 
    BEFORE UPDATE ON scheduled_notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. RLS (Row Level Security) para nuevas tablas
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para subscription_payments
CREATE POLICY IF NOT EXISTS "Users can view their subscription payments" ON subscription_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions 
            WHERE user_subscriptions.id = subscription_payments.subscription_id 
            AND user_subscriptions.user_id = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Service can manage subscription payments" ON subscription_payments
    FOR ALL USING (true);

-- Políticas de seguridad para scheduled_notifications
CREATE POLICY IF NOT EXISTS "Users can view their subscription notifications" ON scheduled_notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions 
            WHERE user_subscriptions.id = scheduled_notifications.subscription_id 
            AND user_subscriptions.user_id = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Service can manage notifications" ON scheduled_notifications
    FOR ALL USING (true);

-- 8. Comentarios para documentación
COMMENT ON TABLE subscription_payments IS 'Historial detallado de pagos de suscripciones con MercadoPago';
COMMENT ON TABLE scheduled_notifications IS 'Sistema de notificaciones programadas para suscripciones (recordatorios, confirmaciones)';

COMMENT ON COLUMN user_subscriptions.mercadopago_subscription_id IS 'ID de la suscripción en MercadoPago';
COMMENT ON COLUMN user_subscriptions.next_payment_date IS 'Fecha del próximo cargo automático';
COMMENT ON COLUMN user_subscriptions.charges_made IS 'Número de cargos realizados hasta ahora';

-- 9. Datos de prueba para subscription_config (si está vacía)
INSERT INTO subscription_config (period, default_discount_percentage, is_active) 
VALUES 
    ('weekly', 5, true),
    ('monthly', 10, true),
    ('quarterly', 15, true)
ON CONFLICT DO NOTHING;

-- 10. Función para limpiar notificaciones antiguas (maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM scheduled_notifications 
    WHERE sent_at < NOW() - INTERVAL '30 days'
    AND status = 'sent';
    
    DELETE FROM subscription_payments 
    WHERE created_at < NOW() - INTERVAL '2 years'
    AND status IN ('rejected', 'cancelled');
END;
$$ LANGUAGE plpgsql;

-- 11. Vista para reportes de suscripciones
CREATE OR REPLACE VIEW subscription_summary AS
SELECT 
    us.id,
    us.user_id,
    us.product_id,
    p.name as product_name,
    us.status,
    us.amount,
    us.frequency,
    us.frequency_type,
    us.next_payment_date,
    us.charges_made,
    us.created_at,
    COUNT(sp.id) as total_payments,
    SUM(CASE WHEN sp.status = 'approved' THEN sp.amount ELSE 0 END) as total_paid
FROM user_subscriptions us
LEFT JOIN products p ON us.product_id = p.id
LEFT JOIN subscription_payments sp ON us.id = sp.subscription_id
GROUP BY us.id, p.name;

COMMENT ON VIEW subscription_summary IS 'Vista resumen para dashboards y reportes de suscripciones';
