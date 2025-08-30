-- Verificar detalles completos de la suscripción ID 36
SELECT 
  id,
  user_id,
  product_id,
  status,
  mercadopago_subscription_id,
  preapproval_plan_id,
  subscription_type,
  base_price,
  discounted_price,
  next_billing_date,
  created_at,
  updated_at,
  cancelled_at
FROM user_subscriptions 
WHERE id = 36;

-- También verificar todas las suscripciones para este usuario
SELECT 
  id,
  user_id,
  status,
  mercadopago_subscription_id,
  created_at,
  cancelled_at
FROM user_subscriptions 
WHERE user_id = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
ORDER BY created_at DESC;