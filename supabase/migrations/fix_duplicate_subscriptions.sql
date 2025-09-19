-- Script para identificar y eliminar suscripciones duplicadas
-- Mantiene solo la suscripción más reciente por usuario y producto

-- Primero, identificar duplicados
WITH duplicate_subscriptions AS (
  SELECT 
    user_id,
    product_id,
    COUNT(*) as count,
    ARRAY_AGG(id ORDER BY created_at DESC) as subscription_ids
  FROM unified_subscriptions 
  WHERE user_id IS NOT NULL 
    AND product_id IS NOT NULL
    AND status IN ('active', 'pending', 'processing')
  GROUP BY user_id, product_id
  HAVING COUNT(*) > 1
),
subscriptions_to_delete AS (
  SELECT 
    unnest(subscription_ids[2:]) as id_to_delete,
    user_id,
    product_id
  FROM duplicate_subscriptions
)
-- Marcar suscripciones duplicadas como canceladas en lugar de eliminarlas
UPDATE unified_subscriptions 
SET 
  status = 'duplicate_cancelled',
  cancelled_at = NOW(),
  reason = 'Suscripción duplicada - cancelada automáticamente',
  updated_at = NOW()
WHERE id IN (SELECT id_to_delete FROM subscriptions_to_delete);

-- Mostrar estadísticas de limpieza
SELECT 
  'Suscripciones marcadas como duplicate_cancelled' as action,
  COUNT(*) as count
FROM unified_subscriptions 
WHERE status = 'duplicate_cancelled' 
  AND reason = 'Suscripción duplicada - cancelada automáticamente';

-- Crear índice único para prevenir duplicados futuros
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_subscription 
ON unified_subscriptions (user_id, product_id) 
WHERE status IN ('active', 'pending', 'processing');

-- Función para prevenir duplicados en inserts/updates
CREATE OR REPLACE FUNCTION prevent_duplicate_subscriptions()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo aplicar para suscripciones activas/pendientes/procesando
  IF NEW.status IN ('active', 'pending', 'processing') AND NEW.user_id IS NOT NULL AND NEW.product_id IS NOT NULL THEN
    -- Verificar si ya existe una suscripción activa para este usuario y producto
    IF EXISTS (
      SELECT 1 FROM unified_subscriptions 
      WHERE user_id = NEW.user_id 
        AND product_id = NEW.product_id 
        AND status IN ('active', 'pending', 'processing')
        AND id != COALESCE(NEW.id, 0)
    ) THEN
      RAISE EXCEPTION 'Ya existe una suscripción activa para este usuario y producto. User ID: %, Product ID: %', NEW.user_id, NEW.product_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para prevenir duplicados
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_subscriptions ON unified_subscriptions;
CREATE TRIGGER trigger_prevent_duplicate_subscriptions
  BEFORE INSERT OR UPDATE ON unified_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_subscriptions();

-- Verificar que no queden duplicados activos
SELECT 
  user_id,
  product_id,
  COUNT(*) as active_subscriptions,
  ARRAY_AGG(id) as subscription_ids
FROM unified_subscriptions 
WHERE user_id IS NOT NULL 
  AND product_id IS NOT NULL
  AND status IN ('active', 'pending', 'processing')
GROUP BY user_id, product_id
HAVING COUNT(*) > 1;