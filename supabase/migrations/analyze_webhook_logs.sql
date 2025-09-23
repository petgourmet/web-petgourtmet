-- Analizar logs de webhooks para entender la creación de duplicados

-- 1. Buscar webhooks relacionados con el usuario cristoferscalante@gmail.com
SELECT 
    'WEBHOOK_LOGS' as analysis_type,
    mw.id,
    mw.type,
    mw.data,
    mw.created_at,
    mw.processed_at,
    mw.status,
    mw.error_message
FROM mercadopago_webhooks mw
WHERE mw.data::text ILIKE '%cristoferscalante@gmail.com%'
   OR mw.data->>'external_reference' IN (
       SELECT DISTINCT us.external_reference 
       FROM unified_subscriptions us
       JOIN profiles p ON us.user_id = p.id
       WHERE p.email = 'cristoferscalante@gmail.com'
   )
ORDER BY mw.created_at DESC;

-- 2. Buscar webhooks por external_reference específicos del usuario
SELECT 
    'EXTERNAL_REF_WEBHOOKS' as analysis_type,
    mw.id,
    mw.type,
    mw.data->>'external_reference' as external_reference,
    mw.status,
    mw.created_at,
    mw.data->>'id' as mercadopago_id,
    mw.data->>'status' as mp_status
FROM mercadopago_webhooks mw
WHERE mw.data->>'external_reference' IN (
    SELECT DISTINCT us.external_reference 
    FROM unified_subscriptions us
    JOIN profiles p ON us.user_id = p.id
    WHERE p.email = 'cristoferscalante@gmail.com'
)
ORDER BY mw.created_at DESC;

-- 3. Analizar los registros de unified_subscriptions del usuario problemático
SELECT 
    'USER_SUBSCRIPTIONS' as analysis_type,
    us.id,
    us.user_id,
    us.external_reference,
    us.mercadopago_subscription_id,
    us.status,
    us.created_at,
    us.updated_at,
    us.customer_data,
    p.email
FROM unified_subscriptions us
JOIN profiles p ON us.user_id = p.id
WHERE p.email = 'cristoferscalante@gmail.com'
ORDER BY us.created_at DESC;

-- 4. Buscar patrones de duplicación en toda la tabla
SELECT 
    'DUPLICATION_PATTERNS' as analysis_type,
    user_id,
    COUNT(*) as total_subscriptions,
    COUNT(DISTINCT external_reference) as unique_external_refs,
    COUNT(DISTINCT mercadopago_subscription_id) as unique_mp_ids,
    string_agg(DISTINCT external_reference, ', ') as all_external_refs,
    string_agg(DISTINCT status, ', ') as all_statuses
FROM unified_subscriptions
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY total_subscriptions DESC;

-- 5. Verificar si hay webhooks duplicados para el mismo external_reference
SELECT 
    'DUPLICATE_WEBHOOKS' as analysis_type,
    data->>'external_reference' as external_reference,
    COUNT(*) as webhook_count,
    string_agg(DISTINCT type, ', ') as event_types,
    string_agg(DISTINCT status, ', ') as statuses,
    MIN(created_at) as first_webhook,
    MAX(created_at) as last_webhook
FROM mercadopago_webhooks
WHERE data->>'external_reference' IS NOT NULL
GROUP BY data->>'external_reference'
HAVING COUNT(*) > 1
ORDER BY webhook_count DESC;