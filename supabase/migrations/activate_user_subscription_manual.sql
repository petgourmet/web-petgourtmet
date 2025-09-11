-- Activar manualmente la suscripción del usuario fabyo66@hotmail.com
-- basándose en los datos de la suscripción pendiente y el pago exitoso

-- Primero, obtener los datos de la suscripción pendiente
WITH pending_data AS (
  SELECT 
    user_id,
    subscription_type,
    customer_data,
    cart_items,
    external_reference,
    created_at
  FROM pending_subscriptions 
  WHERE external_reference = '9dc299af727f4c509db338c9843493bd'
    AND user_id = 'f68400d1-43df-4813-8fa2-d101e65d59ff'
),
product_data AS (
  SELECT 
    id as product_id,
    name as product_name,
    image as product_image,
    price
  FROM products 
  WHERE name ILIKE '%pollo%'
  LIMIT 1
)
-- Insertar la suscripción activa (convertir weekly a monthly)
INSERT INTO user_subscriptions (
  user_id,
  product_id,
  subscription_type,
  status,
  quantity,
  size,
  discount_percentage,
  base_price,
  discounted_price,
  next_billing_date,
  last_billing_date,
  product_name,
  product_image,
  external_reference,
  charges_made,
  frequency,
  frequency_type,
  currency_id,
  transaction_amount,
  created_at,
  updated_at
)
SELECT 
  pd.user_id,
  prd.product_id,
  -- Convertir weekly a monthly ya que weekly no está permitido
  CASE 
    WHEN pd.subscription_type = 'weekly' THEN 'monthly'
    ELSE pd.subscription_type
  END as subscription_type,
  'active'::varchar as status,
  1 as quantity,
  'M' as size,
  0 as discount_percentage,
  128.25 as base_price,
  128.25 as discounted_price,
  -- Para weekly convertido a monthly, usar 1 mes
  CASE 
    WHEN pd.subscription_type = 'weekly' THEN pd.created_at + INTERVAL '1 month'
    WHEN pd.subscription_type = 'biweekly' THEN pd.created_at + INTERVAL '1 month'
    WHEN pd.subscription_type = 'monthly' THEN pd.created_at + INTERVAL '1 month'
    WHEN pd.subscription_type = 'quarterly' THEN pd.created_at + INTERVAL '3 months'
    WHEN pd.subscription_type = 'annual' THEN pd.created_at + INTERVAL '1 year'
    ELSE pd.created_at + INTERVAL '1 month'
  END as next_billing_date,
  NOW() as last_billing_date,
  COALESCE(prd.product_name, 'Plan de Pollo') as product_name,
  prd.product_image,
  pd.external_reference,
  1 as charges_made,
  1 as frequency,
  'months' as frequency_type,
  'MXN' as currency_id,
  128.25 as transaction_amount,
  pd.created_at,
  NOW() as updated_at
FROM pending_data pd
CROSS JOIN product_data prd;

-- Actualizar el estado de la suscripción pendiente a completada
UPDATE pending_subscriptions 
SET 
  status = 'completed',
  processed_at = NOW(),
  updated_at = NOW()
WHERE external_reference = '9dc299af727f4c509db338c9843493bd'
  AND user_id = 'f68400d1-43df-4813-8fa2-d101e65d59ff';

-- Registrar el pago en el historial de facturación (si existe la tabla)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_billing_history') THEN
    INSERT INTO subscription_billing_history (
      user_id,
      subscription_id,
      payment_id,
      amount,
      currency,
      status,
      payment_method,
      external_reference,
      created_at
    )
    SELECT 
      us.user_id,
      us.id as subscription_id,
      '125804449246' as payment_id,
      128.25 as amount,
      'MXN' as currency,
      'approved' as status,
      'credit_card' as payment_method,
      us.external_reference,
      NOW() as created_at
    FROM user_subscriptions us
    WHERE us.external_reference = '9dc299af727f4c509db338c9843493bd'
      AND us.user_id = 'f68400d1-43df-4813-8fa2-d101e65d59ff';
  END IF;
END $$;

-- Verificar los resultados
SELECT 
  'Suscripción Activa' as tipo,
  id,
  user_id,
  product_name,
  subscription_type,
  status,
  base_price,
  next_billing_date,
  external_reference,
  created_at
FROM user_subscriptions 
WHERE user_id = 'f68400d1-43df-4813-8fa2-d101e65d59ff'
  AND external_reference = '9dc299af727f4c509db338c9843493bd'

UNION ALL

SELECT 
  'Suscripción Pendiente' as tipo,
  id::text,
  user_id,
  'N/A' as product_name,
  subscription_type,
  status,
  0 as base_price,
  processed_at as next_billing_date,
  external_reference,
  created_at
FROM pending_subscriptions 
WHERE user_id = 'f68400d1-43df-4813-8fa2-d101e65d59ff'
  AND external_reference = '9dc299af727f4c509db338c9843493bd';