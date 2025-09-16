-- Eliminar políticas existentes que pueden estar causando conflictos
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON unified_subscriptions;
DROP POLICY IF EXISTS "Allow insert for system operations" ON unified_subscriptions;
DROP POLICY IF EXISTS "Allow read public subscriptions" ON unified_subscriptions;

-- Crear políticas más permisivas para unified_subscriptions

-- Política para permitir todas las operaciones a usuarios autenticados en sus propias suscripciones
CREATE POLICY "authenticated_users_all_operations" ON unified_subscriptions
    FOR ALL 
    TO authenticated
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Política para permitir lectura a usuarios anónimos
CREATE POLICY "anon_users_read_only" ON unified_subscriptions
    FOR SELECT 
    TO anon
    USING (true);

-- Política para permitir inserción a usuarios anónimos (para casos especiales)
CREATE POLICY "anon_users_insert" ON unified_subscriptions
    FOR INSERT 
    TO anon
    WITH CHECK (true);

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'unified_subscriptions';