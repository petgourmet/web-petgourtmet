-- Verificar permisos actuales para la tabla orders
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'orders' 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Otorgar permisos necesarios a los roles
-- Para usuarios anónimos (solo lectura básica si es necesario)
GRANT SELECT ON orders TO anon;

-- Para usuarios autenticados (acceso completo)
GRANT ALL PRIVILEGES ON orders TO authenticated;

-- Verificar permisos después de otorgarlos
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'orders' 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;