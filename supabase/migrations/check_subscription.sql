-- Consulta para verificar la suscripción con external_reference específico
SELECT 
    id,
    user_id,
    external_reference,
    status,
    subscription_type,
    product_name,
    discounted_price,
    mercadopago_subscription_id,
    created_at,
    updated_at
FROM unified_subscriptions 
WHERE external_reference = '8ee90c1d78554c9faa3c0531fcbaaeb7';

-- También verificar todas las suscripciones pendientes
SELECT 
    id,
    user_id,
    external_reference,
    status,
    subscription_type,
    product_name,
    discounted_price,
    mercadopago_subscription_id,
    created_at,
    updated_at
FROM unified_subscriptions 
WHERE status = 'pending'
ORDER BY created_at DESC;