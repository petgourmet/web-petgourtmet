-- Crear tabla para suscripciones pendientes
CREATE TABLE IF NOT EXISTS pending_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  external_reference TEXT UNIQUE NOT NULL,
  customer_data JSONB NOT NULL,
  cart_items JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  mercadopago_subscription_id TEXT,
  notes TEXT
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_pending_subscriptions_user_id ON pending_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_subscriptions_external_reference ON pending_subscriptions(external_reference);
CREATE INDEX IF NOT EXISTS idx_pending_subscriptions_status ON pending_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_pending_subscriptions_created_at ON pending_subscriptions(created_at);

-- Agregar trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_pending_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pending_subscriptions_updated_at
  BEFORE UPDATE ON pending_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_subscriptions_updated_at();

-- Agregar comentarios a la tabla
COMMENT ON TABLE pending_subscriptions IS 'Almacena suscripciones pendientes antes de ser procesadas por Mercado Pago';
COMMENT ON COLUMN pending_subscriptions.subscription_type IS 'Tipo de suscripción: weekly, biweekly, monthly, quarterly, annual';
COMMENT ON COLUMN pending_subscriptions.status IS 'Estado: pending, processing, completed, failed, cancelled';
COMMENT ON COLUMN pending_subscriptions.external_reference IS 'Referencia externa única para Mercado Pago';
COMMENT ON COLUMN pending_subscriptions.customer_data IS 'Datos del cliente en formato JSON';
COMMENT ON COLUMN pending_subscriptions.cart_items IS 'Items del carrito en formato JSON';