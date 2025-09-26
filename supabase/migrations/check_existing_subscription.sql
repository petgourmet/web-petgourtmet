-- Consultar suscripción existente con external_reference específico
SELECT 
    id,
    user_id,
    external_reference,
    status,
    mercadopago_subscription_id,
    created_at,
    updated_at,
    product_id,
    customer_data
FROM unified_subscriptions 
WHERE external_reference = 'd4fd7b195ee646dfb45fa030461a91c8';

-- También verificar por user_id para ver todas las suscripciones del usuario
SELECT 
    id,
    user_id,
    external_reference,
    status,
    mercadopago_subscription_id,
    created_at,
    updated_at,
    product_id
FROM unified_subscriptions 
WHERE user_id = 'aefdfc64-cc93-4219-8ca5-a614a9e7bb84'
ORDER BY created_at DESC;