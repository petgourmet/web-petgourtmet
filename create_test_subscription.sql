-- Crear un registro de suscripción pendiente para probar el flujo
INSERT INTO unified_subscriptions (
    user_id,
    external_reference,
    status,
    subscription_type,
    product_name,
    base_price,
    discounted_price,
    customer_data,
    cart_items,
    frequency,
    frequency_type,
    created_at
) VALUES (
    '2f4ec8c0-0e58-486d-9c11-a652368f7c19',
    '7aff2471329b4b66a6ba6ca91af7858b',
    'pending',
    'monthly',
    'Producto de Prueba Suscripción',
    299.99,
    249.99,
    '{"email": "cristoferscalante@gmail.com", "name": "Cristofer Escalante"}',
    '[{"id": 1, "name": "Producto de Prueba", "price": 249.99, "quantity": 1}]',
    1,
    'months',
    NOW()
);

-- Verificar que se creó correctamente
SELECT 
  id,
  user_id,
  status,
  external_reference,
  product_name,
  base_price,
  discounted_price,
  created_at
FROM unified_subscriptions 
WHERE external_reference = '7aff2471329b4b66a6ba6ca91af7858b';