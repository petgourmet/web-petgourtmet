-- Migración para optimizar las consultas de productos
-- Fecha: 2025-01-16
-- Descripción: Crear índices para mejorar el rendimiento de las consultas más comunes

-- Índice compuesto para productos por categoría (consulta más común)
CREATE INDEX IF NOT EXISTS idx_products_category_id_featured 
ON products (category_id, featured DESC, created_at DESC);

-- Índice para búsquedas por slug de producto
CREATE INDEX IF NOT EXISTS idx_products_slug 
ON products (slug);

-- Índice para productos destacados
CREATE INDEX IF NOT EXISTS idx_products_featured_created_at 
ON products (featured DESC, created_at DESC) 
WHERE featured = true;

-- Índice para product_features por product_id (optimizar JOIN)
CREATE INDEX IF NOT EXISTS idx_product_features_product_id 
ON product_features (product_id);

-- Índice para product_images por product_id con orden de display
CREATE INDEX IF NOT EXISTS idx_product_images_product_id_display_order 
ON product_images (product_id, display_order ASC);

-- Índice para product_sizes por product_id
CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id 
ON product_sizes (product_id);

-- Índice para categorías por slug
CREATE INDEX IF NOT EXISTS idx_categories_slug 
ON categories (slug);

-- Índice compuesto para productos con stock disponible
CREATE INDEX IF NOT EXISTS idx_products_stock_category 
ON products (category_id, stock) 
WHERE stock > 0;

-- Índice para productos con suscripción disponible
CREATE INDEX IF NOT EXISTS idx_products_subscription_available 
ON products (subscription_available, category_id) 
WHERE subscription_available = true;

-- Índice para búsquedas de texto en nombre y descripción de productos
CREATE INDEX IF NOT EXISTS idx_products_search_text 
ON products USING gin(to_tsvector('spanish', name || ' ' || description));

-- Comentarios sobre los índices creados
COMMENT ON INDEX idx_products_category_id_featured IS 'Optimiza consultas de productos por categoría ordenados por destacados y fecha';
COMMENT ON INDEX idx_products_slug IS 'Optimiza búsquedas de productos por slug';
COMMENT ON INDEX idx_products_featured_created_at IS 'Optimiza consultas de productos destacados';
COMMENT ON INDEX idx_product_features_product_id IS 'Optimiza JOIN entre productos y características';
COMMENT ON INDEX idx_product_images_product_id_display_order IS 'Optimiza JOIN entre productos e imágenes con orden';
COMMENT ON INDEX idx_product_sizes_product_id IS 'Optimiza JOIN entre productos y tamaños';
COMMENT ON INDEX idx_categories_slug IS 'Optimiza búsquedas de categorías por slug';
COMMENT ON INDEX idx_products_stock_category IS 'Optimiza consultas de productos con stock por categoría';
COMMENT ON INDEX idx_products_subscription_available IS 'Optimiza consultas de productos con suscripción';
COMMENT ON INDEX idx_products_search_text IS 'Optimiza búsquedas de texto completo en productos';