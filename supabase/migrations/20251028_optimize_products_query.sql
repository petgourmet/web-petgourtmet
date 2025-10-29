-- Optimización de consultas de productos
-- Crear índices para mejorar el rendimiento de las consultas más comunes

-- Índice para filtrar por stock > 0 y ordenar por created_at
CREATE INDEX IF NOT EXISTS idx_products_stock_created 
ON products(stock, created_at DESC) 
WHERE stock > 0;

-- Índice para filtrar por categoría y stock
CREATE INDEX IF NOT EXISTS idx_products_category_stock 
ON products(category_id, stock) 
WHERE stock > 0;

-- Índice compuesto para la consulta principal (categoría + stock + orden)
CREATE INDEX IF NOT EXISTS idx_products_category_stock_created 
ON products(category_id, stock, created_at DESC) 
WHERE stock > 0;

-- Comentarios para documentar
COMMENT ON INDEX idx_products_stock_created IS 'Optimiza consultas de todos los productos con stock ordenados por fecha';
COMMENT ON INDEX idx_products_category_stock IS 'Optimiza filtrado por categoría con stock disponible';
COMMENT ON INDEX idx_products_category_stock_created IS 'Optimiza la consulta principal de productos por categoría con stock';
