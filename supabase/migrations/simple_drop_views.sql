-- Script simple para eliminar vistas con SECURITY DEFINER
-- Fecha: $(date)
-- Propósito: Resolver errores persistentes de SECURITY DEFINER

-- Eliminar vistas si existen (con CASCADE para dependencias)
DROP VIEW IF EXISTS public.daily_alerts_summary CASCADE;
DROP VIEW IF EXISTS public.system_health_summary CASCADE;
DROP VIEW IF EXISTS public.webhook_stats CASCADE;
DROP VIEW IF EXISTS public.sync_stats CASCADE;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Vistas eliminadas correctamente';
END $$;

-- Verificar que las vistas ya no existen
SELECT 
    'Vista encontrada: ' || schemaname || '.' || viewname as resultado
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('daily_alerts_summary', 'system_health_summary', 'webhook_stats', 'sync_stats')
UNION ALL
SELECT 'No se encontraron vistas problemáticas' as resultado
WHERE NOT EXISTS (
    SELECT 1 FROM pg_views 
    WHERE schemaname = 'public' 
    AND viewname IN ('daily_alerts_summary', 'system_health_summary', 'webhook_stats', 'sync_stats')
);