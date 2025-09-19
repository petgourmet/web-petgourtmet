-- Verificación final: confirmar que las vistas NO tienen SECURITY DEFINER

-- Verificar que las vistas existen y NO tienen SECURITY DEFINER
SELECT 
    schemaname,
    viewname,
    viewowner,
    CASE 
        WHEN definition LIKE '%SECURITY DEFINER%' THEN 'ERROR: STILL HAS SECURITY DEFINER'
        ELSE 'SUCCESS: NO SECURITY DEFINER'
    END as security_status,
    LENGTH(definition) as definition_length
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('daily_alerts_summary', 'system_health_summary', 'webhook_stats', 'sync_stats')
ORDER BY viewname;

-- Verificar permisos otorgados
SELECT 
    schemaname,
    tablename as viewname,
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name IN ('daily_alerts_summary', 'system_health_summary', 'webhook_stats', 'sync_stats')
AND grantee IN ('anon', 'authenticated')
ORDER BY tablename, grantee;

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

SELECT 'VERIFICATION COMPLETE - Check results above' as final_message;