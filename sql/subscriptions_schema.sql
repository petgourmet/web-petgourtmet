-- Crear tabla de suscripciones
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    mercadopago_subscription_id TEXT UNIQUE,
    mercadopago_plan_id TEXT,
    
    -- Información de la suscripción
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'paused', 'cancelled', 'error')),
    frequency INTEGER NOT NULL DEFAULT 1,
    frequency_type TEXT NOT NULL DEFAULT 'months' CHECK (frequency_type IN ('days', 'weeks', 'months')),
    
    -- Información de pago
    amount DECIMAL(10,2) NOT NULL,
    currency_id TEXT NOT NULL DEFAULT 'MXN',
    
    -- Fechas importantes
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    next_payment_date TIMESTAMP WITH TIME ZONE,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    
    -- Configuración
    auto_recurring BOOLEAN DEFAULT true,
    max_charges INTEGER,
    charges_made INTEGER DEFAULT 0,
    
    -- Información adicional
    external_reference TEXT,
    reason TEXT,
    back_url TEXT,
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de pagos de suscripciones
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

-- Crear tabla de notificaciones programadas
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_next_payment ON user_subscriptions(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_for ON scheduled_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_subscriptions_updated_at 
    BEFORE UPDATE ON user_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_payments_updated_at 
    BEFORE UPDATE ON subscription_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_notifications_updated_at 
    BEFORE UPDATE ON scheduled_notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para user_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas de seguridad para subscription_payments
CREATE POLICY "Users can view their subscription payments" ON subscription_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions 
            WHERE user_subscriptions.id = subscription_payments.subscription_id 
            AND user_subscriptions.user_id = auth.uid()
        )
    );

-- Políticas de seguridad para scheduled_notifications
CREATE POLICY "Users can view their subscription notifications" ON scheduled_notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions 
            WHERE user_subscriptions.id = scheduled_notifications.subscription_id 
            AND user_subscriptions.user_id = auth.uid()
        )
    );

-- Comentarios
COMMENT ON TABLE user_subscriptions IS 'Almacena las suscripciones de usuarios con MercadoPago';
COMMENT ON TABLE subscription_payments IS 'Historial de pagos de suscripciones';
COMMENT ON TABLE scheduled_notifications IS 'Notificaciones programadas para suscripciones';
