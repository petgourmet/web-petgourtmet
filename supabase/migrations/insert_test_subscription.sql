-- Insertar suscripción de prueba para cristoferscalante@gmail.com
-- Primero verificamos si el usuario existe
INSERT INTO user_subscriptions (
  id,
  user_id,
  product_id,
  subscription_type,
  status,
  quantity,
  size,
  discount_percentage,
  base_price,
  discounted_price,
  created_at,
  updated_at,
  next_billing_date,
  last_billing_date,
  cancelled_at,
  product_name,
  product_image,
  metadata,
  mercadopago_subscription_id,
  mercadopago_plan_id,
  external_reference,
  reason,
  charges_made,
  frequency,
  frequency_type,
  version,
  application_id,
  collector_id,
  preapproval_plan_id,
  back_url,
  init_point,
  start_date,
  end_date,
  currency_id,
  transaction_amount,
  free_trial
) VALUES (
  36,
  '2f4ec8c0-0e58-486d-9c11-a652368f7c19',
  73,
  'monthly',
  'active',
  1,
  '3oz',
  0,
  38.25,
  38.25,
  '2025-08-30T18:26:57.068356+00:00',
  '2025-08-30T18:26:57.068356+00:00',
  '2025-09-06T18:26:57.481+00:00',
  NULL,
  NULL,
  'Flan de Pollo',
  NULL,
  '{
    "preapproval_id": "6e27447e6c484da19f7742c18bfee469",
    "processed_manually": true,
    "original_cart_items": [
      {
        "size": "3oz",
        "price": 38.25,
        "quantity": 1,
        "product_id": 73,
        "product_name": "Flan de Pollo",
        "isSubscription": true,
        "subscriptionType": "weekly"
      }
    ]
  }',
  '6e27447e6c484da19f7742c18bfee469',
  NULL,
  '6e27447e6c484da19f7742c18bfee469',
  NULL,
  0,
  1,
  'weeks',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  '2025-08-30T18:26:57.481+00:00',
  NULL,
  'MXN',
  38.25,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  product_id = EXCLUDED.product_id,
  subscription_type = EXCLUDED.subscription_type,
  status = EXCLUDED.status,
  quantity = EXCLUDED.quantity,
  size = EXCLUDED.size,
  discount_percentage = EXCLUDED.discount_percentage,
  base_price = EXCLUDED.base_price,
  discounted_price = EXCLUDED.discounted_price,
  updated_at = EXCLUDED.updated_at,
  next_billing_date = EXCLUDED.next_billing_date,
  product_name = EXCLUDED.product_name,
  metadata = EXCLUDED.metadata,
  mercadopago_subscription_id = EXCLUDED.mercadopago_subscription_id,
  external_reference = EXCLUDED.external_reference,
  charges_made = EXCLUDED.charges_made,
  frequency = EXCLUDED.frequency,
  frequency_type = EXCLUDED.frequency_type,
  start_date = EXCLUDED.start_date,
  currency_id = EXCLUDED.currency_id,
  transaction_amount = EXCLUDED.transaction_amount;

-- Verificar que el producto existe
INSERT INTO products (id, name, slug, description, price, category_id, image, featured, stock, created_at, updated_at, subscription_available)
VALUES (
  73,
  'Flan de Pollo',
  'flan-de-pollo',
  'Delicioso flan de pollo para mascotas',
  38.25,
  1,
  '/images/flan-pollo.jpg',
  false,
  100,
  NOW(),
  NOW(),
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  subscription_available = EXCLUDED.subscription_available,
  updated_at = NOW();

-- Verificar que el usuario existe en auth.users
-- Nota: Este usuario debe existir en el sistema de autenticación
-- Si no existe, se debe crear manualmente en Supabase Auth