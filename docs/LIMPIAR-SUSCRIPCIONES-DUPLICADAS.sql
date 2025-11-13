-- ================================================
-- Script: Limpiar Suscripciones Duplicadas
-- ================================================
-- Este script elimina suscripciones duplicadas manteniendo
-- solo la más reciente de cada stripe_subscription_id

-- ANTES DE EJECUTAR: Hacer un backup de la tabla
-- CREATE TABLE unified_subscriptions_backup AS SELECT * FROM unified_subscriptions;

-- ================================================
-- PASO 1: Ver duplicados actuales
-- ================================================
SELECT 
  stripe_subscription_id,
  COUNT(*) as total_duplicados,
  STRING_AGG(id::text, ', ') as ids,
  STRING_AGG(created_at::text, ', ') as fechas
FROM unified_subscriptions
WHERE stripe_subscription_id IS NOT NULL
GROUP BY stripe_subscription_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ================================================
-- PASO 2: Eliminar duplicados (mantener el más reciente)
-- ================================================
WITH ranked_subscriptions AS (
  SELECT 
    id,
    stripe_subscription_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY stripe_subscription_id 
      ORDER BY created_at DESC
    ) as row_num
  FROM unified_subscriptions
  WHERE stripe_subscription_id IS NOT NULL
)
DELETE FROM unified_subscriptions
WHERE id IN (
  SELECT id 
  FROM ranked_subscriptions 
  WHERE row_num > 1
);

-- ================================================
-- PASO 3: Verificar resultados
-- ================================================
-- Contar suscripciones por usuario después de la limpieza
SELECT 
  user_id,
  COUNT(*) as total_suscripciones,
  COUNT(DISTINCT stripe_subscription_id) as suscripciones_unicas
FROM unified_subscriptions
GROUP BY user_id
ORDER BY total_suscripciones DESC;

-- Ver todas las suscripciones restantes
SELECT 
  id,
  user_id,
  customer_email,
  product_name,
  subscription_type,
  status,
  stripe_subscription_id,
  created_at
FROM unified_subscriptions
ORDER BY created_at DESC;

-- ================================================
-- PASO 4 (OPCIONAL): Crear índice único para prevenir duplicados futuros
-- ================================================
-- NOTA: Esto evitará que se creen duplicados en el futuro
-- Solo ejecutar si NO hay duplicados actualmente

-- CREATE UNIQUE INDEX unique_stripe_subscription_id 
-- ON unified_subscriptions(stripe_subscription_id) 
-- WHERE stripe_subscription_id IS NOT NULL;

-- ================================================
-- ROLLBACK (En caso de error)
-- ================================================
-- Si algo salió mal y tienes el backup:
-- DELETE FROM unified_subscriptions;
-- INSERT INTO unified_subscriptions SELECT * FROM unified_subscriptions_backup;
-- DROP TABLE unified_subscriptions_backup;
