-- Verificar el estado real de las suscripciones en la base de datos
SELECT 
  id,
  customer_email,
  product_name,
  subscription_type,
  status,
  canceled_at,
  stripe_subscription_id,
  created_at
FROM unified_subscriptions
WHERE customer_email = 'cristoferscalante@gmail.com'
ORDER BY created_at DESC;
