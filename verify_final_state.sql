-- Verificar el estado final del usuario después del flujo de activación
SELECT 
    id,
    email,
    full_name,
    has_active_subscription,
    updated_at
FROM profiles 
WHERE id = '2f4ec8c0-0e58-486d-9c11-a652368f7c19';

-- Verificar las suscripciones del usuario
SELECT 
    id,
    user_id,
    external_reference,
    status,
    subscription_type,
    product_name,
    mercadopago_subscription_id,
    created_at,
    updated_at
FROM unified_subscriptions 
WHERE user_id = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
ORDER BY created_at DESC;

-- Verificar si hay duplicados por external_reference
SELECT 
    external_reference,
    COUNT(*) as count,
    array_agg(status) as statuses
FROM unified_subscriptions 
WHERE external_reference = '7aff2471329b4b66a6ba6ca91af7858b'
GROUP BY external_reference;