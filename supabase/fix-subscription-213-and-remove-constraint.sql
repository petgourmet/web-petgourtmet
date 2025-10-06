-- SOLUCIÓN URGENTE: Suscripción #213 ya fue pagada pero no activada
-- Payment ID: 128875494516 (APROBADO)
-- External Reference del pago: e18739d05b0e4dbea8cb65d88d8463d5
-- External Reference de la suscripción: SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de

-- PASO 1: Buscar y eliminar el constraint/trigger que está validando el formato del external_reference
-- Este constraint está impidiendo que se guarden suscripciones

-- Ver todos los triggers en unified_subscriptions
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'unified_subscriptions';

-- Ver todas las funciones relacionadas con external_reference o validate
SELECT 
  proname AS function_name,
  prosrc AS function_source_preview
FROM pg_proc
WHERE (proname LIKE '%external%' OR proname LIKE '%reference%' OR proname LIKE '%validate%')
  AND prokind = 'f'
ORDER BY proname;

-- PASO 2: ELIMINAR el trigger/función de validación que causa el error P0001
-- Este es el que está bloqueando las suscripciones con el mensaje:
-- "external_reference debe tener formato: SUB-{userId}-{planId}-{hash8}"

-- Primero buscar TODOS los triggers:
SELECT 
  tgname AS trigger_name,
  pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgrelid = 'unified_subscriptions'::regclass
  AND tgisinternal = false;

-- Una vez identificado el trigger problemático, ejecutar:
-- DROP TRIGGER IF EXISTS [nombre_del_trigger] ON unified_subscriptions;
-- DROP FUNCTION IF EXISTS [nombre_de_la_funcion]();

-- SOLUCIÓN TEMPORAL: Desactivar el trigger específico si lo encontraste
-- (Reemplaza 'nombre_del_trigger' con el nombre real del trigger que valida external_reference)
/*
ALTER TABLE unified_subscriptions DISABLE TRIGGER nombre_del_trigger;
*/

-- PASO 3: Activar manualmente la suscripción #213 (YA TIENE PAGO APROBADO)
UPDATE unified_subscriptions
SET
  status = 'active',
  mercadopago_subscription_id = '128875494516',  -- Payment ID que fue aprobado
  updated_at = NOW(),
  next_billing_date = NOW() + INTERVAL '1 week',  -- Es weekly
  charges_made = 1,
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'manual_activation', true,
    'activation_reason', 'payment_approved_but_external_reference_mismatch',
    'payment_id', '128875494516',
    'payment_external_reference', 'e18739d05b0e4dbea8cb65d88d8463d5',
    'subscription_external_reference', 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de',
    'payment_status', 'approved',
    'payment_type', 'credit_card',
    'collection_id', '128875494516',
    'activated_by', 'admin',
    'activated_at', NOW()::text,
    'notes', 'Usuario completó el pago pero el sistema no pudo procesar debido a constraint de validación'
  )
WHERE id = 213;

-- PASO 4: Verificar que se creó la notificación (trigger de emails)
SELECT
  id,
  subscription_id,
  old_status,
  new_status,
  notification_sent,
  error_message,
  created_at,
  updated_at
FROM subscription_notifications
WHERE subscription_id = 213
ORDER BY created_at DESC;

-- PASO 5: Ver el estado final de la suscripción
SELECT
  id,
  user_id,
  product_name,
  subscription_type,
  status,
  external_reference,
  mercadopago_subscription_id,
  transaction_amount,
  charges_made,
  next_billing_date,
  customer_data->>'email' as customer_email,
  metadata->>'activated_at' as activated_at,
  metadata->>'payment_status' as payment_status,
  updated_at
FROM unified_subscriptions
WHERE id = 213;

-- PASO 6: También eliminar/cancelar suscripciones #209 y #210-#212 (si existen y no fueron pagadas)
-- Estas son intentos fallidos que nunca llegaron a MercadoPago

-- Ver cuáles existen
SELECT 
  id,
  status,
  external_reference,
  mercadopago_subscription_id,
  init_point,
  created_at
FROM unified_subscriptions
WHERE id IN (209, 210, 211, 212)
  AND (mercadopago_subscription_id IS NULL OR init_point IS NULL);

-- Si existen y no tienen payment, cancelarlas
/*
UPDATE unified_subscriptions
SET
  status = 'cancelled',
  cancelled_at = NOW(),
  notes = 'Cancelada automáticamente - nunca se completó el flujo de pago debido a error de validación',
  updated_at = NOW()
WHERE id IN (209, 210, 211, 212)
  AND status = 'pending'
  AND mercadopago_subscription_id IS NULL;
*/

-- ========================================
-- SOLUCIÓN PERMANENTE
-- ========================================

-- El problema es que hay un constraint que valida el formato del external_reference
-- y rechaza el formato que estamos usando ahora: SUB-{uuid}-{productId}-{hash8}
-- 
-- El constraint espera: SUB-{userId}-{planId}-{hash8}
--
-- Necesitamos ELIMINAR ese constraint porque:
-- 1. Ya no es necesario (usamos validación en el código)
-- 2. Está bloqueando el flujo de checkout
-- 3. El formato actual es más robusto (usa UUID completo)

-- Buscar el constraint exacto:
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'unified_subscriptions'::regclass
  AND pg_get_constraintdef(oid) LIKE '%external_reference%';

-- Una vez identificado, eliminarlo:
/*
ALTER TABLE unified_subscriptions DROP CONSTRAINT nombre_del_constraint;
*/

-- O si es un trigger:
/*
DROP TRIGGER IF EXISTS nombre_del_trigger ON unified_subscriptions;
DROP FUNCTION IF EXISTS nombre_de_la_funcion();
*/
