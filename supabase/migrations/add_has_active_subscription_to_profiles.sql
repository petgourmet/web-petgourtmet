-- Agregar columna has_active_subscription a la tabla profiles
ALTER TABLE profiles ADD COLUMN has_active_subscription BOOLEAN DEFAULT FALSE;

-- Actualizar permisos para la nueva columna
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;

-- Crear índice para mejorar el rendimiento de consultas
CREATE INDEX idx_profiles_has_active_subscription ON profiles(has_active_subscription);

-- Actualizar usuarios que ya tienen suscripciones activas
UPDATE profiles 
SET has_active_subscription = TRUE 
WHERE id IN (
    SELECT DISTINCT user_id 
    FROM unified_subscriptions 
    WHERE status = 'active' AND user_id IS NOT NULL
);