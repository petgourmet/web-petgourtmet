-- Verificar permisos actuales
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'unified_subscriptions' 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Otorgar permisos de lectura al rol anon
GRANT SELECT ON unified_subscriptions TO anon;

-- Otorgar permisos completos al rol authenticated
GRANT ALL PRIVILEGES ON unified_subscriptions TO authenticated;

-- Otorgar permisos de actualización al rol anon (necesario para la activación)
GRANT UPDATE ON unified_subscriptions TO anon;

-- Verificar permisos después de otorgarlos
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'unified_subscriptions' 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;