-- Verificar si las vistas problemáticas existen y tienen SECURITY DEFINER
SELECT 
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('daily_alerts_summary', 'system_health_summary', 'webhook_stats', 'sync_stats');

-- También verificar en pg_class para más detalles
SELECT 
    c.relname as view_name,
    c.relowner,
    u.usename as owner_name,
    c.relacl as permissions
FROM pg_class c
JOIN pg_user u ON c.relowner = u.usesysid
WHERE c.relkind = 'v' 
AND c.relname IN ('daily_alerts_summary', 'system_health_summary', 'webhook_stats', 'sync_stats')
AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');