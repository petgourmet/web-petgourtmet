-- Verificar si existe un registro pendiente con el external_reference específico
SELECT 
  id,
  user_id,
  status,
  external_reference,
  product_name,
  base_price,
  discounted_price,
  customer_data,
  created_at,
  updated_at
FROM unified_subscriptions 
WHERE external_reference = '7aff2471329b4b66a6ba6ca91af7858b'
ORDER BY created_at DESC;

-- Verificar el estado actual del usuario cristoferscalante@gmail.com
SELECT 
  id,
  email,
  full_name,
  has_active_subscription,
  created_at,
  updated_at
FROM profiles 
WHERE email = 'cristoferscalante@gmail.com';

-- Verificar todas las suscripciones del usuario
SELECT 
  id,
  user_id,
  status,
  external_reference,
  mercadopago_subscription_id,
  product_name,
  base_price,
  discounted_price,
  created_at,
  updated_at
FROM unified_subscriptions 
WHERE user_id = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
ORDER BY created_at DESC;