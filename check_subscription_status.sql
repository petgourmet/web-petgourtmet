-- Verificar el estado de la suscripción después de la activación
SELECT 
  id,
  user_id,
  status,
  external_reference,
  product_name,
  base_price,
  discounted_price,
  transaction_amount,
  next_billing_date,
  created_at,
  updated_at
FROM unified_subscriptions 
WHERE external_reference = '9782a851a7d248238bd88a8dc3d03245'
ORDER BY updated_at DESC;