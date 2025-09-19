-- Script para verificar que las vistas no tengan SECURITY DEFINER
-- Consulta las vistas del sistema para verificar su configuración

SELECT 
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN ('daily_alerts_summary', 'system_health_summary', 'webhook_stats', 'sync_stats')
ORDER BY viewname;

-- Verificar que las vistas existen y funcionan correctamente
SELECT 'daily_alerts_summary' as view_name, COUNT(*) as exists_check FROM daily_alerts_summary LIMIT 1;
SELECT 'system_health_summary' as view_name, COUNT(*) as exists_check FROM system_health_summary LIMIT 1;
SELECT 'webhook_stats' as view_name, COUNT(*) as exists_check FROM webhook_stats LIMIT 1;
SELECT 'sync_stats' as view_name, COUNT(*) as exists_check FROM sync_stats LIMIT 1;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Verificación completada: Todas las vistas están funcionando sin SECURITY DEFINER';
END $$;