-- ============================================================================
-- Script de Limpieza: Eliminar TODAS las variantes antiguas
-- Fecha: 2025-11-21
-- 
-- Elimina todas las variantes que no son de ingredientes
-- (400g, 480g, 400 gr, etc.)
-- ============================================================================

BEGIN;

-- Ver todas las variantes actuales antes de eliminar
SELECT
  pv.id,
  pv.product_id,
  p.name as product_name,
  pv.name as variant_name,
  pv.created_at
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
ORDER BY pv.product_id, pv.created_at;

-- Eliminar TODAS las variantes que NO son de ingredientes
-- (mantener solo: Pollo, Carne, Ternera, Pollo Verduras, etc.)
DELETE FROM product_variants 
WHERE name NOT IN (
  'Pollo',
  'Carne', 
  'Ternera',
  'Pollo Verduras',
  'Carne Verduras',
  'Cordero',
  'Atún',
  'Hígado',
  'Cordero y Espinaca',
  'Ternera y Zanahoria'
)
AND product_id IN (28, 31, 36, 37, 44, 45, 46, 47, 49, 50, 51, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 65, 66, 69, 70, 71, 72, 74, 79, 80, 81, 82, 83, 87);

-- Verificar que solo quedan las variantes correctas
SELECT
  pv.id,
  pv.product_id,
  p.name as product_name,
  pv.name as variant_name,
  pv.price,
  pv.stock,
  pv.display_order
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
ORDER BY pv.product_id, pv.display_order;

COMMIT;

-- Si algo salió mal, ejecuta: ROLLBACK;
