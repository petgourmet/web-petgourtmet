-- Consultar la suscripción más reciente para verificar los datos de precios
SELECT 
    id,
    product_name,
    base_price,
    discount_percentage,
    discounted_price,
    transaction_amount,
    quantity,
    status,
    created_at
FROM unified_subscriptions 
ORDER BY created_at DESC 
LIMIT 1;

-- Mostrar todos los campos de precio para debug
SELECT 
    'Datos de la suscripción más reciente:' as info;

SELECT 
    id,
    product_name,
    base_price,
    discount_percentage, 
    discounted_price,
    transaction_amount,
    quantity,
    status,
    created_at,
    CASE 
        WHEN base_price IS NULL THEN 'base_price es NULL'
        WHEN base_price = 0 THEN 'base_price es 0'
        ELSE 'base_price tiene valor: ' || base_price::text
    END as base_price_status,
    CASE 
        WHEN discounted_price IS NULL THEN 'discounted_price es NULL'
        WHEN discounted_price = 0 THEN 'discounted_price es 0'
        ELSE 'discounted_price tiene valor: ' || discounted_price::text
    END as discounted_price_status,
    CASE 
        WHEN transaction_amount IS NULL THEN 'transaction_amount es NULL'
        WHEN transaction_amount = 0 THEN 'transaction_amount es 0'
        ELSE 'transaction_amount tiene valor: ' || transaction_amount::text
    END as transaction_amount_status
FROM unified_subscriptions 
ORDER BY created_at DESC 
LIMIT 1;