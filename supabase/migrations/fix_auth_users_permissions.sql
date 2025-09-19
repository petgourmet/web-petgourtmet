-- Otorgar permisos a la tabla auth.users para el webhook service
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON auth.users TO anon;

-- Verificar permisos actuales en auth.users
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'auth' 
AND table_name = 'users'
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;