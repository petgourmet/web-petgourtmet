-- Crear políticas RLS para billing_history

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "billing_history_insert_policy" ON billing_history;
DROP POLICY IF EXISTS "billing_history_select_policy" ON billing_history;
DROP POLICY IF EXISTS "billing_history_update_policy" ON billing_history;

-- Política para permitir inserción a usuarios autenticados y anónimos
CREATE POLICY "billing_history_insert_policy" ON billing_history
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- Política para permitir selección a usuarios autenticados y anónimos
CREATE POLICY "billing_history_select_policy" ON billing_history
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Política para permitir actualización a usuarios autenticados
CREATE POLICY "billing_history_update_policy" ON billing_history
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Verificar las políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'billing_history';