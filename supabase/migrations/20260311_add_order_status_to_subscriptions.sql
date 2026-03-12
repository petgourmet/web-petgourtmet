-- Add order_status column to unified_subscriptions for logistics tracking
-- Tracks the delivery status separately from the subscription lifecycle status
ALTER TABLE unified_subscriptions 
ADD COLUMN IF NOT EXISTS order_status TEXT DEFAULT 'pending';

-- Add comment for clarity
COMMENT ON COLUMN unified_subscriptions.order_status IS 'Delivery/logistics status: pending, processing, shipped, completed, cancelled, refunded';
