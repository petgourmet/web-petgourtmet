-- Crear tabla de notificaciones de suscripciones si no existe
CREATE TABLE IF NOT EXISTS subscription_notifications (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT NOT NULL REFERENCES unified_subscriptions(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  admin_email VARCHAR(255) DEFAULT 'contacto@petgourmet.mx',
  notification_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_subscription_notifications_subscription_id ON subscription_notifications(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_notifications_sent ON subscription_notifications(notification_sent);
CREATE INDEX IF NOT EXISTS idx_subscription_notifications_created_at ON subscription_notifications(created_at);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_subscription_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_subscription_notifications_updated_at ON subscription_notifications;
CREATE TRIGGER trigger_update_subscription_notifications_updated_at
  BEFORE UPDATE ON subscription_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_notifications_updated_at();

-- Función para registrar cambios de estado en suscripciones
CREATE OR REPLACE FUNCTION log_subscription_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email VARCHAR(255);
BEGIN
  -- Solo procesar si el estado ha cambiado
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Extraer email del customer_data
    BEGIN
      v_user_email := (NEW.customer_data::json->>'email')::VARCHAR(255);
    EXCEPTION WHEN OTHERS THEN
      v_user_email := 'no-email@petgourmet.mx';
    END;
    
    -- Insertar notificación pendiente
    INSERT INTO subscription_notifications (
      subscription_id,
      old_status,
      new_status,
      user_email,
      admin_email
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      v_user_email,
      'contacto@petgourmet.mx'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en unified_subscriptions
DROP TRIGGER IF EXISTS trigger_log_subscription_status_change ON unified_subscriptions;
CREATE TRIGGER trigger_log_subscription_status_change
  AFTER UPDATE ON unified_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION log_subscription_status_change();

-- Comentarios para documentación
COMMENT ON TABLE subscription_notifications IS 'Registra cambios de estado en suscripciones para envío de notificaciones por email';
COMMENT ON COLUMN subscription_notifications.subscription_id IS 'ID de la suscripción en unified_subscriptions';
COMMENT ON COLUMN subscription_notifications.old_status IS 'Estado anterior de la suscripción';
COMMENT ON COLUMN subscription_notifications.new_status IS 'Nuevo estado de la suscripción';
COMMENT ON COLUMN subscription_notifications.notification_sent IS 'Indica si el correo fue enviado exitosamente';
COMMENT ON COLUMN subscription_notifications.retry_count IS 'Número de intentos de envío de correo';
