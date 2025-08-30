-- Script para verificar los datos de product_name en order_items
-- Este script nos ayudará a entender por qué aparece "Producto sin nombre"

-- 1. Verificar algunos registros de order_items
SELECT 
    id,
    order_id,
    product_id,
    product_name,
    product_image,
    quantity,
    price,
    size
FROM order_items 
ORDER BY id DESC 
LIMIT 10;

-- 2. Verificar si hay registros con product_name NULL o vacío
SELECT 
    COUNT(*) as total_items,
    COUNT(CASE WHEN product_name IS NULL THEN 1 END) as null_names,
    COUNT(CASE WHEN product_name = '' THEN 1 END) as empty_names,
    COUNT(CASE WHEN product_name IS NOT NULL AND product_name != '' THEN 1 END) as valid_names
FROM order_items;

-- 3. Verificar algunos productos de la tabla products para comparar
SELECT 
    id,
    name,
    slug,
    price
FROM products 
ORDER BY id 
LIMIT 10;

-- 4. Verificar la relación entre order_items y products
SELECT 
    oi.id as order_item_id,
    oi.product_id,
    oi.product_name as order_item_product_name,
    p.name as product_table_name,
    oi.quantity,
    oi.price
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
ORDER BY oi.id DESC
LIMIT 10;

-- 5. Verificar órdenes recientes con sus items
SELECT 
    o.id as order_id,
    o.user_id,
    o.status,
    o.total,
    o.created_at,
    oi.product_name,
    oi.quantity,
    oi.price
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
ORDER BY o.created_at DESC
LIMIT 15;