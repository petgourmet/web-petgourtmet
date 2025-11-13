-- ================================================
-- Agregar columnas para gestión de suscripciones
-- ================================================

ALTER TABLE unified_subscriptions
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

COMMENT ON COLUMN unified_subscriptions.paused_at IS 'Fecha en que la suscripción fue pausada';
