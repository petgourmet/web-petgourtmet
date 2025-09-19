-- Otorgar permisos a la tabla billing_history
GRANT ALL PRIVILEGES ON billing_history TO authenticated;
GRANT SELECT ON billing_history TO anon;

-- Verificar permisos actuales
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'billing_history'
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;