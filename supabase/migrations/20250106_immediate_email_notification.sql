-- ========================================
-- SOLUCIÓN: Email Inmediato al Cambiar Estado
-- ========================================
-- Esta migración actualiza el trigger para que el email se envíe INMEDIATAMENTE
-- usando pg_net (extensión de Supabase para hacer llamadas HTTP desde PostgreSQL)

-- PASO 1: Habilitar la extensión pg_net (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- PASO 2: Crear función que envía el email inmediatamente
CREATE OR REPLACE FUNCTION log_and_send_subscription_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email VARCHAR(255);
  v_notification_id BIGINT;
  v_response_id BIGINT;
BEGIN
  -- Solo procesar si el estado ha cambiado
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Extraer email del customer_data
    BEGIN
      v_user_email := (NEW.customer_data::json->>'email')::VARCHAR(255);
    EXCEPTION WHEN OTHERS THEN
      v_user_email := 'no-email@petgourmet.mx';
    END;
    
    -- Insertar notificación pendiente y obtener su ID
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
    
    -- Hacer llamada HTTP asíncrona al endpoint de procesamiento
    -- Esto envía el email INMEDIATAMENTE sin esperar el cron
    SELECT INTO v_response_id net.http_post(
      url := 'https://petgourmet.mx/api/admin/subscription-notifications',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := json_build_object(
        'notification_id', v_notification_id,
        'subscription_id', NEW.id,
        'immediate', true
      )::jsonb
    );
    
    -- Log de la llamada HTTP (opcional)
    RAISE NOTICE 'Email notification triggered for subscription % (notification ID: %, HTTP request ID: %)', 
      NEW.id, v_notification_id, v_response_id;
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
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'unified_subscriptions'
  AND trigger_name = 'trigger_send_immediate_notification';

-- ========================================
-- NOTAS IMPORTANTES
-- ========================================
/*
1. Esta solución usa pg_net, una extensión de Supabase que permite hacer HTTP requests desde PostgreSQL
2. El email se enviará INMEDIATAMENTE cuando cambie el estado
3. El cron job de cada 5 minutos seguirá funcionando como respaldo para notificaciones que fallen
4. Si pg_net no está disponible, la extensión se creará automáticamente
5. La llamada HTTP es asíncrona, no bloquea la transacción
*/

-- ========================================
-- ALTERNATIVA SI pg_net NO FUNCIONA
-- ========================================
-- Si pg_net no está disponible en tu plan de Supabase, puedes usar Supabase Webhooks:
-- 1. Ve a Database → Webhooks en el dashboard de Supabase
-- 2. Crea un webhook que apunte a: https://petgourmet.mx/api/admin/subscription-notifications
-- 3. Trigger: AFTER UPDATE on unified_subscriptions
-- 4. Condition: OLD.status IS DISTINCT FROM NEW.status
