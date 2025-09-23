-- Migración para corregir registros duplicados de suscripción
-- Fecha: 2025-01-23
-- Descripción: Eliminar registro duplicado ID 61 y verificar registro ID 60

-- Primero verificar los registros actuales del usuario
SELECT 
    id,
    user_id,
    status,
    external_reference,
    product_name,
    subscription_type,
    created_at,
    updated_at,
    mercadopago_subscription_id,
    customer_data,
    cart_items
FROM unified_subscriptions 
WHERE user_id = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
ORDER BY created_at;

-- Eliminar el registro duplicado ID 61 (incompleto)
DELETE FROM unified_subscriptions 
WHERE id = 61 
  AND user_id = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
  AND external_reference = 'a6e7fb7dabb548f3ad42cbf545f007a9';

-- Verificar que el registro ID 60 esté correcto
SELECT 
    id,
    user_id,
    status,
    external_reference,
    product_name,
    subscription_type,
    base_price,
    transaction_amount,
    customer_data IS NOT NULL as has_customer_data,
    cart_items IS NOT NULL as has_cart_items,
    created_at,
    updated_at
FROM unified_subscriptions 
WHERE id = 60 
  AND user_id = '2f4ec8c0-0e58-486d-9c11-a652368f7c19';

-- Verificar que solo quede un registro para este usuario
SELECT COUNT(*) as total_registros
FROM unified_subscriptions 
WHERE user_id = '2f4ec8c0-0e58-486d-9c11-a652368f7c19';

-- Mostrar el registro final
SELECT 
    'Registro final para usuario' as descripcion,
    id,
    status,
    external_reference,
    product_name,
    subscription_type,
    transaction_amount
FROM unified_subscriptions 
WHERE user_id = '2f4ec8c0-0e58-486d-9c11-a652368f7c19';