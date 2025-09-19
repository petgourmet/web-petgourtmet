-- Actualizar suscripción aprobada que no se procesó correctamente
-- external_reference: 241b49306b3b42af8c37364bedfc1dae
-- collection_id: 126713540314

-- Actualizar el estado de la suscripción a 'approved'
UPDATE unified_subscriptions 
SET 
  status = 'approved',
  updated_at = NOW(),
  processed_at = NOW(),
  next_billing_date = CASE 
    WHEN frequency_type = 'months' THEN 
      CURRENT_DATE + INTERVAL '1 month' * frequency
    WHEN frequency_type = 'weeks' THEN 
      CURRENT_DATE + INTERVAL '1 week' * frequency
    ELSE 
      CURRENT_DATE + INTERVAL '1 month'
  END,
  last_billing_date = CURRENT_DATE,
  charges_made = 1
WHERE external_reference = '241b49306b3b42af8c37364bedfc1dae'
  AND status = 'pending';

-- Verificar la actualización
SELECT 
  id,
  user_id,
  status,
  external_reference,
  mercadopago_subscription_id,
  subscription_type,
  next_billing_date,
  last_billing_date,
  charges_made,
  updated_at
FROM unified_subscriptions 
WHERE external_reference = '241b49306b3b42af8c37364bedfc1dae';

-- También verificar si hay duplicados para el mismo usuario
SELECT 
  id,
  user_id,
  status,
  external_reference,
  subscription_type,
  created_at
FROM unified_subscriptions 
WHERE user_id = (
  SELECT user_id 
  FROM unified_subscriptions 
  WHERE external_reference = '241b49306b3b42af8c37364bedfc1dae' 
  LIMIT 1
)
ORDER BY created_at DESC;