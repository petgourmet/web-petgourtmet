-- ================================================
-- Actualizar constraint de status para incluir canceled
-- ================================================

-- Eliminar el constraint antiguo
ALTER TABLE unified_subscriptions 
DROP CONSTRAINT IF EXISTS valid_status;

-- Crear nuevo constraint con todos los estados posibles
ALTER TABLE unified_subscriptions
ADD CONSTRAINT valid_status CHECK (
  status IN ('active', 'paused', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid')
);

COMMENT ON CONSTRAINT valid_status ON unified_subscriptions IS 'Estados válidos de suscripción: active, paused, canceled, past_due, trialing, incomplete, incomplete_expired, unpaid';
