-- Otorgar permisos para la tabla unified_subscriptions
-- Permitir acceso a usuarios anónimos y autenticados

-- Otorgar permisos básicos de lectura al rol anon
GRANT SELECT ON unified_subscriptions TO anon;

-- Otorgar todos los privilegios al rol authenticated
GRANT ALL PRIVILEGES ON unified_subscriptions TO authenticated;

-- Crear políticas RLS para permitir acceso apropiado

-- Política para usuarios autenticados: pueden ver y modificar sus propias suscripciones
CREATE POLICY "Users can manage their own subscriptions" ON unified_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Política para permitir inserción de suscripciones sin user_id (para casos especiales)
CREATE POLICY "Allow insert for system operations" ON unified_subscriptions
    FOR INSERT WITH CHECK (true);

-- Política para permitir lectura de suscripciones públicas (sin user_id)
CREATE POLICY "Allow read public subscriptions" ON unified_subscriptions
    FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

-- Verificar permisos actuales
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'unified_subscriptions'
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;