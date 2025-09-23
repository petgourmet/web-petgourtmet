-- Verificación detallada del registro ID 60 y validación del external_reference
-- Fecha: 2025-01-23

-- 1. Verificar el registro ID 60 en detalle
SELECT 
    'VERIFICACIÓN REGISTRO ID 60' as seccion,
    id,
    user_id,
    status,
    external_reference,
    product_name,
    subscription_type,
    base_price,
    discounted_price,
    transaction_amount,
    CASE 
        WHEN customer_data IS NOT NULL THEN 'SÍ' 
        ELSE 'NO' 
    END as tiene_customer_data,
    CASE 
        WHEN cart_items IS NOT NULL THEN 'SÍ' 
        ELSE 'NO' 
    END as tiene_cart_items,
    created_at,
    updated_at,
    mercadopago_subscription_id
FROM unified_subscriptions 
WHERE id = 60;

-- 2. Buscar si existe algún registro con el external_reference del link de MercadoPago
SELECT 
    'BÚSQUEDA EXTERNAL_REFERENCE DEL LINK' as seccion,
    id,
    user_id,
    status,
    external_reference,
    product_name,
    created_at
FROM unified_subscriptions 
WHERE external_reference = '7aff2471329b4b66a6ba6ca91af7858b';

-- 3. Contar registros totales para el usuario
SELECT 
    'CONTEO TOTAL REGISTROS USUARIO' as seccion,
    COUNT(*) as total_registros,
    user_id
FROM unified_subscriptions 
WHERE user_id = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
GROUP BY user_id;

-- 4. Mostrar todos los registros del usuario para verificación final
SELECT 
    'TODOS LOS REGISTROS DEL USUARIO' as seccion,
    id,
    status,
    external_reference,
    product_name,
    subscription_type,
    created_at,
    updated_at
FROM unified_subscriptions 
WHERE user_id = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
ORDER BY created_at;

-- 5. Verificar si hay registros con external_reference similar al del link
SELECT 
    'BÚSQUEDA EXTERNAL_REFERENCE SIMILARES' as seccion,
    id,
    external_reference,
    status,
    product_name,
    created_at
FROM unified_subscriptions 
WHERE external_reference LIKE '%7aff2471329b4b66a6ba6ca91af7858b%'
   OR external_reference LIKE '%a6e7fb7dabb548f3ad42cbf545f007a9%'
   OR external_reference LIKE '%PG-SUB-1758559455654%';