-- =====================================================
-- SCRIPT PARA ENCONTRAR ÓRDENES REALES DE MERCADOPAGO
-- =====================================================

-- 1. Buscar tablas que contengan información de pagos/órdenes
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND (
    column_name ILIKE '%email%' OR
    column_name ILIKE '%payer%' OR 
    column_name ILIKE '%customer%' OR
    column_name ILIKE '%payment%' OR
    column_name ILIKE '%mercadopago%' OR
    column_name ILIKE '%total%' OR
    column_name ILIKE '%amount%'
  )
ORDER BY table_name, column_name;

-- =====================================================

-- 2. Buscar específicamente por el email de Cristofer
-- Ejecutar cada consulta por separado para encontrar dónde están las órdenes

-- Tabla: mercadopago_payments
SELECT 'mercadopago_payments' as tabla, COUNT(*) as registros
FROM mercadopago_payments 
WHERE payer_email = 'cristoferscalante@gmail.com' 
   OR customer_email = 'cristoferscalante@gmail.com'
   OR email = 'cristoferscalante@gmail.com';

-- Tabla: payments
SELECT 'payments' as tabla, COUNT(*) as registros
FROM payments 
WHERE payer_email = 'cristoferscalante@gmail.com' 
   OR customer_email = 'cristoferscalante@gmail.com'
   OR email = 'cristoferscalante@gmail.com';

-- Tabla: orders (si existe)
SELECT 'orders' as tabla, COUNT(*) as registros
FROM orders 
WHERE customer_email = 'cristoferscalante@gmail.com'
   OR payer_email = 'cristoferscalante@gmail.com';

-- Tabla: webhooks o notifications
SELECT 'webhooks' as tabla, COUNT(*) as registros
FROM webhooks 
WHERE payer_email = 'cristoferscalante@gmail.com'
   OR customer_email = 'cristoferscalante@gmail.com';

-- =====================================================

-- 3. Buscar en todas las tablas que contengan 'payment' en el nombre
SELECT 
    t.table_name,
    COUNT(c.column_name) as total_columns
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
  AND t.table_name ILIKE '%payment%'
GROUP BY t.table_name
ORDER BY t.table_name;

-- =====================================================

-- 4. Buscar en todas las tablas que contengan 'order' en el nombre
SELECT 
    t.table_name,
    COUNT(c.column_name) as total_columns
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
  AND t.table_name ILIKE '%order%'
GROUP BY t.table_name
ORDER BY t.table_name;

-- =====================================================

-- 5. Buscar en todas las tablas que contengan 'mercadopago' en el nombre
SELECT 
    t.table_name,
    COUNT(c.column_name) as total_columns
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
  AND t.table_name ILIKE '%mercadopago%'
GROUP BY t.table_name
ORDER BY t.table_name;

-- =====================================================

-- 6. Una vez identificada la tabla correcta, usar esta consulta de ejemplo:
-- (Reemplazar 'TABLA_CORRECTA' con el nombre real)

/*
-- Ejemplo de consulta para obtener órdenes de Cristofer
SELECT 
    id,
    customer_email,
    payer_email,
    customer_name,
    total,
    amount,
    transaction_amount,
    status,
    payment_status,
    collection_status,
    created_at,
    date_created,
    external_reference,
    payment_id,
    collection_id,
    preference_id
FROM TABLA_CORRECTA
WHERE (
    customer_email = 'cristoferscalante@gmail.com' OR
    payer_email = 'cristoferscalante@gmail.com' OR
    email = 'cristoferscalante@gmail.com'
)
ORDER BY created_at DESC, date_created DESC
LIMIT 20;
*/

-- =====================================================

-- 7. Verificar datos específicos de las órdenes mostradas en la imagen
-- Buscar por los IDs específicos que aparecen en la imagen

-- Buscar: #PG1753203404067
SELECT table_name, 'id' as field_type
FROM information_schema.tables t
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_name = t.table_name 
    AND c.table_schema = 'public'
    AND c.column_name IN ('id', 'external_reference', 'payment_id', 'collection_id')
);

-- =====================================================

-- 8. Script para insertar datos de prueba si no existen
/*
-- Solo ejecutar si necesitas crear datos de prueba
INSERT INTO orders (
    id,
    customer_email,
    customer_name,
    total,
    payment_status,
    status,
    created_at,
    external_reference
) VALUES 
(
    'PG1753203404067',
    'cristoferscalante@gmail.com',
    'cristofer scalante',
    137.48,
    'pending',
    'pending',
    '2025-07-22 11:56:00',
    '#PG1753203404067'
),
(
    'PG1753199669548',
    'cristoferscalante@gmail.com',
    'cristofer scalante',
    139.5,
    'pending',
    'cancelled',
    '2025-07-22 10:54:00',
    '#PG1753199669548'
);
*/
