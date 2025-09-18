-- Consulta simple para verificar datos actuales de unified_subscriptions

-- 1. Verificar registros existentes y relación con usuarios
SELECT 
    us.id,
    us.external_reference,
    us.status,
    us.user_id,
    au.email as user_email,
    us.customer_data->>'email' as customer_email,
    us.customer_data->>'name' as customer_name,
    us.product_name,
    us.base_price,
    us.discounted_price,
    us.size,
    us.quantity,
    us.subscription_type,
    us.created_at,
    us.next_billing_date,
    us.mercadopago_subscription_id
FROM unified_subscriptions us
LEFT JOIN auth.users au ON us.user_id = au.id
ORDER BY us.created_at DESC
LIMIT 10;

-- 2. Contar registros por estado
SELECT 
    status,
    COUNT(*) as cantidad
FROM unified_subscriptions
GROUP BY status
ORDER BY cantidad DESC;

-- 3. Verificar datos faltantes críticos
SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as sin_user_id,
    COUNT(CASE WHEN external_reference IS NULL THEN 1 END) as sin_external_reference,
    COUNT(CASE WHEN customer_data IS NULL THEN 1 END) as sin_customer_data,
    COUNT(CASE WHEN customer_data->>'email' IS NULL THEN 1 END) as sin_email_customer,
    COUNT(CASE WHEN product_name IS NULL THEN 1 END) as sin_product_name,
    COUNT(CASE WHEN base_price IS NULL THEN 1 END) as sin_base_price
FROM unified_subscriptions;