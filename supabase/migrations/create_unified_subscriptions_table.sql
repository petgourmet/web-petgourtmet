-- Crear tabla unificada 'unified_subscriptions' que combina pending_subscriptions y user_subscriptions
CREATE TABLE unified_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  
  -- Campos comunes
  subscription_type VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'pending',
  external_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Campos de pending_subscriptions
  customer_data JSONB,
  cart_items JSONB,
  processed_at TIMESTAMPTZ,
  notes TEXT,
  
  -- Campos de user_subscriptions
  product_id INTEGER,
  quantity INTEGER DEFAULT 1,
  size VARCHAR,
  discount_percentage NUMERIC DEFAULT 0,
  base_price NUMERIC,
  discounted_price NUMERIC,
  next_billing_date TIMESTAMPTZ,
  last_billing_date TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  product_name VARCHAR,
  product_image TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Campos de MercadoPago
  mercadopago_subscription_id TEXT,
  mercadopago_plan_id TEXT,
  reason TEXT,
  charges_made INTEGER DEFAULT 0,
  frequency INTEGER DEFAULT 1,
  frequency_type TEXT DEFAULT 'months',
  version INTEGER,
  application_id BIGINT,
  collector_id BIGINT,
  preapproval_plan_id TEXT,
  back_url TEXT,
  init_point TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  currency_id VARCHAR DEFAULT 'MXN',
  transaction_amount NUMERIC,
  free_trial JSONB,
  
  -- Campos de estado avanzado
  paused_at TIMESTAMPTZ,
  resumed_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ
);

-- Agregar constraints después de crear la tabla
ALTER TABLE unified_subscriptions ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'active', 'paused', 'expired', 'suspended'));
ALTER TABLE unified_subscriptions ADD CONSTRAINT valid_subscription_type CHECK (subscription_type IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual'));
ALTER TABLE unified_subscriptions ADD CONSTRAINT valid_frequency_type CHECK (frequency_type IS NULL OR frequency_type IN ('days', 'weeks', 'months'));
ALTER TABLE unified_subscriptions ADD CONSTRAINT valid_quantity CHECK (quantity > 0);
ALTER TABLE unified_subscriptions ADD CONSTRAINT valid_discount CHECK (discount_percentage IS NULL OR (discount_percentage >= 0 AND discount_percentage <= 100));

-- Agregar foreign keys después
ALTER TABLE unified_subscriptions ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE unified_subscriptions ADD CONSTRAINT fk_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- Crear índices
CREATE INDEX idx_unified_subscriptions_user_id ON unified_subscriptions(user_id);
CREATE INDEX idx_unified_subscriptions_status ON unified_subscriptions(status);
CREATE INDEX idx_unified_subscriptions_external_ref ON unified_subscriptions(external_reference);
CREATE INDEX idx_unified_subscriptions_mercadopago_id ON unified_subscriptions(mercadopago_subscription_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_unified_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_unified_subscriptions_updated_at
    BEFORE UPDATE ON unified_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_unified_subscriptions_updated_at();

-- Habilitar RLS
ALTER TABLE unified_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo vean sus propias suscripciones
CREATE POLICY "Users can view own unified_subscriptions" ON unified_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own unified_subscriptions" ON unified_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own unified_subscriptions" ON unified_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Comentarios para documentación
COMMENT ON TABLE unified_subscriptions IS 'Tabla unificada que combina pending_subscriptions y user_subscriptions';
COMMENT ON COLUMN unified_subscriptions.external_reference IS 'Referencia externa única para identificar la suscripción';
COMMENT ON COLUMN unified_subscriptions.status IS 'Estado de la suscripción: pending, processing, completed, failed, cancelled, active, paused, expired, suspended';
COMMENT ON COLUMN unified_subscriptions.subscription_type IS 'Tipo de suscripción: weekly, biweekly, monthly, quarterly, semiannual, annual';