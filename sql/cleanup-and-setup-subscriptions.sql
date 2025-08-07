-- Script para limpiar datos de prueba y configurar tablas de suscripciones

-- 1. Crear tabla user_subscriptions si no existe
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  subscription_type VARCHAR(50) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  size VARCHAR(50),
  next_billing_date TIMESTAMPTZ,
  last_billing_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  mercadopago_subscription_id TEXT,
  external_reference TEXT,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  frequency INTEGER DEFAULT 1,
  frequency_type VARCHAR(20) DEFAULT 'months'
);

-- 2. Crear índices para user_subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_next_billing ON user_subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_external_ref ON user_subscriptions(external_reference);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_mercadopago_id ON user_subscriptions(mercadopago_subscription_id);

-- 3. Crear trigger para actualizar updated_at en user_subscriptions
CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_subscriptions_updated_at();

-- 4. Crear tabla subscription_payments para historial de pagos
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  billing_date TIMESTAMPTZ NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(50),
  mercadopago_payment_id TEXT,
  collection_id TEXT,
  external_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 5. Crear índices para subscription_payments
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_billing_date ON subscription_payments(billing_date);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_mercadopago_id ON subscription_payments(mercadopago_payment_id);

-- 6. Limpiar datos de prueba
-- Eliminar órdenes de prueba (que contengan 'test' en el nombre o email)
DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE 
    customer_name ILIKE '%test%' OR 
    customer_email ILIKE '%test%' OR
    order_number ILIKE '%test%' OR
    status = 'test'
);

DELETE FROM orders WHERE 
  customer_name ILIKE '%test%' OR 
  customer_email ILIKE '%test%' OR
  order_number ILIKE '%test%' OR
  status = 'test';

-- Eliminar suscripciones pendientes de prueba
DELETE FROM pending_subscriptions WHERE 
  external_reference ILIKE '%test%' OR
  status = 'test' OR
  customer_data::text ILIKE '%test%';

-- Eliminar suscripciones de usuario de prueba
DELETE FROM subscription_payments WHERE subscription_id IN (
  SELECT id FROM user_subscriptions WHERE 
    external_reference ILIKE '%test%' OR
    status = 'test'
);

DELETE FROM user_subscriptions WHERE 
  external_reference ILIKE '%test%' OR
  status = 'test';

-- 7. Comentarios para documentar las tablas
COMMENT ON TABLE user_subscriptions IS 'Suscripciones activas de usuarios';
COMMENT ON COLUMN user_subscriptions.status IS 'Estado: pending, authorized, paused, cancelled';
COMMENT ON COLUMN user_subscriptions.subscription_type IS 'Tipo: weekly, biweekly, monthly, quarterly, annual';
COMMENT ON COLUMN user_subscriptions.frequency IS 'Frecuencia numérica del pago';
COMMENT ON COLUMN user_subscriptions.frequency_type IS 'Tipo de frecuencia: days, months';

COMMENT ON TABLE subscription_payments IS 'Historial de pagos de suscripciones';
COMMENT ON COLUMN subscription_payments.status IS 'Estado: pending, approved, rejected, cancelled';

-- 8. Actualizar database.types.ts será necesario después de ejecutar este script

SELECT 'Script de limpieza y configuración completado exitosamente' AS resultado;