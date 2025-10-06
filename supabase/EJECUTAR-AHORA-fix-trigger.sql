-- ========================================
-- SOLUCIÓN DEFINITIVA Y URGENTE
-- ========================================
-- Este script ELIMINA el trigger que está bloqueando las suscripciones
-- y ACTIVA la suscripción #213 que ya tiene pago aprobado

-- PASO 1: ELIMINAR el trigger problemático
DROP TRIGGER IF EXISTS trigger_validate_external_reference ON unified_subscriptions;

-- PASO 2: ELIMINAR la función que valida el formato
DROP FUNCTION IF EXISTS validate_external_reference();

-- PASO 3: Activar la suscripción #213 (YA TIENE PAGO APROBADO)
UPDATE unified_subscriptions
SET
  status = 'active',
  mercadopago_subscription_id = '128875494516',
  updated_at = NOW(),
  next_billing_date = NOW() + INTERVAL '1 week',
  charges_made = 1,
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'manual_activation', true,
    'activation_reason', 'payment_approved_external_reference_mismatch',
    'payment_id', '128875494516',
    'payment_external_reference', 'e18739d05b0e4dbea8cb65d88d8463d5',
    'subscription_external_reference', 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de',
    'payment_status', 'approved',
    'payment_type', 'credit_card',
    'activated_by', 'admin',
    'activated_at', NOW()::text,
    'trigger_removed', true,
    'notes', 'Trigger validate_external_reference eliminado - bloqueaba suscripciones'
  )
WHERE id = 213;

-- PASO 4: Verificar que se activó correctamente
SELECT
  id,
  status,
  external_reference,
  mercadopago_subscription_id,
  charges_made,
  next_billing_date,
  customer_data->>'email' as customer_email,
  metadata->>'payment_status' as payment_status,
  metadata->>'activated_at' as activated_at
FROM unified_subscriptions
WHERE id = 213;

-- PASO 5: Verificar que se creó la notificación para enviar email
SELECT
  id,
  subscription_id,
  old_status,
  new_status,
  notification_sent,
  error_message,
  created_at
FROM subscription_notifications
WHERE subscription_id = 213
ORDER BY created_at DESC
LIMIT 1;

-- PASO 6: Cancelar suscripciones fallidas anteriores (sin pago)
UPDATE unified_subscriptions
SET
  status = 'cancelled',
  cancelled_at = NOW(),
  notes = 'Cancelada - intento fallido por trigger de validación',
  updated_at = NOW()
WHERE id IN (209, 210, 211, 212)
  AND status = 'pending'
  AND (mercadopago_subscription_id IS NULL OR init_point IS NULL);

-- PASO 7: Ver resultado final
SELECT
  id,
  status,
  external_reference,
  mercadopago_subscription_id,
  created_at,
  notes
FROM unified_subscriptions
WHERE id IN (209, 210, 211, 212, 213)
ORDER BY id;

-- ========================================
-- RESULTADO ESPERADO
-- ========================================
-- ✅ Trigger eliminado
-- ✅ Función eliminada
-- ✅ Suscripción #213 activada
-- ✅ Email será enviado automáticamente por el trigger de notificaciones
-- ✅ Suscripciones #209-212 canceladas
-- ✅ Nuevas suscripciones funcionarán sin el constraint de formato
