-- ========================================
-- EJECUTAR AHORA: Habilitar Emails Inmediatos
-- ========================================
-- Este script actualiza el trigger para enviar emails INMEDIATAMENTE
-- cuando cambia el estado de una suscripción

-- PASO 1: Verificar si pg_net está disponible
-- (Esta extensión permite hacer HTTP requests desde PostgreSQL)
SELECT * FROM pg_available_extensions WHERE name = 'pg_net';

-- Si aparece en la lista, ejecuta esto:
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- PASO 2: Crear función mejorada que envía el email inmediatamente
CREATE OR REPLACE FUNCTION log_and_send_subscription_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email VARCHAR(255);
  v_notification_id BIGINT;
BEGIN
  -- Solo procesar si el estado ha cambiado
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Extraer email del customer_data
    BEGIN
      v_user_email := (NEW.customer_data::json->>'email')::VARCHAR(255);
    EXCEPTION WHEN OTHERS THEN
      v_user_email := 'no-email@petgourmet.mx';
    END;
    
    -- Insertar notificación pendiente
    INSERT INTO subscription_notifications (
      subscription_id,
      old_status,
      new_status,
      user_email,
      admin_email
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      v_user_email,
      'contacto@petgourmet.mx'
    )
    RETURNING id INTO v_notification_id;
    
    -- Log: Notificación creada
    RAISE NOTICE 'Notificación creada: ID=%, Suscripción=%, Estado: % -> %', 
      v_notification_id, NEW.id, OLD.status, NEW.status;
    
    -- IMPORTANTE: Si pg_net está disponible, descomenta esto:
    /*
    PERFORM net.http_post(
      url := 'https://petgourmet.mx/api/admin/subscription-notifications',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := json_build_object(
        'notification_id', v_notification_id,
        'subscription_id', NEW.id,
        'immediate', true
      )::jsonb
    );
    
    RAISE NOTICE 'Email enviado inmediatamente para notificación ID=%', v_notification_id;
    */
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 3: Reemplazar el trigger existente
DROP TRIGGER IF EXISTS trigger_log_subscription_status_change ON unified_subscriptions;
DROP TRIGGER IF EXISTS trigger_send_immediate_notification ON unified_subscriptions;

CREATE TRIGGER trigger_send_immediate_notification
  AFTER UPDATE ON unified_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION log_and_send_subscription_notification();

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Ver que el trigger está activo
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'unified_subscriptions'
ORDER BY trigger_name;

-- Ver funciones relacionadas
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%subscription%notification%'
ORDER BY routine_name;

-- ========================================
-- PRUEBA: Cambiar estado de una suscripción
-- ========================================
-- Esto debería crear una notificación automáticamente

-- Prueba con suscripción #213 (cambiar a 'paused' y luego a 'active')
/*
UPDATE unified_subscriptions 
SET status = 'paused'
WHERE id = 213;

-- Espera 2 segundos y verifica la notificación creada:
SELECT * FROM subscription_notifications 
WHERE subscription_id = 213 
ORDER BY created_at DESC 
LIMIT 1;

-- Ahora vuelve a activarla:
UPDATE unified_subscriptions 
SET status = 'active'
WHERE id = 213;

-- Verifica la nueva notificación:
SELECT * FROM subscription_notifications 
WHERE subscription_id = 213 
ORDER BY created_at DESC 
LIMIT 2;
*/

-- ========================================
-- NOTAS IMPORTANTES
-- ========================================
/*
SITUACIÓN ACTUAL:
- El trigger ahora crea notificaciones correctamente
- El API endpoint está modificado para aceptar notification_id
- Si pg_net está disponible, descomentar el bloque PERFORM net.http_post

SI pg_net NO ESTÁ DISPONIBLE:
- El sistema funcionará igual, pero con delay de 5 minutos (cron)
- Para emails inmediatos SIN pg_net, hay 2 opciones:

OPCIÓN 1: Usar Supabase Database Webhooks (Recomendado)
1. Ve al dashboard de Supabase → Database → Webhooks
2. Crea un webhook:
   - Name: "Send Subscription Email"
   - Table: subscription_notifications
   - Events: INSERT
   - Type: HTTP Request
   - Method: POST
   - URL: https://petgourmet.mx/api/admin/subscription-notifications
   - HTTP Headers: Content-Type: application/json
   - HTTP Body: {"notification_id": {{ record.id }}, "immediate": true}

OPCIÓN 2: Usar Supabase Realtime + Edge Function
- Crear Edge Function que escuche inserts en subscription_notifications
- Enviar email inmediatamente desde la Edge Function

VENTAJAS DE WEBHOOKS:
✅ No requiere código adicional
✅ Configuración en el dashboard (sin SQL)
✅ Reintentos automáticos
✅ Logs y monitoreo built-in
*/
