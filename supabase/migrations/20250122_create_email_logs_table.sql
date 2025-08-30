-- Crear tabla email_logs para registrar el envío de emails
CREATE TABLE IF NOT EXISTS email_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  subscription_id BIGINT REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  email_type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  external_id VARCHAR(255), -- ID del proveedor de email (ej: Resend)
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_order_id ON email_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_subscription_id ON email_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_email ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_email_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_email_logs_updated_at
  BEFORE UPDATE ON email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_email_logs_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo puedan ver sus propios logs de email
CREATE POLICY "Users can view their own email logs" ON email_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política para que el servicio pueda insertar logs de email
CREATE POLICY "Service can insert email logs" ON email_logs
  FOR INSERT
  WITH CHECK (true);

-- Política para que el servicio pueda actualizar logs de email
CREATE POLICY "Service can update email logs" ON email_logs
  FOR UPDATE
  USING (true);

-- Comentarios para documentar la tabla
COMMENT ON TABLE email_logs IS 'Registro de emails enviados por el sistema';
COMMENT ON COLUMN email_logs.user_id IS 'ID del usuario destinatario (opcional)';
COMMENT ON COLUMN email_logs.order_id IS 'ID de la orden relacionada (opcional)';
COMMENT ON COLUMN email_logs.subscription_id IS 'ID de la suscripción relacionada (opcional)';
COMMENT ON COLUMN email_logs.email_type IS 'Tipo de email (order_confirmation, subscription_thank_you, etc.)';
COMMENT ON COLUMN email_logs.recipient_email IS 'Email del destinatario';
COMMENT ON COLUMN email_logs.subject IS 'Asunto del email';
COMMENT ON COLUMN email_logs.status IS 'Estado del envío (sent, failed, pending)';
COMMENT ON COLUMN email_logs.external_id IS 'ID del proveedor de email externo';
COMMENT ON COLUMN email_logs.error_message IS 'Mensaje de error si el envío falló';
COMMENT ON COLUMN email_logs.sent_at IS 'Fecha y hora del envío';

-- Otorgar permisos a los roles necesarios
GRANT SELECT ON email_logs TO authenticated;
GRANT ALL PRIVILEGES ON email_logs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE email_logs_id_seq TO authenticated;
GRANT ALL PRIVILEGES ON SEQUENCE email_logs_id_seq TO service_role