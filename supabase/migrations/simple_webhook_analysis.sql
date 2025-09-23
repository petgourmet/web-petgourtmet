-- Análisis simple de webhooks usando solo las columnas que sabemos que existen

-- 1. Mostrar estructura de la tabla mercadopago_webhooks
SELECT 'TABLE_STRUCTURE' as info_type, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'mercadopago_webhooks' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Mostrar algunos registros de ejemplo
SELECT 'SAMPLE_RECORDS' as info_type, *
FROM mercadopago_webhooks
ORDER BY created_at DESC
LIMIT 10;

-- 3. Buscar registros relacionados con el usuario problemático
-- Primero obtener los external_reference del usuario
SELECT 
    'USER_EXTERNAL_REFS' as info_type,
    us.external_reference,
    us.status,
    us.created_at,
    p.email
FROM unified_subscriptions us
JOIN profiles p ON us.user_id = p.id
WHERE p.email = 'cristoferscalante@gmail.com'
ORDER BY us.created_at DESC;

-- 4. Contar total de registros en mercadopago_webhooks
SELECT 'WEBHOOK_COUNT' as info_type, COUNT(*) as total_webhooks
FROM mercadopago_webhooks;