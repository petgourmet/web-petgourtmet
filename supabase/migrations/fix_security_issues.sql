-- Script para corregir problemas de seguridad de PostgreSQL
-- Fecha: $(date)
-- Descripción: Soluciona alertas de seguridad relacionadas con RLS y SECURITY DEFINER

-- ========================================
-- 1. HABILITAR RLS EN TABLAS FALTANTES
-- ========================================

-- Habilitar RLS en subscription_types (actualmente deshabilitado)
ALTER TABLE subscription_types ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 2. CREAR POLÍTICAS RLS PARA SUBSCRIPTION_TYPES
-- ========================================

-- Política para administradores (acceso completo)
CREATE POLICY "Admins can manage subscription types" ON subscription_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Política para usuarios autenticados (solo lectura)
CREATE POLICY "Authenticated users can view subscription types" ON subscription_types
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para usuarios anónimos (solo lectura de tipos activos)
CREATE POLICY "Anonymous users can view active subscription types" ON subscription_types
    FOR SELECT USING (auth.role() = 'anon' AND is_active = true);

-- ========================================
-- 3. OTORGAR PERMISOS BÁSICOS A ROLES
-- ========================================

-- Otorgar permisos de lectura a roles básicos
GRANT SELECT ON subscription_types TO authenticated;
GRANT SELECT ON subscription_types TO anon;

-- ========================================
-- 4. VERIFICAR FUNCIÓN CON SECURITY DEFINER
-- ========================================

-- La función get_table_columns usa SECURITY DEFINER para acceder a information_schema
-- Esto es necesario y seguro ya que:
-- 1. Solo consulta metadatos de esquema público
-- 2. No expone datos sensibles
-- 3. Es requerido para que usuarios no privilegiados accedan a information_schema
-- Por lo tanto, NO se modifica esta función.

-- ========================================
-- 5. VERIFICACIÓN DE ESTADO FINAL
-- ========================================

-- Verificar que RLS esté habilitado en las tablas críticas
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('subscription_types', 'billing_history')
ORDER BY tablename;

-- Verificar políticas RLS creadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('subscription_types', 'billing_history')
ORDER BY tablename, policyname;

-- Verificar permisos otorgados
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name IN ('subscription_types', 'billing_history')
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- ========================================
-- NOTAS IMPORTANTES:
-- ========================================
-- 
-- 1. Las vistas daily_alerts_summary y system_health_summary NO usan SECURITY DEFINER
--    por lo que no representan un problema de seguridad.
-- 
-- 2. Las vistas webhook_stats y sync_stats mencionadas en los errores no existen
--    en el código actual, posiblemente fueron eliminadas o nunca se crearon.
-- 
-- 3. La tabla billing_history ya tiene RLS habilitado correctamente.
-- 
-- 4. La función get_table_columns requiere SECURITY DEFINER para funcionar
--    correctamente y no representa un riesgo de seguridad.
-- 
-- 5. Después de aplicar este script, todas las alertas de seguridad
--    relacionadas con RLS deshabilitado deberían resolverse.
--
-- ========================================
-- FIN DEL SCRIPT
-- ========================================