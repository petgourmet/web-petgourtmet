-- Verificar datos de la suscripción ID 36
SELECT 
    id,
    user_id,
    product_id,
    product_name,
    subscription_type,
    status,
    quantity,
    size,
    base_price,
    discounted_price,
    frequency,
    frequency_type,
    created_at,
    updated_at,
    next_billing_date,
    mercadopago_subscription_id,
    preapproval_plan_id
FROM user_subscriptions 
WHERE id = 36;