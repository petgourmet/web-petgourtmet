-- Tabla para registrar pagos de suscripciones
-- Cada vez que MercadoPago procesa un pago, se registra aquí
-- Esto permite llevar un historial completo de pagos y calcular la próxima fecha

CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES unified_subscriptions(id) ON DELETE CASCADE,
  mercadopago_payment_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MXN',
  status VARCHAR(50) NOT NULL, -- 'approved', 'pending', 'rejected', 'refunded'
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  next_billing_date TIMESTAMP WITH TIME ZONE, -- Calculada al recibir el pago
  transaction_details JSONB, -- Detalles completos del webhook
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id 
  ON subscription_payments(subscription_id);
  
CREATE INDEX IF NOT EXISTS idx_subscription_payments_mercadopago_id 
  ON subscription_payments(mercadopago_payment_id);
  
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status 
  ON subscription_payments(status);
  
CREATE INDEX IF NOT EXISTS idx_subscription_payments_payment_date 
  ON subscription_payments(payment_date DESC);

-- Agregar campos faltantes a unified_subscriptions si no existen
ALTER TABLE unified_subscriptions 
  ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS total_payments_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount_paid DECIMAL(10, 2) DEFAULT 0;

-- Crear índice para next_billing_date
CREATE INDEX IF NOT EXISTS idx_unified_subscriptions_next_billing 
  ON unified_subscriptions(next_billing_date) 
  WHERE status IN ('active', 'authorized');

-- Función para actualizar automáticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para subscription_payments
DROP TRIGGER IF EXISTS update_subscription_payments_updated_at ON subscription_payments;
CREATE TRIGGER update_subscription_payments_updated_at
  BEFORE UPDATE ON subscription_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE subscription_payments IS 'Registro de todos los pagos de suscripciones procesados por MercadoPago';
COMMENT ON COLUMN subscription_payments.next_billing_date IS 'Fecha calculada del próximo cobro al momento de procesar este pago';
COMMENT ON COLUMN unified_subscriptions.last_payment_date IS 'Fecha del último pago exitoso recibido';
COMMENT ON COLUMN unified_subscriptions.next_billing_date IS 'Fecha del próximo cobro programado (actualizada con cada pago)';
