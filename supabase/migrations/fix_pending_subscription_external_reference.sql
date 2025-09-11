-- Actualizar la suscripción pendiente con el external_reference correcto
-- Esto permitirá que el webhook de MercadoPago procese correctamente el pago

UPDATE pending_subscriptions 
SET 
  external_reference = '9dc299af727f4c509db338c9843493bd',
  updated_at = NOW()
WHERE 
  external_reference = 'subscription_PG-602575_1757613602575'
  AND user_id = 'f68400d1-43df-4813-8fa2-d101e65d59ff';

-- Verificar que la actualización fue exitosa
SELECT 
  id,
  user_id,
  external_reference,
  status,
  created_at,
  updated_at
FROM pending_subscriptions 
WHERE user_id = 'f68400d1-43df-4813-8fa2-d101e65d59ff';