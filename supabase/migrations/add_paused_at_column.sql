-- ================================================
-- Agregar columnas para gestión de suscripciones
-- ================================================

ALTER TABLE unified_subscriptions
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

COMMENT ON COLUMN unified_subscriptions.paused_at IS 'Fecha en que la suscripción fue pausada';
COMMENT ON COLUMN unified_subscriptions.canceled_at IS 'Fecha en que la suscripción fue cancelada';
