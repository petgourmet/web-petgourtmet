-- Investigación y posible solución para suscripción #209
-- Usuario: cristoferscalante@gmail.com
-- External Reference: SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de

-- 1. Ver el estado actual completo de la suscripción
SELECT
  id,
  user_id,
  product_id,
  product_name,
  subscription_type,
  status,
  external_reference,
  mercadopago_subscription_id,
  preapproval_plan_id,
  init_point,
  transaction_amount,
  discounted_price,
  frequency,
  frequency_type,
  currency_id,
  created_at,
  updated_at,
  customer_data->>'email' as customer_email,
  metadata
FROM unified_subscriptions
WHERE id = 209;

-- 2. Buscar si hay algún pago asociado en la tabla de pagos (si existe)
-- Esta query puede fallar si no tienes tabla de pagos, es solo para verificar
SELECT *
FROM payments
WHERE 
  user_id = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
  AND created_at >= '2025-10-06 18:00:00'
ORDER BY created_at DESC;

-- 3. Ver si hay notificaciones pendientes para esta suscripción
SELECT *
FROM subscription_notifications
WHERE subscription_id = 209
ORDER BY created_at DESC;

-- 4. DIAGNÓSTICO: ¿Por qué falló?
-- Posibles razones:
--   a) mercadopago_subscription_id es NULL → No se creó el Preapproval
--   b) init_point es NULL → No se obtuvo el link de pago
--   c) Error en la API de MercadoPago (400)

-- 5. SOLUCIÓN TEMPORAL: Si el usuario ya pagó pero no tenemos el preapproval_id
-- EJECUTAR SOLO SI TIENES EL preapproval_id o payment_id de MercadoPago

/*
-- Ejemplo si tienes el preapproval_id:
UPDATE unified_subscriptions
SET
  mercadopago_subscription_id = 'PREAPPROVAL_ID_AQUI',
  preapproval_plan_id = 'PREAPPROVAL_ID_AQUI',
  status = 'active',
  updated_at = NOW(),
  next_billing_date = NOW() + INTERVAL '1 week',  -- porque es weekly
  charges_made = 1,
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'manual_activation', true,
    'activation_reason', 'api_error_mercadopago_400',
    'activated_by', 'admin',
    'activated_at', NOW()::text,
    'original_error', 'MercadoPago API returned 400 - investigating'
  )
WHERE id = 209;
*/

-- 6. VERIFICACIÓN: Ver si el trigger creó la notificación después de activar
-- (Ejecutar después de activar manualmente si es necesario)
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
WHERE subscription_id = 209
ORDER BY created_at DESC
LIMIT 5;

-- 7. NOTAS IMPORTANTES:
-- ❌ NO activar manualmente si el usuario NO ha pagado aún
-- ✅ Solo activar si tienes confirmación de pago de MercadoPago
-- ⚠️  Esperar primero el fix del código (deployment actual)
-- 📋 Revisar logs de Vercel para ver el error exacto de MercadoPago

-- 8. PRÓXIMOS PASOS:
-- 1. Esperar deployment de Vercel (2-3 minutos)
-- 2. Pedir al usuario que intente crear otra suscripción
-- 3. Con el nuevo logging, veremos el error exacto de MercadoPago
-- 4. Ajustar el código según el error específico
-- 5. Una vez funcionando, decidir qué hacer con suscripción #209
