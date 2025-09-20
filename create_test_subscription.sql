-- Crear suscripción pendiente para prueba de Cristofer Escalante
INSERT INTO unified_subscriptions (
  user_id,
  subscription_type,
  status,
  external_reference,
  customer_data,
  cart_items,
  quantity,
  size,
  discount_percentage,
  base_price,
  discounted_price,
  product_name,
  product_image,
  currency_id,
  transaction_amount,
  frequency,
  frequency_type,
  metadata
) VALUES (
  '2f4ec8c0-0e58-486d-9c11-a652368f7c19', -- Cristofer's user_id
  'monthly',
  'pending',
  '9782a851a7d248238bd88a8dc3d03245', -- external_reference del link de MercadoPago
  '{
    "email": "cristoferscalante@gmail.com",
    "first_name": "Cristofer",
    "last_name": "Escalante",
    "phone": "+52 123 456 7890",
    "address": {
      "street_name": "carrera36#50-40",
      "street_number": "carrera36#50-40",
      "zip_code": "170004",
      "city": "manizales",
      "state": "Caldas",
      "country": "México"
    }
  }',
  '[
    {
      "id": 1,
      "name": "Flan de Pollo",
      "price": 38.25,
      "quantity": 1,
      "size": "500g",
      "image": "/images/products/flan-pollo.jpg",
      "description": "Delicioso flan de pollo para perros"
    }
  ]',
  1,
  '500g',
  10, -- 10% descuento mensual
  38.25,
  34.43, -- 38.25 - 10% = 34.43
  'Flan de Pollo',
  '/images/products/flan-pollo.jpg',
  'MXN',
  34.43,
  1,
  'months',
  '{
    "test_subscription": true,
    "created_for_testing": "2024-12-19",
    "mercadopago_link": "https://www.mercadopago.com.mx/subscriptions/checkout/congrats?collection_id=126854503198&collection_status=approved&preference_id=1227980651-a6952266-5d4c-4c85-8ca0-af42cbb0fb73&payment_type=credit_card&payment_id=126854503198&external_reference=9782a851a7d248238bd88a8dc3d03245&site_id=MLM&status=approved&"
  }'
);

-- Verificar que se creó correctamente
SELECT id, user_id, status, external_reference, product_name, transaction_amount, created_at
FROM unified_subscriptions 
WHERE external_reference = '9782a851a7d248238bd88a8dc3d03245'
ORDER BY created_at DESC;