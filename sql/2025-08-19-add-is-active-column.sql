
-- Migración para agregar columna is_active a user_subscriptions
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar la columna is_active
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Actualizar valores existentes basados en el status
UPDATE user_subscriptions 
SET is_active = CASE 
  WHEN status = 'active' THEN true
  WHEN status = 'cancelled' THEN false
  WHEN status = 'paused' THEN false
  WHEN status = 'inactive' THEN false
  ELSE true
END;

-- 3. Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_is_active 
ON user_subscriptions(is_active);

-- 4. Crear índice compuesto para consultas optimizadas
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_active 
ON user_subscriptions(user_id, is_active);

-- 5. Verificar que la migración funcionó
SELECT 
  status,
  is_active,
  COUNT(*) as count
FROM user_subscriptions 
GROUP BY status, is_active
ORDER BY status;
