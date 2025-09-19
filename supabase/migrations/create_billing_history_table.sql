-- Crear tabla billing_history para el historial de facturación
CREATE TABLE IF NOT EXISTS public.billing_history (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES public.unified_subscriptions(id) ON DELETE CASCADE,
    payment_id TEXT,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MXN',
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
    payment_method VARCHAR(100),
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mercadopago_payment_id TEXT,
    mercadopago_status VARCHAR(50),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_billing_history_subscription_id ON public.billing_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_status ON public.billing_history(status);
CREATE INDEX IF NOT EXISTS idx_billing_history_transaction_date ON public.billing_history(transaction_date);
CREATE INDEX IF NOT EXISTS idx_billing_history_mercadopago_payment_id ON public.billing_history(mercadopago_payment_id);

-- Habilitar RLS
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

-- Política para usuarios autenticados (pueden ver su propio historial)
CREATE POLICY "Users can view their own billing history" ON public.billing_history
    FOR SELECT USING (
        subscription_id IN (
            SELECT id FROM public.unified_subscriptions 
            WHERE user_id = auth.uid()
        )
    );

-- Política para administradores (pueden ver todo)
CREATE POLICY "Admins can view all billing history" ON public.billing_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Otorgar permisos a los roles
GRANT SELECT ON public.billing_history TO anon;
GRANT ALL PRIVILEGES ON public.billing_history TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE billing_history_id_seq TO authenticated;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_billing_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_billing_history_updated_at
    BEFORE UPDATE ON public.billing_history
    FOR EACH ROW
    EXECUTE FUNCTION update_billing_history_updated_at();

COMMENT ON TABLE public.billing_history IS 'Historial de facturación y pagos de suscripciones';
COMMENT ON COLUMN public.billing_history.subscription_id IS 'ID de la suscripción relacionada';
COMMENT ON COLUMN public.billing_history.payment_id IS 'ID interno del pago';
COMMENT ON COLUMN public.billing_history.amount IS 'Monto del pago';
COMMENT ON COLUMN public.billing_history.status IS 'Estado del pago';
COMMENT ON COLUMN public.billing_history.mercadopago_payment_id IS 'ID del pago en MercadoPago';
COMMENT ON COLUMN public.billing_history.metadata IS 'Datos adicionales del pago en formato JSON';