-- Script para activar manualmente la suscripción #203
-- Esta suscripción tiene un pago aprobado (payment_id=128861820488) pero no se activó automáticamente

-- 1. Activar la suscripción
UPDATE unified_subscriptions
SET 
  status = 'active',
  mercadopago_subscription_id = '128861820488',
  activated_at = NOW(),
  updated_at = NOW(),
  next_billing_date = NOW() + INTERVAL '1 month',
  charges_made = 1,
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'manual_activation', true,
    'activation_reason', 'webhook_processing_issue',
    'payment_id', '128861820488',
    'activated_by', 'admin',
    'activated_at', NOW()::text
  )
WHERE id = 203;

-- 2. Verificar que se creó la notificación automáticamente (por el trigger)
SELECT 
  id,
  subscription_id,
  old_status,
  new_status,
  notification_sent,
  created_at
FROM subscription_notifications
WHERE subscription_id = 203
ORDER BY created_at DESC
LIMIT 5;

-- 3. Ver el estado actual de la suscripción
SELECT 
  id,
  user_id,
  product_id,
  status,
  external_reference,
  mercadopago_subscription_id,
  activated_at,
  next_billing_date,
  charges_made,
  customer_data->>'email' as customer_email,
  metadata
FROM unified_subscriptions
WHERE id = 203;
