-- Migración para crear tablas de idempotencia
-- Fecha: 2025-01-23
-- Descripción: Crear tablas para locks distribuidos y resultados de operaciones idempotentes

-- 1. Crear tabla para locks distribuidos
CREATE TABLE IF NOT EXISTS idempotency_locks (
    id BIGSERIAL PRIMARY KEY,
    lock_key TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Crear tabla para resultados de operaciones
CREATE TABLE IF NOT EXISTS idempotency_results (
    id BIGSERIAL PRIMARY KEY,
    operation_key TEXT NOT NULL UNIQUE,
    result_data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_idempotency_locks_expires_at 
ON idempotency_locks (expires_at);

CREATE INDEX IF NOT EXISTS idx_idempotency_results_expires_at 
ON idempotency_results (expires_at);

CREATE INDEX IF NOT EXISTS idx_idempotency_results_operation_key_expires 
ON idempotency_results (operation_key, expires_at);

-- 4. Configurar RLS (Row Level Security)
ALTER TABLE idempotency_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_results ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas de acceso
-- Permitir acceso completo a usuarios autenticados para locks
CREATE POLICY "Allow authenticated users to manage locks" ON idempotency_locks
    FOR ALL USING (auth.role() = 'authenticated');

-- Permitir acceso completo a usuarios autenticados para resultados
CREATE POLICY "Allow authenticated users to manage results" ON idempotency_results
    FOR ALL USING (auth.role() = 'authenticated');

-- 6. Otorgar permisos a los roles
GRANT ALL PRIVILEGES ON idempotency_locks TO authenticated;
GRANT ALL PRIVILEGES ON idempotency_results TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE idempotency_locks_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE idempotency_results_id_seq TO authenticated;

-- También permitir acceso a anon para casos donde se necesite
GRANT SELECT, INSERT, UPDATE, DELETE ON idempotency_locks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON idempotency_results TO anon;
GRANT USAGE, SELECT ON SEQUENCE idempotency_locks_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE idempotency_results_id_seq TO anon;

-- 7. Crear función para limpieza automática de registros expirados
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_records()
RETURNS INTEGER AS $$
DECLARE
    deleted_locks INTEGER;
    deleted_results INTEGER;
    total_deleted INTEGER;
BEGIN
    -- Limpiar locks expirados
    DELETE FROM idempotency_locks WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_locks = ROW_COUNT;
    
    -- Limpiar resultados expirados
    DELETE FROM idempotency_results WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_results = ROW_COUNT;
    
    total_deleted := deleted_locks + deleted_results;
    
    -- Log de la limpieza
    RAISE NOTICE 'Limpieza de idempotencia: % locks eliminados, % resultados eliminados, % total', 
        deleted_locks, deleted_results, total_deleted;
    
    RETURN total_deleted;
END;
$$ LANGUAGE plpgsql;

-- 8. Verificar que las tablas se crearon correctamente
SELECT 
    'TABLES_VERIFICATION' as check_type,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('idempotency_locks', 'idempotency_results')
ORDER BY table_name;

-- 9. Verificar índices creados
SELECT 
    'INDEXES_VERIFICATION' as check_type,
    indexname,
    tablename
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename IN ('idempotency_locks', 'idempotency_results')
ORDER BY tablename, indexname;

-- 10. Mostrar estadísticas iniciales
SELECT 
    'INITIAL_STATS' as check_type,
    'idempotency_locks' as table_name,
    COUNT(*) as record_count
FROM idempotency_locks
UNION ALL
SELECT 
    'INITIAL_STATS' as check_type,
    'idempotency_results' as table_name,
    COUNT(*) as record_count
FROM idempotency_results;