-- Completar datos faltantes en la suscripción activa
-- Basado en los datos del cart_items de la suscripción original

-- Primero, vamos a ver los datos actuales
SELECT id, external_reference, status, cart_items, product_name, base_price, discounted_price
FROM unified_subscriptions 
WHERE external_reference = '241b49306b3b42af8c37364bedfc1dae';

-- Actualizar la suscripción con los datos correctos del producto
UPDATE unified_subscriptions 
SET 
    product_name = 'Flan de Pollo',
    product_image = '/api/placeholder/300/200',
    base_price = 38.25,
    discounted_price = 38.25,
    transaction_amount = 38.25,
    product_id = 73,
    size = '3oz',
    cart_items = '[{"size": "3oz", "price": 38.25, "quantity": 1, "product_id": 73, "product_name": "Flan de Pollo", "isSubscription": true, "subscriptionType": "monthly"}]',
    customer_data = '{"email": "cristoferscalante@gmail.com", "phone": "5616683424", "address": "{\"street_name\":\"carrera36#50-40\",\"street_number\":\"carrera36#50-40\",\"zip_code\":\"06500\",\"city\":\"Cuauhtemoc \",\"state\":\"CDMX\",\"country\":\"México\"}", "lastName": "Escalante", "firstName": "Cristofer"}',
    updated_at = NOW()
WHERE external_reference = '241b49306b3b42af8c37364bedfc1dae' AND status = 'active';

-- Verificar los cambios
SELECT id, external_reference, status, product_name, product_image, base_price, discounted_price, transaction_amount, product_id, size
FROM unified_subscriptions 
WHERE external_reference = '241b49306b3b42af8c37364bedfc1dae';

-- Mostrar el resultado final
SELECT 'Suscripción actualizada correctamente con datos del producto' as resultado;