-- Actualizar la suscripción con external_reference='241b49306b3b42af8c37364bedfc1dae' a estado 'active'
-- ya que 'approved' no es un estado válido según el constraint

UPDATE unified_subscriptions 
SET 
    status = 'active',
    processed_at = NOW(),
    updated_at = NOW()
WHERE external_reference = '241b49306b3b42af8c37364bedfc1dae';

-- Verificar la actualización
SELECT 
    id,
    user_id,
    subscription_type,
    status,
    external_reference,
    mercadopago_subscription_id,
    processed_at,
    updated_at
FROM unified_subscriptions 
WHERE external_reference = '241b49306b3b42af8c37364bedfc1dae';

-- Consulta para detectar duplicados del mismo usuario
SELECT 
    user_id,
    COUNT(*) as total_subscriptions,
    STRING_AGG(external_reference, ', ') as external_references,
    STRING_AGG(status, ', ') as statuses
FROM unified_subscriptions 
WHERE user_id = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Ver todas las suscripciones del usuario para análisis
SELECT 
    id,
    subscription_type,
    status,
    external_reference,
    mercadopago_subscription_id,
    created_at,
    processed_at
FROM unified_subscriptions 
WHERE user_id = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
ORDER BY created_at DESC;