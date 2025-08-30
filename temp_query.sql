-- Verificar suscripciones para cristoferscalante@gmail.com
SELECT 
  p.email,
  p.id as profile_id,
  us.id as subscription_id,
  us.status,
  us.mercadopago_subscription_id,
  us.created_at,
  us.product_name
FROM profiles p 
LEFT JOIN user_subscriptions us ON p.id = us.user_id 
WHERE p.email = 'cristoferscalante@gmail.com';

-- También verificar suscripciones pendientes
SELECT 
  p.email,
  ps.id as pending_id,
  ps.status,
  ps.subscription_type,
  ps.mercadopago_subscription_id,
  ps.created_at,
  ps.customer_data
FROM profiles p 
LEFT JOIN pending_subscriptions ps ON p.id = ps.user_id 
WHERE p.email = 'cristoferscalante@gmail.com';

-- Verificar si el usuario existe
SELECT email, id, created_at FROM profiles WHERE email = 'cristoferscalante@gmail.com';