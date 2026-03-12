-- Add shipping_cost column to unified_subscriptions
-- This column was missing, causing subscription emails to always show $0 for shipping
-- and the resend-subscription-email API to fail with "Suscripción no encontrada"
-- (PostgREST error on explicit SELECT of nonexistent column was masking as 404)

ALTER TABLE unified_subscriptions
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10, 2) DEFAULT 0;

COMMENT ON COLUMN unified_subscriptions.shipping_cost IS 'Costo de envío del pedido de suscripción (calculado como transaction_amount - discounted_price)';

-- Backfill existing subscriptions: compute shipping_cost from transaction_amount - discounted_price
UPDATE unified_subscriptions
SET shipping_cost = GREATEST(0, COALESCE(transaction_amount, 0) - COALESCE(discounted_price, base_price, 0))
WHERE shipping_cost IS NULL OR shipping_cost = 0
  AND transaction_amount IS NOT NULL
  AND COALESCE(transaction_amount, 0) > COALESCE(discounted_price, base_price, 0);
