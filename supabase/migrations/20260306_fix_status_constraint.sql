-- ================================================
-- Actualizar constraint de status para incluir 'cancelled' (British)
-- Stripe usa 'canceled' (American), el codebase usa 'cancelled' (British)
-- Se aceptan ambas variantes para evitar errores
-- ================================================

-- Eliminar el constraint antiguo
ALTER TABLE unified_subscriptions 
DROP CONSTRAINT IF EXISTS valid_status;

-- Crear nuevo constraint con ambas variantes de spelling
ALTER TABLE unified_subscriptions
ADD CONSTRAINT valid_status CHECK (
  status IN ('active', 'paused', 'canceled', 'cancelled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid', 'pending')
);

COMMENT ON CONSTRAINT valid_status ON unified_subscriptions IS 'Estados válidos de suscripción. Acepta canceled y cancelled para compatibilidad Stripe/codebase.';
