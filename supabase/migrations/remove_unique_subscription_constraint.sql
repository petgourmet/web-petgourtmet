-- ================================================
-- Eliminar constraint único de suscripciones
-- ================================================
-- Permite que un usuario tenga múltiples suscripciones del mismo tipo

-- Eliminar el constraint único que impide múltiples suscripciones del mismo tipo
DROP INDEX IF EXISTS unified_subscriptions_user_plan_active_unique;

-- Verificar que se eliminó correctamente
-- Si existe como constraint, también eliminarlo
ALTER TABLE unified_subscriptions 
DROP CONSTRAINT IF EXISTS unified_subscriptions_user_plan_active_unique;

COMMENT ON TABLE unified_subscriptions IS 'Tabla de suscripciones - Un usuario puede tener múltiples suscripciones del mismo tipo';
