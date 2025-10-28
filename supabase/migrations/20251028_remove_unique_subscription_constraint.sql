-- Migración: Permitir múltiples suscripciones del mismo tipo por usuario
-- Fecha: 2025-10-28
-- Descripción: Eliminar las constraints únicas que impiden múltiples suscripciones del mismo tipo

-- 1. Eliminar las constraints únicas que impiden múltiples suscripciones activas del mismo tipo
ALTER TABLE unified_subscriptions 
DROP CONSTRAINT IF EXISTS unified_subscriptions_user_plan_active_unique;

ALTER TABLE unified_subscriptions 
DROP CONSTRAINT IF EXISTS unique_user_product_external_reference;

-- 2. Verificar que se eliminó correctamente
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE cl.relname = 'unified_subscriptions'
  AND contype = 'u'; -- Solo unique constraints

-- 3. Mostrar mensaje de confirmación
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint c
        JOIN pg_class cl ON cl.oid = c.conrelid
        WHERE cl.relname = 'unified_subscriptions' 
          AND c.conname = 'unified_subscriptions_user_plan_active_unique'
    ) THEN
        RAISE NOTICE '✅ Constraint única eliminada. Ahora los usuarios pueden tener múltiples suscripciones del mismo tipo.';
    ELSE
        RAISE NOTICE '⚠️ La constraint aún existe. Verifica manualmente.';
    END IF;
END $$;
