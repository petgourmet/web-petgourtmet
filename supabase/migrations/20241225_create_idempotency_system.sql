-- Migración para el sistema de idempotencia unificado
-- Fase 1: Estabilización del sistema de suscripciones
-- Fecha: 2024-12-25

-- =====================================================
-- TABLA: idempotency_locks
-- Propósito: Gestionar locks distribuidos para operaciones idempotentes
-- =====================================================

CREATE TABLE IF NOT EXISTS idempotency_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  lock_id TEXT NOT NULL,
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  released_at TIMESTAMP WITH TIME ZONE,
  operation_id TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Constraints
  CONSTRAINT chk_expires_at_future CHECK (expires_at > acquired_at)
);

-- Índices para idempotency_locks
-- Índice único para locks activos (clave principal para evitar duplicados)
CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_locks_key_active 
  ON idempotency_locks(key) 
  WHERE released_at IS NULL;

-- Índice para limpieza automática de locks expirados
CREATE INDEX IF NOT EXISTS idx_idempotency_locks_expires_at 
  ON idempotency_locks(expires_at);

-- Índice para búsqueda por operation_id
CREATE INDEX IF NOT EXISTS idx_idempotency_locks_operation_id 
  ON idempotency_locks(operation_id);

-- Índice para búsqueda por lock_id (para liberación de locks)
CREATE INDEX IF NOT EXISTS idx_idempotency_locks_lock_id 
  ON idempotency_locks(lock_id);

-- =====================================================
-- TABLA: operation_logs
-- Propósito: Sistema de logging detallado para debugging y monitoreo
-- =====================================================

CREATE TABLE IF NOT EXISTS operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contexto de suscripción
  subscription_id UUID,
  user_id UUID,
  external_reference TEXT,
  
  -- Métricas de performance
  execution_time_ms INTEGER,
  memory_usage_mb NUMERIC(10,2),
  
  -- Información de debugging
  stack_trace TEXT,
  request_id TEXT,
  session_id TEXT,
  
  -- Constraints
  CONSTRAINT chk_execution_time_positive CHECK (execution_time_ms >= 0),
  CONSTRAINT chk_memory_usage_positive CHECK (memory_usage_mb >= 0)
);

-- Índices para operation_logs
-- Índice principal para búsqueda por operation_id
CREATE INDEX IF NOT EXISTS idx_operation_logs_operation_id 
  ON operation_logs(operation_id);

-- Índice para consultas temporales (más recientes primero)
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at 
  ON operation_logs(created_at DESC);

-- Índice para filtrado por nivel de log
CREATE INDEX IF NOT EXISTS idx_operation_logs_level 
  ON operation_logs(level);

-- Índice para búsqueda por external_reference
CREATE INDEX IF NOT EXISTS idx_operation_logs_external_reference 
  ON operation_logs(external_reference) 
  WHERE external_reference IS NOT NULL;

-- Índice para búsqueda por user_id
CREATE INDEX IF NOT EXISTS idx_operation_logs_user_id 
  ON operation_logs(user_id) 
  WHERE user_id IS NOT NULL;

-- Índice para búsqueda por subscription_id
CREATE INDEX IF NOT EXISTS idx_operation_logs_subscription_id 
  ON operation_logs(subscription_id) 
  WHERE subscription_id IS NOT NULL;

-- Índice compuesto para consultas de debugging por operación y tiempo
CREATE INDEX IF NOT EXISTS idx_operation_logs_operation_time 
  ON operation_logs(operation_type, created_at DESC);

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS en ambas tablas
ALTER TABLE idempotency_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;

-- Política para idempotency_locks: Solo acceso desde el backend
CREATE POLICY "Backend access only for idempotency_locks" ON idempotency_locks
  FOR ALL USING (auth.role() = 'service_role');

-- Política para operation_logs: Solo acceso desde el backend
CREATE POLICY "Backend access only for operation_logs" ON operation_logs
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- PERMISOS PARA ROLES
-- =====================================================

-- Otorgar permisos completos al rol de servicio
GRANT ALL PRIVILEGES ON idempotency_locks TO service_role;
GRANT ALL PRIVILEGES ON operation_logs TO service_role;

-- Otorgar permisos de lectura al rol autenticado (para debugging)
GRANT SELECT ON operation_logs TO authenticated;

-- =====================================================
-- FUNCIONES AUXILIARES
-- =====================================================

-- Función para limpiar locks expirados automáticamente
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  UPDATE idempotency_locks 
  SET released_at = NOW()
  WHERE released_at IS NULL 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  -- Log de la operación de limpieza
  INSERT INTO operation_logs (
    operation_id,
    operation_type,
    level,
    message,
    details,
    execution_time_ms
  ) VALUES (
    gen_random_uuid()::text,
    'cleanup_expired_locks',
    'info',
    'Limpieza automática de locks expirados',
    jsonb_build_object('cleaned_count', cleaned_count),
    0
  );
  
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de locks
CREATE OR REPLACE FUNCTION get_lock_statistics()
RETURNS TABLE (
  total_locks BIGINT,
  active_locks BIGINT,
  expired_locks BIGINT,
  released_locks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_locks,
    COUNT(*) FILTER (WHERE released_at IS NULL AND expires_at > NOW()) as active_locks,
    COUNT(*) FILTER (WHERE released_at IS NULL AND expires_at <= NOW()) as expired_locks,
    COUNT(*) FILTER (WHERE released_at IS NOT NULL) as released_locks
  FROM idempotency_locks;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE idempotency_locks IS 'Tabla para gestionar locks distribuidos en operaciones idempotentes del sistema de suscripciones';
COMMENT ON TABLE operation_logs IS 'Tabla para logging detallado de operaciones del sistema de idempotencia';

COMMENT ON COLUMN idempotency_locks.key IS 'Clave única para identificar la operación idempotente';
COMMENT ON COLUMN idempotency_locks.lock_id IS 'Identificador único del lock para liberación segura';
COMMENT ON COLUMN idempotency_locks.operation_id IS 'ID de la operación asociada para trazabilidad';
COMMENT ON COLUMN idempotency_locks.metadata IS 'Información adicional sobre el lock (intentos, configuración, etc.)';

COMMENT ON COLUMN operation_logs.operation_id IS 'Identificador único de la operación para agrupar logs relacionados';
COMMENT ON COLUMN operation_logs.operation_type IS 'Tipo de operación (idempotency_start, validation, etc.)';
COMMENT ON COLUMN operation_logs.details IS 'Información detallada de la operación en formato JSON';
COMMENT ON COLUMN operation_logs.external_reference IS 'Referencia externa de MercadoPago para correlación';

-- =====================================================
-- FINALIZACIÓN
-- =====================================================

-- Verificar que las tablas se crearon correctamente
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'idempotency_locks') THEN
    RAISE EXCEPTION 'Error: Tabla idempotency_locks no fue creada';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'operation_logs') THEN
    RAISE EXCEPTION 'Error: Tabla operation_logs no fue creada';
  END IF;
  
  RAISE NOTICE 'Migración completada exitosamente: Sistema de idempotencia unificado creado';
END $$;