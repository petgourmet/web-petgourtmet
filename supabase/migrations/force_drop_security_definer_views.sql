-- Script para eliminar definitivamente las vistas con SECURITY DEFINER
-- Fecha: $(date)
-- Propósito: Resolver errores persistentes de SECURITY DEFINER

-- Eliminar vistas si existen (con CASCADE para dependencias)
DROP VIEW IF EXISTS public.daily_alerts_summary CASCADE;
DROP VIEW IF EXISTS public.system_health_summary CASCADE;
DROP VIEW IF EXISTS public.webhook_stats CASCADE;
DROP VIEW IF EXISTS public.sync_stats CASCADE;

-- Verificar que no existan referencias en el catálogo del sistema
DO $$
BEGIN
    -- Eliminar cualquier entrada residual en pg_views
    DELETE FROM pg_catalog.pg_depend 
    WHERE objid IN (
        SELECT oid FROM pg_class 
        WHERE relname IN ('daily_alerts_summary', 'system_health_summary', 'webhook_stats', 'sync_stats')
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    );
    
    RAISE NOTICE 'Limpieza de vistas SECURITY DEFINER completada';
END $$;

-- Verificar que las vistas ya no existen
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('daily_alerts_summary', 'system_health_summary', 'webhook_stats', 'sync_stats');

-- Si el resultado anterior está vacío, las vistas han sido eliminadas correctamente