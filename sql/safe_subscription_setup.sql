-- Script SEGURO para agregar solo las funcionalidades faltantes
-- Ejecutar paso a paso y verificar cada sección

-- ============================================================================
-- PASO 1: Verificar y agregar columnas faltantes a user_subscriptions
-- ============================================================================

-- Verificar qué columnas existen actualmente
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'user_subscriptions' ORDER BY column_name;

-- Solo agregar las columnas que realmente falten:
DO $$ 
BEGIN
    -- Verificar y agregar mercadopago_subscription_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_subscriptions' AND column_name = 'mercadopago_subscription_id') THEN
        ALTER TABLE user_subscriptions ADD COLUMN mercadopago_subscription_id TEXT UNIQUE;
    END IF;
    
    -- Verificar y agregar mercadopago_plan_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_subscriptions' AND column_name = 'mercadopago_plan_id') THEN
        ALTER TABLE user_subscriptions ADD COLUMN mercadopago_plan_id TEXT;
    END IF;
    
    -- Verificar y agregar next_payment_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_subscriptions' AND column_name = 'next_payment_date') THEN
        ALTER TABLE user_subscriptions ADD COLUMN next_payment_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Verificar y agregar last_payment_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_subscriptions' AND column_name = 'last_payment_date') THEN
        ALTER TABLE user_subscriptions ADD COLUMN last_payment_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Verificar y agregar charges_made
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_subscriptions' AND column_name = 'charges_made') THEN
        ALTER TABLE user_subscriptions ADD COLUMN charges_made INTEGER DEFAULT 0;
    END IF;
    
    -- Verificar y agregar external_reference
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_subscriptions' AND column_name = 'external_reference') THEN
        ALTER TABLE user_subscriptions ADD COLUMN external_reference TEXT;
    END IF;
    
    -- Verificar y agregar reason
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_subscriptions' AND column_name = 'reason') THEN
        ALTER TABLE user_subscriptions ADD COLUMN reason TEXT;
    END IF;
    
    RAISE NOTICE 'Columnas de user_subscriptions verificadas y agregadas si faltaban';
END $$;

-- ============================================================================
-- PASO 2: Crear tabla subscription_payments (si no existe)
-- ============================================================================

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

-- ============================================================================
-- PASO 3: Crear tabla scheduled_notifications (si no existe)
-- ============================================================================

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

-- ============================================================================
-- PASO 4: Crear índices necesarios
-- ============================================================================

-- Índices para user_subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_mercadopago ON user_subscriptions(mercadopago_subscription_id) WHERE mercadopago_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_next_payment ON user_subscriptions(next_payment_date) WHERE next_payment_date IS NOT NULL;

-- Índices para subscription_payments
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_date ON subscription_payments(payment_date) WHERE payment_date IS NOT NULL;

-- Índices para scheduled_notifications
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_for ON scheduled_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status);

-- ============================================================================
-- PASO 5: Configurar RLS y políticas de seguridad
-- ============================================================================

-- Habilitar RLS en las nuevas tablas
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para subscription_payments
DROP POLICY IF EXISTS "Users can view their subscription payments" ON subscription_payments;
CREATE POLICY "Users can view their subscription payments" ON subscription_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions 
            WHERE user_subscriptions.id = subscription_payments.subscription_id 
            AND user_subscriptions.user_id = auth.uid()
        )
    );

-- Política para que el sistema pueda gestionar pagos
DROP POLICY IF EXISTS "Service can manage subscription payments" ON subscription_payments;
CREATE POLICY "Service can manage subscription payments" ON subscription_payments
    FOR ALL USING (true);

-- Políticas para scheduled_notifications
DROP POLICY IF EXISTS "Users can view their subscription notifications" ON scheduled_notifications;
CREATE POLICY "Users can view their subscription notifications" ON scheduled_notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions 
            WHERE user_subscriptions.id = scheduled_notifications.subscription_id 
            AND user_subscriptions.user_id = auth.uid()
        )
    );

-- Política para que el sistema pueda gestionar notificaciones
DROP POLICY IF EXISTS "Service can manage notifications" ON scheduled_notifications;
CREATE POLICY "Service can manage notifications" ON scheduled_notifications
    FOR ALL USING (true);

-- ============================================================================
-- PASO 6: Agregar triggers para updated_at
-- ============================================================================

-- Función para actualizar updated_at (si no existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para las nuevas tablas
DROP TRIGGER IF EXISTS update_subscription_payments_updated_at ON subscription_payments;
CREATE TRIGGER update_subscription_payments_updated_at 
    BEFORE UPDATE ON subscription_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scheduled_notifications_updated_at ON scheduled_notifications;
CREATE TRIGGER update_scheduled_notifications_updated_at 
    BEFORE UPDATE ON scheduled_notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PASO 7: Comentarios y documentación
-- ============================================================================

COMMENT ON TABLE subscription_payments IS 'Historial detallado de pagos de suscripciones con MercadoPago';
COMMENT ON TABLE scheduled_notifications IS 'Sistema de notificaciones programadas para suscripciones';

-- ============================================================================
-- PASO 8: Verificación final
-- ============================================================================

-- Consulta para verificar que todo se creó correctamente
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICACIÓN FINAL ===';
    
    -- Verificar tablas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_payments') THEN
        RAISE NOTICE '✅ Tabla subscription_payments existe';
    ELSE
        RAISE NOTICE '❌ Tabla subscription_payments NO existe';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_notifications') THEN
        RAISE NOTICE '✅ Tabla scheduled_notifications existe';
    ELSE
        RAISE NOTICE '❌ Tabla scheduled_notifications NO existe';
    END IF;
    
    -- Verificar columnas críticas en user_subscriptions
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'mercadopago_subscription_id') THEN
        RAISE NOTICE '✅ Columna mercadopago_subscription_id existe';
    ELSE
        RAISE NOTICE '❌ Columna mercadopago_subscription_id NO existe';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'next_payment_date') THEN
        RAISE NOTICE '✅ Columna next_payment_date existe';
    ELSE
        RAISE NOTICE '❌ Columna next_payment_date NO existe';
    END IF;
    
    RAISE NOTICE '=== FIN VERIFICACIÓN ===';
END $$;
