-- Script CORREGIDO para activar manualmente la suscripción #206
-- Pago aprobado: payment_id=128298100369, external_reference=bf82cd363f9848f4845724b6e6fad5a4

-- 1. Activar la suscripción (sin usar activated_at que no existe)
UPDATE unified_subscriptions
SET
  status = 'active',
  mercadopago_subscription_id = '128298100369',
  updated_at = NOW(),
  next_billing_date = NOW() + INTERVAL '1 month',
  charges_made = 1,
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'manual_activation', true,
    'activation_reason', 'webhook_external_reference_mismatch',
    'payment_id', '128298100369',
    'payment_external_reference', 'bf82cd363f9848f4845724b6e6fad5a4',
    'subscription_external_reference', 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de',
    'activated_by', 'admin',
    'activated_at', NOW()::text
  )
WHERE id = 206;

-- 2. Verificar que se creó la notificación automáticamente (por el trigger)
SELECT
  id,
  subscription_id,
  old_status,
  new_status,
  notification_sent,
  created_at
FROM subscription_notifications
WHERE subscription_id = 206
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
  next_billing_date,
  charges_made,
  customer_data->>'email' as customer_email,
  metadata->>'activated_at' as activated_at_metadata,
  updated_at
FROM unified_subscriptions
WHERE id = 206;
