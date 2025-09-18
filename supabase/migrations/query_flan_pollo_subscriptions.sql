-- Consultar suscripciones activas de Flan de Pollo
SELECT 
    id,
    product_name,
    status,
    subscription_type,
    discount_percentage,
    base_price,
    discounted_price,
    created_at,
    customer_data->>'name' as customer_name,
    customer_data->>'email' as customer_email
FROM unified_subscriptions 
WHERE product_name ILIKE '%Flan de Pollo%' 
    AND status = 'active' 
ORDER BY created_at DESC;