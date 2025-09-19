-- Actualizar la suscripción aprobada de MercadoPago
-- Cambiar status de 'pending' a 'active' para la suscripción con external_reference '241b49306b3b42af8c37364bedfc1dae'
UPDATE unified_subscriptions 
SET 
    status = 'active',
    processed_at = NOW(),
    updated_at = NOW(),
    last_sync_at = NOW()
WHERE external_reference = '241b49306b3b42af8c37364bedfc1dae'
    AND status = 'pending';

-- Eliminar la suscripción duplicada con external_reference 'subscription_PG-304022_1758236304022'
-- Esta parece ser una suscripción duplicada que no corresponde al flujo de MercadoPago
DELETE FROM unified_subscriptions 
WHERE external_reference = 'subscription_PG-304022_1758236304022'
    AND status = 'pending';

-- Verificar los cambios realizados
SELECT 
    id,
    user_id,
    subscription_type,
    status,
    external_reference,
    created_at,
    updated_at,
    processed_at,
    product_name
FROM unified_subscriptions 
WHERE user_id = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
ORDER BY created_at DESC;