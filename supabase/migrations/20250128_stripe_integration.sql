-- Migración de Base de Datos para Stripe
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- TABLA: orders
-- Agregar columnas de Stripe
-- ============================================

-- Agregar columnas de Stripe a la tabla orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MXN',
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS line_items JSONB,
ADD COLUMN IF NOT EXISTS shipping_address JSONB,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Agregar comentarios a las columnas
COMMENT ON COLUMN orders.stripe_session_id IS 'ID de la sesión de Stripe Checkout';
COMMENT ON COLUMN orders.stripe_payment_intent_id IS 'ID del payment intent de Stripe';
COMMENT ON COLUMN orders.stripe_customer_id IS 'ID del customer en Stripe';
COMMENT ON COLUMN orders.total_amount IS 'Monto total de la orden';
COMMENT ON COLUMN orders.currency IS 'Moneda de la transacción (ISO 4217)';
COMMENT ON COLUMN orders.payment_status IS 'Estado del pago (pending, paid, failed)';
COMMENT ON COLUMN orders.customer_email IS 'Email del cliente';
COMMENT ON COLUMN orders.customer_name IS 'Nombre del cliente';
COMMENT ON COLUMN orders.line_items IS 'Productos comprados (JSON)';
COMMENT ON COLUMN orders.shipping_address IS 'Dirección de envío (JSON)';
COMMENT ON COLUMN orders.metadata IS 'Metadatos adicionales (JSON)';

-- Crear índice para búsquedas rápidas por session_id
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session 
ON orders(stripe_session_id)
WHERE stripe_session_id IS NOT NULL;

-- Crear índice para búsquedas rápidas por customer_id
CREATE INDEX IF NOT EXISTS idx_orders_stripe_customer 
ON orders(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;


-- ============================================
-- TABLA: unified_subscriptions
-- Agregar columnas de Stripe
-- ============================================

-- Agregar columnas de Stripe a la tabla unified_subscriptions
ALTER TABLE unified_subscriptions
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ;

-- Agregar comentarios a las columnas
COMMENT ON COLUMN unified_subscriptions.stripe_subscription_id IS 'ID de la suscripción en Stripe';
COMMENT ON COLUMN unified_subscriptions.stripe_customer_id IS 'ID del customer en Stripe';
COMMENT ON COLUMN unified_subscriptions.stripe_price_id IS 'ID del price (plan) en Stripe';
COMMENT ON COLUMN unified_subscriptions.cancel_at_period_end IS 'Si la suscripción se cancelará al final del período';
COMMENT ON COLUMN unified_subscriptions.last_payment_date IS 'Fecha del último pago exitoso';

-- Crear índice para búsquedas rápidas por subscription_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id 
ON unified_subscriptions(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

-- Crear índice para búsquedas rápidas por customer_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer 
ON unified_subscriptions(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;


-- ============================================
-- OPCIONAL: Crear tabla de webhook_events
-- Para auditoría de eventos de Stripe
-- ============================================

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentarios
COMMENT ON TABLE stripe_webhook_events IS 'Log de todos los eventos recibidos de Stripe';
COMMENT ON COLUMN stripe_webhook_events.event_id IS 'ID único del evento de Stripe';
COMMENT ON COLUMN stripe_webhook_events.event_type IS 'Tipo de evento (ej: checkout.session.completed)';
COMMENT ON COLUMN stripe_webhook_events.event_data IS 'Datos completos del evento en JSON';
COMMENT ON COLUMN stripe_webhook_events.processed IS 'Si el evento ya fue procesado';
COMMENT ON COLUMN stripe_webhook_events.processed_at IS 'Fecha de procesamiento';
COMMENT ON COLUMN stripe_webhook_events.error IS 'Error si hubo algún problema al procesar';

-- Índices para la tabla de eventos
CREATE INDEX IF NOT EXISTS idx_stripe_events_type 
ON stripe_webhook_events(event_type);

CREATE INDEX IF NOT EXISTS idx_stripe_events_processed 
ON stripe_webhook_events(processed)
WHERE NOT processed;

CREATE INDEX IF NOT EXISTS idx_stripe_events_created 
ON stripe_webhook_events(created_at DESC);


-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que las columnas se agregaron correctamente
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('orders', 'unified_subscriptions')
  AND column_name LIKE 'stripe%'
ORDER BY table_name, ordinal_position;

-- Verificar índices creados
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname LIKE 'idx_%stripe%'
ORDER BY tablename, indexname;
