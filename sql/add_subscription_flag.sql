-- Script para agregar campo is_subscription a orders y actualizar datos existentes
-- Fecha: 2025-07-22

-- ============================================================================
-- PASO 1: Agregar campo is_subscription a tabla orders
-- ============================================================================

DO $$ 
BEGIN
    -- Verificar y agregar is_subscription
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'is_subscription') THEN
        ALTER TABLE orders ADD COLUMN is_subscription BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Agregada columna is_subscription';
    ELSE
        RAISE NOTICE 'Columna is_subscription ya existe';
    END IF;
END $$;

-- ============================================================================
-- PASO 2: Actualizar ordenes existentes que son suscripciones
-- ============================================================================

-- Actualizar ordenes que tienen frequency diferente de 'none' en shipping_address
UPDATE orders 
SET is_subscription = TRUE 
WHERE shipping_address IS NOT NULL 
  AND (
    shipping_address::text LIKE '%"frequency":"weekly"%' OR
    shipping_address::text LIKE '%"frequency":"monthly"%' OR
    shipping_address::text LIKE '%"frequency":"quarterly"%' OR
    shipping_address::text LIKE '%"frequency":"annual"%' OR
    (shipping_address::text LIKE '%"frequency"%' AND shipping_address::text NOT LIKE '%"frequency":"none"%')
  );

-- ============================================================================
-- PASO 3: Agregar indice para optimizar consultas
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_orders_is_subscription ON orders(is_subscription) WHERE is_subscription = TRUE;

-- ============================================================================
-- PASO 4: Verificacion
-- ============================================================================

DO $$
DECLARE
    subscription_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO subscription_count FROM orders WHERE is_subscription = TRUE;
    SELECT COUNT(*) INTO total_count FROM orders;
    
    RAISE NOTICE '=== VERIFICACION ===';
    RAISE NOTICE 'Total de ordenes: %', total_count;
    RAISE NOTICE 'Ordenes de suscripcion: %', subscription_count;
    RAISE NOTICE 'Campo is_subscription configurado correctamente';
END $$;
