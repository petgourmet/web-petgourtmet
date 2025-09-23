-- Migración para mejorar el constraint único en unified_subscriptions
-- Fecha: 2025-01-23
-- Descripción: Crear constraint único compuesto más robusto para prevenir duplicados

-- 1. Primero verificar si existe algún constraint único previo
SELECT 
    'EXISTING_CONSTRAINTS' as check_type,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.unified_subscriptions'::regclass 
    AND contype = 'u';

-- 2. Eliminar constraint único previo si existe (para recrearlo mejorado)
DO $$ 
BEGIN
    -- Intentar eliminar constraint previo si existe
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.unified_subscriptions'::regclass 
        AND conname = 'unique_user_external_reference'
    ) THEN
        ALTER TABLE unified_subscriptions DROP CONSTRAINT unique_user_external_reference;
        RAISE NOTICE 'Constraint único previo eliminado';
    END IF;
END $$;

-- 3. Limpiar registros duplicados antes de crear el nuevo constraint
-- Eliminar duplicados manteniendo el más reciente por user_id + product_id + external_reference
WITH duplicates AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, product_id, external_reference 
            ORDER BY 
                CASE WHEN status = 'active' THEN 1 ELSE 2 END,
                updated_at DESC NULLS LAST,
                created_at DESC
        ) as rn
    FROM unified_subscriptions
    WHERE user_id IS NOT NULL 
        AND product_id IS NOT NULL 
        AND external_reference IS NOT NULL
        AND external_reference != ''
)
DELETE FROM unified_subscriptions 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- 4. Crear constraint único mejorado (user_id + product_id + external_reference)
-- Este constraint es más específico y previene duplicados de manera más efectiva
ALTER TABLE unified_subscriptions 
ADD CONSTRAINT unique_user_product_external_reference 
UNIQUE (user_id, product_id, external_reference);

-- 5. Crear índice parcial para mejorar rendimiento en consultas de validación
-- Nota: Removido CONCURRENTLY para compatibilidad con transacciones
CREATE INDEX IF NOT EXISTS idx_unified_subscriptions_validation
ON unified_subscriptions (user_id, product_id, status)
WHERE status IN ('pending', 'active');

-- 6. Verificar que el nuevo constraint se creó correctamente
SELECT 
    'NEW_CONSTRAINT_VERIFICATION' as check_type,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.unified_subscriptions'::regclass 
    AND conname = 'unique_user_product_external_reference';

-- 7. Verificar que no quedan duplicados
SELECT 
    'DUPLICATE_CHECK' as check_type,
    COUNT(*) as total_records,
    COUNT(DISTINCT (user_id, product_id, external_reference)) as unique_combinations,
    COUNT(*) - COUNT(DISTINCT (user_id, product_id, external_reference)) as potential_duplicates
FROM unified_subscriptions
WHERE user_id IS NOT NULL 
    AND product_id IS NOT NULL 
    AND external_reference IS NOT NULL
    AND external_reference != '';

-- 8. Mostrar estadísticas finales
SELECT 
    'FINAL_STATS' as check_type,
    status,
    COUNT(*) as count
FROM unified_subscriptions
GROUP BY status
ORDER BY status;