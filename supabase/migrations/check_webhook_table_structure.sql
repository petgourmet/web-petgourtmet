-- Verificar la estructura de la tabla mercadopago_webhooks
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'mercadopago_webhooks' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Mostrar algunos registros de ejemplo para entender la estructura
SELECT *
FROM mercadopago_webhooks
LIMIT 5;