-- Migración: Configurar RLS para unified_subscriptions
-- Fecha: 2025-10-28
-- Descripción: Permitir que usuarios lean sus propias suscripciones

-- 1. Habilitar RLS en la tabla (si no está habilitado)
ALTER TABLE unified_subscriptions ENABLE ROW LEVEL SECURITY;

-- 2. Crear policy para que usuarios puedan leer sus propias suscripciones
DROP POLICY IF EXISTS "Users can read own subscriptions" ON unified_subscriptions;
CREATE POLICY "Users can read own subscriptions"
ON unified_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Crear policy para que usuarios autenticados puedan leer suscripciones por email
DROP POLICY IF EXISTS "Users can read subscriptions by email" ON unified_subscriptions;
CREATE POLICY "Users can read subscriptions by email"
ON unified_subscriptions
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'email' = customer_email
);

-- 4. Policy para service_role (admin) - acceso completo
DROP POLICY IF EXISTS "Service role has full access" ON unified_subscriptions;
CREATE POLICY "Service role has full access"
ON unified_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Asegurar que la tabla products sea legible públicamente (necesario para JOINs)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Products are publicly readable" ON products;
CREATE POLICY "Products are publicly readable"
ON products
FOR SELECT
TO public
USING (true);

-- 6. Verificar policies creadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('unified_subscriptions', 'products')
ORDER BY tablename, policyname;
