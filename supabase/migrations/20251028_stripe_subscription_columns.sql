-- Migración: Preparar unified_subscriptions para Stripe
-- Fecha: 2025-10-28
-- Descripción: Agregar columnas necesarias para integración completa con Stripe

-- 1. Agregar columnas faltantes para Stripe
ALTER TABLE unified_subscriptions
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS shipping_address JSONB;

-- 2. Actualizar columnas existentes que son incompatibles
-- Cambiar discount_percentage de TEXT a NUMERIC si es necesario
ALTER TABLE unified_subscriptions
ALTER COLUMN discount_percentage TYPE NUMERIC USING discount_percentage::numeric;

-- 3. Agregar índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
ON unified_subscriptions(user_id, status)
WHERE status IN ('active', 'paused');

CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing 
ON unified_subscriptions(next_billing_date)
WHERE status = 'active' AND next_billing_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_email
ON unified_subscriptions(customer_email)
WHERE customer_email IS NOT NULL;

-- 4. Agregar comentarios a las nuevas columnas
COMMENT ON COLUMN unified_subscriptions.current_period_start IS 'Inicio del período actual de facturación (Stripe)';
COMMENT ON COLUMN unified_subscriptions.current_period_end IS 'Fin del período actual de facturación (Stripe)';
COMMENT ON COLUMN unified_subscriptions.customer_email IS 'Email del cliente';
COMMENT ON COLUMN unified_subscriptions.customer_name IS 'Nombre completo del cliente';
COMMENT ON COLUMN unified_subscriptions.customer_phone IS 'Teléfono del cliente';
COMMENT ON COLUMN unified_subscriptions.shipping_address IS 'Dirección de envío en formato JSON';

-- 5. Actualizar registros existentes para consistencia
UPDATE unified_subscriptions
SET 
  current_period_start = created_at,
  current_period_end = next_billing_date
WHERE current_period_start IS NULL 
  AND created_at IS NOT NULL;

-- 6. Limpiar datos inconsistentes
UPDATE unified_subscriptions
SET 
  product_name = COALESCE(product_name, 'Producto sin nombre'),
  transaction_amount = COALESCE(transaction_amount, base_price, discounted_price, 0)
WHERE product_name IS NULL OR transaction_amount IS NULL;

-- 7. Verificar integridad
DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
  SELECT array_agg(column_name)
  INTO missing_columns
  FROM (
    SELECT unnest(ARRAY[
      'current_period_start',
      'current_period_end', 
      'customer_email',
      'customer_name',
      'stripe_subscription_id',
      'stripe_customer_id',
      'stripe_price_id'
    ]) AS column_name
  ) expected
  WHERE column_name NOT IN (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'unified_subscriptions'
  );
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE NOTICE 'Columnas faltantes: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE '✅ Todas las columnas necesarias están presentes';
  END IF;
END $$;

-- 8. Mostrar resumen de la tabla
SELECT 
  COUNT(*) as total_subscriptions,
  COUNT(*) FILTER (WHERE status = 'active') as active_subscriptions,
  COUNT(*) FILTER (WHERE stripe_subscription_id IS NOT NULL) as stripe_subscriptions,
  COUNT(*) FILTER (WHERE mercadopago_subscription_id IS NOT NULL) as mercadopago_subscriptions
FROM unified_subscriptions;
