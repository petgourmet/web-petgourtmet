-- ============================================================================
-- Script de Migración: Agrupar Productos con Variantes
-- Fecha: 2025-11-21
-- 
-- Este script:
-- 1. Elimina variantes antiguas de la migración automática ("400 gr")
-- 2. Crea variantes correctas para productos agrupados
-- 3. Elimina productos duplicados
-- 4. Actualiza nombres de productos principales
--
-- GRUPOS IDENTIFICADOS:
-- - Pastel de cumpleaños Amore Mio (4 variantes: Ternera, Pollo, Carne, Pollo Verduras)
-- - Pastel de cumpleaños Fiesta (2 variantes: Pollo, Carne)
-- - Pastel de cumpleaños Huella (3 variantes: Pollo Verduras, Pollo, Carne)
--
-- PRODUCTOS A ELIMINAR: 6 (IDs: 31, 82, 83, 87, 79, 80)
-- PRODUCTOS PRINCIPALES: 3 (IDs: 81, 36, 37)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASO 0: Migrar referencias en order_items y otras tablas
-- ============================================================================
-- Actualizar referencias de productos duplicados al producto principal
-- Esto evita violaciones de foreign key al eliminar productos

-- Migrar order_items de productos duplicados a productos principales
UPDATE order_items SET product_id = 81 WHERE product_id IN (31, 82, 83);
UPDATE order_items SET product_id = 36 WHERE product_id IN (87);
UPDATE order_items SET product_id = 37 WHERE product_id IN (79, 80);

-- ============================================================================
-- PASO 1: Eliminar variantes antiguas de la migración automática
-- ============================================================================
-- Estas son variantes con nombre "400 gr" que se crearon automáticamente
-- durante la migración del sistema anterior

DELETE FROM product_variants
WHERE name = '400 gr'
  AND created_at::date = '2025-11-21'
  AND product_id IN (31, 81, 82, 83, 36, 87, 37, 79, 80);

-- ============================================================================
-- GRUPO 1: Pastel de cumpleaños Amore Mio
-- Producto principal: ID 81
-- Variantes: Ternera, Pollo, Carne, Pollo Verduras
-- Productos a eliminar: 31, 82, 83
-- ============================================================================

-- Actualizar producto principal
UPDATE products
SET
  name = 'Pastel de cumpleaños Amore Mio',
  product_type = 'variable',
  updated_at = NOW()
WHERE id = 81;

-- Variante: Ternera
INSERT INTO product_variants (
  product_id,
  sku,
  name,
  price,
  stock,
  image,
  display_order,
  is_active,
  track_inventory,
  attributes
) VALUES (
  81,
  'pastel-amore-mio-ternera',
  'Ternera',
  319.00,
  0,
  'https://res.cloudinary.com/dn7unepxa/image/upload/v1749168981/products/mmh6tsvghyfryya6gnun.webp',
  1,
  true,
  true,
  '{"ingredient": "Ternera"}'::jsonb
);

-- Variante: Pollo
INSERT INTO product_variants (
  product_id,
  sku,
  name,
  price,
  stock,
  image,
  display_order,
  is_active,
  track_inventory,
  attributes
) VALUES (
  81,
  'pastel-amore-mio-pollo',
  'Pollo',
  319.00,
  20,
  'https://res.cloudinary.com/dn7unepxa/image/upload/v1749168981/products/mmh6tsvghyfryya6gnun.webp',
  2,
  true,
  true,
  '{"ingredient": "Pollo"}'::jsonb
);

-- Variante: Carne
INSERT INTO product_variants (
  product_id,
  sku,
  name,
  price,
  stock,
  image,
  display_order,
  is_active,
  track_inventory,
  attributes
) VALUES (
  81,
  'pastel-amore-mio-carne',
  'Carne',
  319.00,
  0,
  'https://res.cloudinary.com/dn7unepxa/image/upload/v1749168981/products/mmh6tsvghyfryya6gnun.webp',
  3,
  true,
  true,
  '{"ingredient": "Carne"}'::jsonb
);

-- Variante: Pollo Verduras
INSERT INTO product_variants (
  product_id,
  sku,
  name,
  price,
  stock,
  image,
  display_order,
  is_active,
  track_inventory,
  attributes
) VALUES (
  81,
  'pastel-amore-mio-pollo-verduras',
  'Pollo Verduras',
  319.00,
  0,
  'https://res.cloudinary.com/dn7unepxa/image/upload/v1749168981/products/mmh6tsvghyfryya6gnun.webp',
  4,
  true,
  true,
  '{"ingredient": "Pollo Verduras"}'::jsonb
);

-- Eliminar productos duplicados
DELETE FROM products WHERE id IN (31, 82, 83);

-- ============================================================================
-- GRUPO 2: Pastel de cumpleaños Fiesta
-- Producto principal: ID 36
-- Variantes: Pollo, Carne
-- Productos a eliminar: 87
-- ============================================================================

-- Actualizar producto principal
UPDATE products
SET
  name = 'Pastel de cumpleaños Fiesta',
  product_type = 'variable',
  updated_at = NOW()
WHERE id = 36;

-- Variante: Pollo
INSERT INTO product_variants (
  product_id,
  sku,
  name,
  price,
  stock,
  image,
  display_order,
  is_active,
  track_inventory,
  attributes
) VALUES (
  36,
  'pastel-fiesta-pollo',
  'Pollo',
  349.00,
  20,
  'https://res.cloudinary.com/dn7unepxa/image/upload/v1746640041/products/hjfzchwjxa1mmuj5qbmh.jpg',
  1,
  true,
  true,
  '{"ingredient": "Pollo"}'::jsonb
);

-- Variante: Carne
INSERT INTO product_variants (
  product_id,
  sku,
  name,
  price,
  stock,
  image,
  display_order,
  is_active,
  track_inventory,
  attributes
) VALUES (
  36,
  'pastel-fiesta-carne',
  'Carne',
  349.00,
  0,
  'https://res.cloudinary.com/dn7unepxa/image/upload/v1746640041/products/hjfzchwjxa1mmuj5qbmh.jpg',
  2,
  true,
  true,
  '{"ingredient": "Carne"}'::jsonb
);

-- Eliminar productos duplicados
DELETE FROM products WHERE id IN (87);

-- ============================================================================
-- GRUPO 3: Pastel de cumpleaños Huella
-- Producto principal: ID 37
-- Variantes: Pollo Verduras, Pollo, Carne
-- Productos a eliminar: 79, 80
-- ============================================================================

-- Actualizar producto principal
UPDATE products
SET
  name = 'Pastel de cumpleaños Huella',
  product_type = 'variable',
  updated_at = NOW()
WHERE id = 37;

-- Variante: Pollo Verduras
INSERT INTO product_variants (
  product_id,
  sku,
  name,
  price,
  stock,
  image,
  display_order,
  is_active,
  track_inventory,
  attributes
) VALUES (
  37,
  'pastel-huella-pollo-verduras',
  'Pollo Verduras',
  319.00,
  12,
  'https://res.cloudinary.com/dn7unepxa/image/upload/v1746640132/products/g6ekf60zmt0c5hr0o80y.jpg',
  1,
  true,
  true,
  '{"ingredient": "Pollo Verduras"}'::jsonb
);

-- Variante: Pollo
INSERT INTO product_variants (
  product_id,
  sku,
  name,
  price,
  stock,
  image,
  display_order,
  is_active,
  track_inventory,
  attributes
) VALUES (
  37,
  'pastel-huella-pollo',
  'Pollo',
  319.00,
  12,
  'https://res.cloudinary.com/dn7unepxa/image/upload/v1746640132/products/g6ekf60zmt0c5hr0o80y.jpg',
  2,
  true,
  true,
  '{"ingredient": "Pollo"}'::jsonb
);

-- Variante: Carne
INSERT INTO product_variants (
  product_id,
  sku,
  name,
  price,
  stock,
  image,
  display_order,
  is_active,
  track_inventory,
  attributes
) VALUES (
  37,
  'pastel-huella-carne',
  'Carne',
  319.00,
  12,
  'https://res.cloudinary.com/dn7unepxa/image/upload/v1746640132/products/g6ekf60zmt0c5hr0o80y.jpg',
  3,
  true,
  true,
  '{"ingredient": "Carne"}'::jsonb
);

-- Eliminar productos duplicados
DELETE FROM products WHERE id IN (79, 80);

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Ver productos agrupados
SELECT
  p.id,
  p.name,
  p.product_type,
  COUNT(pv.id) as variant_count
FROM products p
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE p.id IN (81, 36, 37)
GROUP BY p.id, p.name, p.product_type
ORDER BY p.id;

-- Ver variantes creadas
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
WHERE pv.product_id IN (81, 36, 37)
ORDER BY pv.product_id, pv.display_order;

COMMIT;

-- Si algo salió mal, ejecuta: ROLLBACK;

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Este script debe ejecutarse en Supabase SQL Editor
-- 2. Haz un backup de la base de datos antes de ejecutar
-- 3. El script usa una transacción (BEGIN/COMMIT) para seguridad
-- 4. Si algo sale mal, ejecuta ROLLBACK antes del COMMIT
-- 5. Las consultas de verificación al final muestran los resultados
-- 6. Total de productos eliminados: 6
-- 7. Total de variantes creadas: 9
-- 8. Total de productos principales: 3
-- ============================================================================
