-- Migración de datos desde pending_subscriptions y user_subscriptions a unified_subscriptions
-- Este script debe ejecutarse después de crear la tabla unified_subscriptions

-- Migrar datos de pending_subscriptions
INSERT INTO unified_subscriptions (
  user_id,
  subscription_type,
  status,
  external_reference,
  created_at,
  updated_at,
  customer_data,
  cart_items,
  processed_at,
  notes,
  mercadopago_subscription_id
)
SELECT 
  user_id,
  subscription_type,
  COALESCE(status, 'pending') as status,
  external_reference,
  created_at,
  updated_at,
  customer_data,
  cart_items,
  processed_at,
  notes,
  mercadopago_subscription_id
FROM pending_subscriptions
WHERE external_reference IS NOT NULL;

-- Migrar datos de user_subscriptions
INSERT INTO unified_subscriptions (
  user_id,
  subscription_type,
  status,
  external_reference,
  created_at,
  updated_at,
  product_id,
  quantity,
  size,
  discount_percentage,
  base_price,
  discounted_price,
  next_billing_date,
  last_billing_date,
  cancelled_at,
  product_name,
  product_image,
  metadata,
  mercadopago_subscription_id,
  mercadopago_plan_id,
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
  free_trial,
  paused_at,
  resumed_at,
  expired_at,
  suspended_at,
  last_sync_at
)
SELECT 
  user_id,
  subscription_type,
  COALESCE(status, 'active') as status,
  external_reference,
  created_at,
  updated_at,
  product_id,
  quantity,
  size,
  discount_percentage,
  base_price,
  discounted_price,
  next_billing_date,
  last_billing_date,
  cancelled_at,
  product_name,
  product_image,
  metadata,
  mercadopago_subscription_id,
  mercadopago_plan_id,
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
  free_trial,
  paused_at,
  resumed_at,
  expired_at,
  suspended_at,
  last_sync_at
FROM user_subscriptions;

-- Verificar que los datos se migraron correctamente
DO $$
DECLARE
  pending_count INTEGER;
  user_count INTEGER;
  unified_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pending_count FROM pending_subscriptions;
  SELECT COUNT(*) INTO user_count FROM user_subscriptions;
  SELECT COUNT(*) INTO unified_count FROM unified_subscriptions;
  
  RAISE NOTICE 'Migración completada:';
  RAISE NOTICE '- pending_subscriptions: % registros', pending_count;
  RAISE NOTICE '- user_subscriptions: % registros', user_count;
  RAISE NOTICE '- unified_subscriptions: % registros', unified_count;
  
  IF unified_count != (pending_count + user_count) THEN
    RAISE WARNING 'El número de registros no coincide. Revisar la migración.';
  ELSE
    RAISE NOTICE '✅ Migración exitosa: todos los registros fueron transferidos';
  END IF;
END $$;

-- Crear vista temporal para comparar datos (opcional, para verificación)
CREATE OR REPLACE VIEW migration_verification AS
SELECT 
  'pending' as source_table,
  COUNT(*) as record_count,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM pending_subscriptions
UNION ALL
SELECT 
  'user' as source_table,
  COUNT(*) as record_count,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM user_subscriptions
UNION ALL
SELECT 
  'unified' as source_table,
  COUNT(*) as record_count,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM unified_subscriptions;

-- Comentario final
COMMENT ON VIEW migration_verification IS 'Vista temporal para verificar la migración de datos a unified_subscriptions';