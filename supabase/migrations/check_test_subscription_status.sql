-- Consulta para verificar el estado actual de la suscripción de prueba
-- external_reference: 241b49306b3b42af8c37364bedfc1dae

SELECT 
    id,
    user_id,
    external_reference,
    status,
    subscription_type,
    product_name,
    base_price,
    discounted_price,
    next_billing_date,
    processed_at,
    customer_data->>'email' as customer_email,
    customer_data->>'firstName' as customer_first_name,
    customer_data->>'lastName' as customer_last_name,
    created_at,
    updated_at
FROM unified_subscriptions 
WHERE external_reference = '241b49306b3b42af8c37364bedfc1dae';

-- Verificar si hay logs de correos enviados (buscar por email del cliente)
SELECT 
    el.id,
    el.email_type,
    el.recipient_email,
    el.sent_at,
    el.status as email_status
FROM email_logs el
WHERE el.recipient_email IN (
    SELECT customer_data->>'email' 
    FROM unified_subscriptions 
    WHERE external_reference = '241b49306b3b42af8c37364bedfc1dae'
)
ORDER BY el.sent_at DESC;