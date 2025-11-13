-- ================================================
-- Tabla: subscription_payments
-- ================================================
-- Historial de pagos de suscripciones

CREATE TABLE IF NOT EXISTS subscription_payments (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Información del pago
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MXN',
  status VARCHAR(50) NOT NULL, -- 'succeeded', 'failed', 'pending', 'refunded'
  payment_date TIMESTAMPTZ NOT NULL,
  
  -- IDs de Stripe
  stripe_invoice_id VARCHAR(255) UNIQUE,
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  
  -- Período cubierto por este pago
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  
  -- Detalles adicionales
  failure_message TEXT,
  failure_code VARCHAR(100),
  
  -- Metadatos
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key
  CONSTRAINT fk_subscription
    FOREIGN KEY (subscription_id)
    REFERENCES unified_subscriptions(id)
    ON DELETE CASCADE
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_subscription_payments_subscription_id ON subscription_payments(subscription_id);
CREATE INDEX idx_subscription_payments_user_id ON subscription_payments(user_id);
CREATE INDEX idx_subscription_payments_stripe_invoice_id ON subscription_payments(stripe_invoice_id);
CREATE INDEX idx_subscription_payments_payment_date ON subscription_payments(payment_date DESC);
CREATE INDEX idx_subscription_payments_status ON subscription_payments(status);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_subscription_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_payments_updated_at
  BEFORE UPDATE ON subscription_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_payments_updated_at();

-- RLS Policies
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver sus propios pagos
CREATE POLICY "Users can view their own subscription payments"
  ON subscription_payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Solo el servicio puede insertar/actualizar
CREATE POLICY "Service role can manage all subscription payments"
  ON subscription_payments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comentarios
COMMENT ON TABLE subscription_payments IS 'Historial de pagos de suscripciones';
COMMENT ON COLUMN subscription_payments.status IS 'succeeded, failed, pending, refunded';
COMMENT ON COLUMN subscription_payments.period_start IS 'Inicio del período cubierto por este pago';
COMMENT ON COLUMN subscription_payments.period_end IS 'Fin del período cubierto por este pago';
