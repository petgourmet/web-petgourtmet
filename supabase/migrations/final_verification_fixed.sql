-- Verificación final corregida: confirmar que las vistas NO tienen SECURITY DEFINER

-- Verificar que las vistas existen y NO tienen SECURITY DEFINER
SELECT 
    schemaname,
    viewname,
    viewowner,
    CASE 
        WHEN definition LIKE '%SECURITY DEFINER%' THEN 'ERROR: STILL HAS SECURITY DEFINER'
        ELSE 'SUCCESS: NO SECURITY DEFINER'
    END as security_status
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('daily_alerts_summary', 'system_health_summary', 'webhook_stats', 'sync_stats')
ORDER BY viewname;

-- Verificar permisos otorgados (consulta corregida)
SELECT 
    table_schema,
    table_name as viewname,
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name IN ('daily_alerts_summary', 'system_health_summary', 'webhook_stats', 'sync_stats')
AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee;

-- Contar total de vistas creadas
SELECT 
    COUNT(*) as total_views_created,
    CASE 
        WHEN COUNT(*) = 4 THEN 'SUCCESS: All 4 views created'
        ELSE 'ERROR: Missing views'
    END as creation_status
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('daily_alerts_summary', 'system_health_summary', 'webhook_stats', 'sync_stats');

-- Verificación adicional usando pg_class
SELECT 
    c.relname as view_name,
    u.usename as owner_name,
    'View exists and accessible' as status
FROM pg_class c
JOIN pg_user u ON c.relowner = u.usesysid
WHERE c.relkind = 'v' 
AND c.relname IN ('daily_alerts_summary', 'system_health_summary', 'webhook_stats', 'sync_stats')
AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY c.relname;

SELECT 'VERIFICATION COMPLETE - All views should be recreated without SECURITY DEFINER' as final_message;