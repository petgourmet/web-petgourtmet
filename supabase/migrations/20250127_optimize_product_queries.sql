-- Migración para optimizar las consultas de productos - Versión Mejorada
-- Fecha: 2025-01-27
-- Descripción: Crear índices adicionales para mejorar el rendimiento de las consultas más comunes

-- Índice compuesto para productos por categoría con stock (consulta más común)
CREATE INDEX IF NOT EXISTS idx_products_category_stock_featured 
ON products (category_id, stock, featured DESC, created_at DESC) 
WHERE stock > 0;

-- Habilitar extensión pg_trgm si no está habilitada
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice para búsquedas por nombre de producto (búsquedas parciales)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm 
ON products USING gin (name gin_trgm_ops);

-- Índice para product_features con nombre (optimizar filtros por características)
CREATE INDEX IF NOT EXISTS idx_product_features_product_id_name 
ON product_features (product_id, name);

-- Índice para product_images optimizado para galería principal
CREATE INDEX IF NOT EXISTS idx_product_images_product_id_primary 
ON product_images (product_id, display_order ASC) 
WHERE display_order <= 5;

-- Índice para product_sizes con precio (optimizar filtros por precio)
CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id_price 
ON product_sizes (product_id, price ASC);

-- Índice para productos por rating (productos mejor valorados)
CREATE INDEX IF NOT EXISTS idx_products_rating_reviews 
ON products (average_rating DESC, review_count DESC) 
WHERE average_rating IS NOT NULL AND review_count > 0;

-- Índice para productos con descuentos de suscripción
CREATE INDEX IF NOT EXISTS idx_products_subscription_discounts 
ON products (subscription_available, monthly_discount, quarterly_discount, annual_discount) 
WHERE subscription_available = true;

-- Vista materializada para productos populares (actualizar cada hora)
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_products AS
SELECT 
    p.id,
    p.name,
    p.slug,
    p.price,
    p.image,
    p.category_id,
    p.average_rating,
    p.review_count,
    p.stock,
    c.name as category_name,
    c.slug as category_slug
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.stock > 0 
    AND p.average_rating >= 4.0 
    AND p.review_count >= 5
ORDER BY p.average_rating DESC, p.review_count DESC
LIMIT 50;

-- Índice único para la vista materializada
CREATE UNIQUE INDEX IF NOT EXISTS idx_popular_products_id 
ON popular_products (id);

-- Función para refrescar la vista materializada
CREATE OR REPLACE FUNCTION refresh_popular_products()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_products;
END;
$$ LANGUAGE plpgsql;

-- Comentarios sobre los nuevos índices y vistas
COMMENT ON INDEX idx_products_category_stock_featured IS 'Optimiza consultas de productos por categoría con stock disponible';
COMMENT ON INDEX idx_products_name_trgm IS 'Optimiza búsquedas parciales por nombre de producto usando trigrams';
COMMENT ON INDEX idx_product_features_product_id_name IS 'Optimiza filtros por características específicas';
COMMENT ON INDEX idx_product_images_product_id_primary IS 'Optimiza carga de imágenes principales de productos';
COMMENT ON INDEX idx_product_sizes_product_id_price IS 'Optimiza filtros por precio en diferentes tamaños';
COMMENT ON INDEX idx_products_rating_reviews IS 'Optimiza consultas de productos mejor valorados';
COMMENT ON INDEX idx_products_subscription_discounts IS 'Optimiza consultas de productos con descuentos de suscripción';
COMMENT ON MATERIALIZED VIEW popular_products IS 'Vista materializada de productos populares para carga rápida';
COMMENT ON FUNCTION refresh_popular_products() IS 'Función para actualizar la vista de productos populares';