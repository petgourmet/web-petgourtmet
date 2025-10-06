-- Diagnóstico de suscripción #203
-- Entender por qué el webhook no activó la suscripción automáticamente

-- 1. Ver toda la información de la suscripción #203
SELECT 
  id,
  user_id,
  subscription_type,
  status,
  external_reference,
  mercadopago_subscription_id,
  product_id,
  product_name,
  transaction_amount,
  created_at,
  updated_at,
  activated_at,
  customer_data,
  metadata
FROM unified_subscriptions
WHERE id = 203;

-- 2. Buscar si hay otras suscripciones con el mismo external_reference del pago
-- (El pago podría tener un external_reference diferente al de la suscripción)
SELECT 
  id,
  status,
  external_reference,
  mercadopago_subscription_id,
  customer_data->>'email' as customer_email,
  created_at
FROM unified_subscriptions
WHERE 
  user_id = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
  AND product_id = 73
  AND created_at >= '2025-10-06 17:00:00'
ORDER BY created_at DESC;

-- 3. Ver el historial de pagos si existe
SELECT 
  id,
  subscription_id,
  amount,
  status,
  mercadopago_payment_id,
  external_reference,
  billing_date,
  created_at
FROM subscription_billing_history
WHERE subscription_id = 203
ORDER BY created_at DESC;

-- 4. Ver notificaciones pendientes de la suscripción #203
SELECT 
  id,
  subscription_id,
  old_status,
  new_status,
  notification_sent,
  sent_at,
  error_message,
  created_at
FROM subscription_notifications
WHERE subscription_id = 203
ORDER BY created_at DESC;

-- 5. Buscar suscripciones pendientes recientes del mismo usuario
-- (para verificar si el webhook buscó correctamente)
SELECT 
  id,
  status,
  external_reference,
  mercadopago_subscription_id,
  product_name,
  transaction_amount,
  customer_data->>'email' as customer_email,
  created_at
FROM unified_subscriptions
WHERE 
  user_id = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
  AND status = 'pending'
  AND created_at >= NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
