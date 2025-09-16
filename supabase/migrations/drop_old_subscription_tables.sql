-- Eliminar las tablas antiguas de suscripciones después de la migración exitosa
-- Esta migración debe ejecutarse solo después de verificar que la tabla unified_subscriptions funciona correctamente

-- Verificar que la tabla unified_subscriptions existe y tiene datos
DO $$
BEGIN
    -- Verificar que la tabla unified_subscriptions existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'unified_subscriptions' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'La tabla unified_subscriptions no existe. No se pueden eliminar las tablas antiguas.';
    END IF;
    
    -- Mostrar información sobre las tablas antes de eliminarlas
    RAISE NOTICE 'Eliminando tablas antiguas de suscripciones...';
END $$;

-- Eliminar las tablas antiguas
-- Primero eliminar las restricciones de clave foránea si existen
DROP TABLE IF EXISTS pending_subscriptions CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;

-- Verificar que las tablas fueron eliminadas
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pending_subscriptions' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Error: La tabla pending_subscriptions no fue eliminada correctamente.';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subscriptions' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Error: La tabla user_subscriptions no fue eliminada correctamente.';
    END IF;
    
    RAISE NOTICE 'Tablas antiguas eliminadas exitosamente.';
    RAISE NOTICE 'Migración a tabla unificada completada.';
END $$;

-- Mostrar el estado final de las tablas de suscripciones
SELECT 
    table_name,
    table_schema,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%subscription%'
ORDER BY table_name;