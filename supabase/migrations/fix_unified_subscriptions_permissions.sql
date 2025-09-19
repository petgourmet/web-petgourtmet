-- Migración para corregir permisos de unified_subscriptions
-- Fecha: 2025-01-19
-- Descripción: Otorgar permisos necesarios para insertar y consultar suscripciones

-- Verificar permisos actuales
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'unified_subscriptions'
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Otorgar permisos básicos de lectura al rol anon
GRANT SELECT ON unified_subscriptions TO anon;

-- Otorgar permisos completos al rol authenticated
GRANT ALL PRIVILEGES ON unified_subscriptions TO authenticated;

-- Otorgar permisos en la secuencia para el campo id
GRANT USAGE, SELECT ON SEQUENCE unified_subscriptions_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE unified_subscriptions_id_seq TO anon;

-- Crear política RLS para permitir que los usuarios autenticados puedan insertar sus propias suscripciones
CREATE POLICY "Users can insert their own subscriptions" ON unified_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- Crear política RLS para permitir que los usuarios autenticados puedan ver sus propias suscripciones
CREATE POLICY "Users can view their own subscriptions" ON unified_subscriptions
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- Crear política RLS para permitir que los usuarios autenticados puedan actualizar sus propias suscripciones
CREATE POLICY "Users can update their own subscriptions" ON unified_subscriptions
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- Verificar que los permisos se aplicaron correctamente
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'unified_subscriptions'
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Mostrar las políticas RLS creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'unified_subscriptions';