-- Diagnóstico para suscripción #206
-- Verificar por qué no se está activando automáticamente

-- 1. Ver el estado actual de la suscripción #206
SELECT 
  id,
  status,
  external_reference,
  mercadopago_subscription_id,
  customer_data->>'email' as customer_email,
  created_at,
  updated_at,
  metadata
FROM unified_subscriptions
WHERE id = 206;

-- 2. Buscar si hay pagos asociados en MercadoPago
-- (El payment_id debería estar en mercadopago_subscription_id una vez que se procese el webhook)

-- 3. Verificar si llegó algún webhook (revisar logs de Vercel)
-- Necesitamos el payment_id para buscarlo en los logs de Vercel

-- 4. Verificar si hay notificaciones pendientes
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
WHERE subscription_id = 206
ORDER BY created_at DESC;

-- 5. Ver todas las suscripciones pendientes del usuario
SELECT 
  id,
  status,
  external_reference,
  mercadopago_subscription_id,
  transaction_amount,
  created_at
FROM unified_subscriptions
WHERE 
  user_id = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
  AND status = 'pending'
  AND created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
