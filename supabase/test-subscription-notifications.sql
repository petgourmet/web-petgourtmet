-- Script de pruebas para el sistema de notificaciones de suscripciones
-- Autor: Pet Gourmet Development Team
-- Fecha: 2025-10-06

-- ========================================
-- PARTE 1: VERIFICACIÓN DE INSTALACIÓN
-- ========================================

-- 1.1: Verificar que la tabla existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'subscription_notifications'
) AS tabla_existe;

-- 1.2: Verificar estructura de la tabla
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'subscription_notifications'
ORDER BY ordinal_position;

-- 1.3: Verificar que el trigger existe
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_log_subscription_status_change';

-- ========================================
-- PARTE 2: PRUEBAS DE FUNCIONALIDAD
-- ========================================

-- 2.1: Ver suscripciones existentes
SELECT 
  id,
  user_id,
  subscription_type,
  status,
  product_name,
  customer_data->>'email' as user_email,
  created_at
FROM unified_subscriptions
ORDER BY created_at DESC
LIMIT 5;

-- 2.2: Cambiar estado de una suscripción (AJUSTA EL ID)
-- IMPORTANTE: Reemplaza 197 con un ID real de tu tabla
-- UPDATE unified_subscriptions 
-- SET status = 'active' 
-- WHERE id = 197;

-- 2.3: Verificar que se creó la notificación (AJUSTA EL ID)
SELECT * 
FROM subscription_notifications 
WHERE subscription_id = 197 
ORDER BY created_at DESC 
LIMIT 1;

-- ========================================
-- PARTE 3: MONITOREO Y ESTADÍSTICAS
-- ========================================

-- 3.1: Ver todas las notificaciones
SELECT 
  id,
  subscription_id,
  old_status,
  new_status,
  user_email,
  notification_sent,
  retry_count,
  error_message,
  created_at,
  email_sent_at
FROM subscription_notifications
ORDER BY created_at DESC
LIMIT 20;

-- 3.2: Estadísticas generales
SELECT 
  COUNT(*) as total_notifications,
  SUM(CASE WHEN notification_sent THEN 1 ELSE 0 END) as emails_sent,
  SUM(CASE WHEN NOT notification_sent AND retry_count < 5 THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN NOT notification_sent AND retry_count >= 5 THEN 1 ELSE 0 END) as failed
FROM subscription_notifications;

-- 3.3: Estadísticas por estado
SELECT 
  new_status,
  COUNT(*) as total,
  SUM(CASE WHEN notification_sent THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN NOT notification_sent AND retry_count < 5 THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN NOT notification_sent AND retry_count >= 5 THEN 1 ELSE 0 END) as failed,
  ROUND(AVG(retry_count), 2) as avg_retries
FROM subscription_notifications
GROUP BY new_status
ORDER BY total DESC;

-- 3.4: Notificaciones pendientes de envío
SELECT 
  n.id,
  n.subscription_id,
  n.new_status,
  n.user_email,
  n.retry_count,
  n.error_message,
  n.created_at,
  s.product_name,
  s.subscription_type
FROM subscription_notifications n
LEFT JOIN unified_subscriptions s ON s.id = n.subscription_id
WHERE n.notification_sent = false 
  AND n.retry_count < 5
ORDER BY n.created_at ASC;

-- 3.5: Notificaciones con errores
SELECT 
  n.id,
  n.subscription_id,
  n.user_email,
  n.error_message,
  n.retry_count,
  n.created_at,
  n.updated_at
FROM subscription_notifications n
WHERE n.error_message IS NOT NULL
ORDER BY n.updated_at DESC
LIMIT 10;

-- 3.6: Tasa de éxito de envío
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total,
  SUM(CASE WHEN notification_sent THEN 1 ELSE 0 END) as sent,
  ROUND(100.0 * SUM(CASE WHEN notification_sent THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM subscription_notifications
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ========================================
-- PARTE 4: LIMPIEZA Y MANTENIMIENTO
-- ========================================

-- 4.1: Ver notificaciones antiguas enviadas (más de 30 días)
SELECT 
  COUNT(*) as old_notifications,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM subscription_notifications
WHERE notification_sent = true
  AND created_at < NOW() - INTERVAL '30 days';

-- 4.2: LIMPIAR notificaciones enviadas antiguas (más de 90 días)
-- DESCOMENTA PARA EJECUTAR:
-- DELETE FROM subscription_notifications
-- WHERE notification_sent = true
--   AND created_at < NOW() - INTERVAL '90 days';

-- 4.3: Resetear notificaciones fallidas para reintento (CUIDADO)
-- DESCOMENTA PARA EJECUTAR:
-- UPDATE subscription_notifications
-- SET retry_count = 0, error_message = NULL
-- WHERE notification_sent = false
--   AND retry_count >= 5
--   AND created_at > NOW() - INTERVAL '1 day';

-- ========================================
-- PARTE 5: PRUEBAS DE TRIGGER
-- ========================================

-- 5.1: Crear una transacción de prueba para verificar el trigger
DO $$
DECLARE
  test_subscription_id INTEGER;
  notification_count INTEGER;
BEGIN
  -- Obtener una suscripción existente
  SELECT id INTO test_subscription_id 
  FROM unified_subscriptions 
  WHERE status = 'pending'
  LIMIT 1;
  
  IF test_subscription_id IS NOT NULL THEN
    -- Contar notificaciones antes
    SELECT COUNT(*) INTO notification_count 
    FROM subscription_notifications 
    WHERE subscription_id = test_subscription_id;
    
    RAISE NOTICE 'Suscripción de prueba: %, Notificaciones previas: %', 
      test_subscription_id, notification_count;
    
    -- Cambiar estado (esto debería activar el trigger)
    UPDATE unified_subscriptions 
    SET status = 'active' 
    WHERE id = test_subscription_id;
    
    -- Verificar que se creó la notificación
    PERFORM pg_sleep(1); -- Esperar un segundo
    
    SELECT COUNT(*) INTO notification_count 
    FROM subscription_notifications 
    WHERE subscription_id = test_subscription_id;
    
    RAISE NOTICE 'Notificaciones después del cambio: %', notification_count;
    
    -- Mostrar la última notificación
    RAISE NOTICE 'Última notificación creada:';
    PERFORM * FROM subscription_notifications 
    WHERE subscription_id = test_subscription_id 
    ORDER BY created_at DESC 
    LIMIT 1;
  ELSE
    RAISE NOTICE 'No se encontró ninguna suscripción pendiente para probar';
  END IF;
END $$;

-- ========================================
-- PARTE 6: INFORMACIÓN DEL SISTEMA
-- ========================================

-- 6.1: Índices en la tabla
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'subscription_notifications';

-- 6.2: Tamaño de la tabla
SELECT
  pg_size_pretty(pg_total_relation_size('subscription_notifications')) as table_size;

-- 6.3: Últimas actualizaciones de suscripciones (para monitoreo)
SELECT 
  id,
  status,
  subscription_type,
  product_name,
  customer_data->>'email' as user_email,
  updated_at,
  created_at
FROM unified_subscriptions
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- ========================================
-- PARTE 7: CONSULTAS ÚTILES PARA DEBUG
-- ========================================

-- 7.1: Ver notificaciones con sus suscripciones completas
SELECT 
  n.id as notification_id,
  n.subscription_id,
  n.old_status,
  n.new_status,
  n.user_email,
  n.notification_sent,
  n.retry_count,
  n.created_at as notification_created,
  s.status as current_subscription_status,
  s.subscription_type,
  s.product_name,
  s.product_image,
  s.next_billing_date,
  s.customer_data->>'firstName' as customer_first_name,
  s.customer_data->>'lastName' as customer_last_name
FROM subscription_notifications n
LEFT JOIN unified_subscriptions s ON s.id = n.subscription_id
ORDER BY n.created_at DESC
LIMIT 10;

-- 7.2: Buscar duplicados (notificaciones múltiples para la misma transición)
SELECT 
  subscription_id,
  old_status,
  new_status,
  COUNT(*) as count,
  array_agg(id) as notification_ids,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM subscription_notifications
GROUP BY subscription_id, old_status, new_status
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- ========================================
-- NOTAS FINALES
-- ========================================

/*
🔍 CÓMO USAR ESTE SCRIPT:

1. Ejecuta las consultas de PARTE 1 para verificar la instalación
2. Usa PARTE 2 para hacer pruebas de funcionalidad
3. Monitorea con las consultas de PARTE 3
4. Usa PARTE 4 para mantenimiento (con cuidado)
5. PARTE 5 para verificar que el trigger funciona
6. PARTE 6 y 7 para debugging y análisis

⚠️ PRECAUCIONES:
- Las consultas de limpieza están comentadas por seguridad
- Descoméntalas solo si estás seguro
- Haz backup antes de ejecutar DELETE o UPDATE masivos
- Prueba primero en desarrollo

📊 MONITOREO RECOMENDADO:
- Ejecuta 3.2 diariamente para ver estadísticas generales
- Usa 3.4 para ver notificaciones pendientes
- Revisa 3.5 si hay problemas de envío
- Monitorea 3.6 para ver tendencias

🚀 TESTING:
- Cambia el estado de una suscripción manualmente
- Verifica que se cree la notificación
- Llama al endpoint POST para procesar
- Verifica que se envíe el email
- Revisa los logs en Vercel

✅ TODO CORRECTO SI:
- El trigger existe y está activo
- Las notificaciones se crean automáticamente
- Los emails se envían con éxito
- No hay notificaciones con retry_count >= 5
*/
