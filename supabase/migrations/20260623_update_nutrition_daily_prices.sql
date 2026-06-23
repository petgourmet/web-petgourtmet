-- ============================================================
-- Actualizar precios e imágenes de paquetes "Nutrición diaria" a $800 MXN
-- Fecha: 23 de junio de 2026
-- ============================================================

-- Los paquetes de "Nutrición diaria" son de 6 porciones × 80g = 480g
-- Nuevo precio: $800 MXN por paquete
-- Nuevas imágenes: /cacu/*.png (locales en public/)

-- Actualizar precio e imagen de Nutrición diaria Pollo Verduras
UPDATE products
SET 
  price = 800.00,
  image = '/cacu/pollo-ver.png',
  updated_at = NOW()
WHERE slug = 'pastel-porcin-de-pollo-verduras-hippo';

-- Actualizar precio e imagen de Nutrición diaria Carne Verduras
UPDATE products
SET 
  price = 800.00,
  image = '/cacu/carne-ver.png',
  updated_at = NOW()
WHERE slug = 'pastel-porcin-de-carne-y-verduras-dante';

-- Actualizar precio e imagen de Nutrición diaria Ternera y Espinaca
UPDATE products
SET 
  price = 800.00,
  image = '/cacu/ternera-espi.png',
  updated_at = NOW()
WHERE slug = 'pastel-porcin-de-ternera-y-espinca-anabella';

-- Si existe el producto de Cerdo Verduras, también actualizarlo
UPDATE products
SET 
  price = 800.00,
  image = '/cacu/cerdo-ver.png',
  updated_at = NOW()
WHERE slug LIKE '%cerdo-verduras%' AND name LIKE '%Nutrición diaria%';

-- Verificar los cambios
SELECT 
  id,
  name,
  slug,
  price,
  image,
  updated_at
FROM products
WHERE slug IN (
  'pastel-porcin-de-pollo-verduras-hippo',
  'pastel-porcin-de-carne-y-verduras-dante',
  'pastel-porcin-de-ternera-y-espinca-anabella'
)
OR (slug LIKE '%cerdo-verduras%' AND name LIKE '%Nutrición diaria%');
