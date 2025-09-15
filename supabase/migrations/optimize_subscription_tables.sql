-- Migration: Optimize subscription tables with indexes, constraints, and unified view
-- Based on subscription tables analysis recommendations

-- ============================================================================
-- OPTIMIZATION INDEXES
-- ============================================================================

-- Indexes for pending_subscriptions table
CREATE INDEX IF NOT EXISTS idx_pending_subscriptions_user_id ON pending_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_subscriptions_status ON pending_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_pending_subscriptions_external_ref ON pending_subscriptions(external_reference);
CREATE INDEX IF NOT EXISTS idx_pending_subscriptions_created_at ON pending_subscriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_pending_subscriptions_processed_at ON pending_subscriptions(processed_at);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_pending_subscriptions_user_status 
ON pending_subscriptions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_pending_subscriptions_status_created 
ON pending_subscriptions(status, created_at);

-- Indexes for user_subscriptions table
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_product_id ON user_subscriptions(product_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_next_billing ON user_subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_created_at ON user_subscriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_updated_at ON user_subscriptions(updated_at);

-- Composite indexes for user_subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status 
ON user_subscriptions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_product 
ON user_subscriptions(user_id, product_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status_billing 
ON user_subscriptions(status, next_billing_date) 
WHERE status = 'active';

-- ============================================================================
-- UNIQUENESS CONSTRAINTS
-- ============================================================================

-- Prevent duplicate active subscriptions for same user-product combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_user_product_subscription 
ON user_subscriptions(user_id, product_id) 
WHERE status = 'active';

-- Prevent duplicate pending subscriptions with same external reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_external_reference 
ON pending_subscriptions(external_reference) 
WHERE status = 'pending' AND external_reference IS NOT NULL;

-- ============================================================================
-- UNIFIED VIEW: subscription_lifecycle
-- ============================================================================

CREATE OR REPLACE VIEW subscription_lifecycle AS
SELECT 
    -- Common fields
    'pending' as lifecycle_stage,
    ps.id as subscription_id,
    ps.user_id,
    NULL::integer as product_id, -- pending_subscriptions doesn't have product_id
    ps.subscription_type,
    NULL::integer as quantity, -- extracted from cart_items if needed
    NULL::varchar as size, -- extracted from cart_items if needed
    NULL::numeric as discount_percentage, -- extracted from cart_items if needed
    ps.status,
    ps.external_reference,
    ps.customer_data,
    ps.cart_items,
    ps.created_at,
    ps.updated_at,
    ps.processed_at,
    ps.notes,
    
    -- Pending-specific fields
    ps.mercadopago_subscription_id,
    NULL::timestamp as next_billing_date,
    NULL::timestamp as last_billing_date,
    NULL::timestamp as end_date,
    NULL::integer as charges_made,
    NULL::numeric as transaction_amount,
    NULL::text as reason,
    NULL::timestamp as expired_at,
    NULL::timestamp as suspended_at,
    NULL::text as product_name,
    NULL::text as product_image
    
FROM pending_subscriptions ps

UNION ALL

SELECT 
    -- Common fields
    'active' as lifecycle_stage,
    us.id as subscription_id,
    us.user_id,
    us.product_id,
    us.subscription_type,
    us.quantity,
    us.size,
    us.discount_percentage,
    us.status,
    us.external_reference,
    NULL::jsonb as customer_data,
    NULL::jsonb as cart_items,
    us.created_at,
    us.updated_at,
    NULL::timestamp as processed_at,
    us.reason as notes,
    
    -- Active-specific fields
    us.mercadopago_subscription_id,
    us.next_billing_date,
    us.last_billing_date,
    us.end_date,
    us.charges_made,
    us.transaction_amount,
    us.reason,
    us.expired_at,
    us.suspended_at,
    us.product_name,
    us.product_image
    
FROM user_subscriptions us;

-- Grant permissions on the view
GRANT SELECT ON subscription_lifecycle TO anon;
GRANT SELECT ON subscription_lifecycle TO authenticated;

-- ============================================================================
-- ADDITIONAL CONSTRAINTS AND VALIDATIONS
-- ============================================================================

-- Add check constraints for subscription_type if not already present
DO $$
BEGIN
    -- Check if constraint exists for pending_subscriptions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'pending_subscriptions_subscription_type_check'
    ) THEN
        ALTER TABLE pending_subscriptions 
        ADD CONSTRAINT pending_subscriptions_subscription_type_check 
        CHECK (subscription_type IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual'));
    END IF;
    
    -- Check if constraint exists for user_subscriptions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'user_subscriptions_subscription_type_check'
    ) THEN
        ALTER TABLE user_subscriptions 
        ADD CONSTRAINT user_subscriptions_subscription_type_check 
        CHECK (subscription_type IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual'));
    END IF;
END $$;

-- Add check constraints for quantity (must be positive) - only for user_subscriptions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'user_subscriptions_quantity_positive'
    ) THEN
        ALTER TABLE user_subscriptions 
        ADD CONSTRAINT user_subscriptions_quantity_positive 
        CHECK (quantity > 0);
    END IF;
END $$;

-- Add check constraints for discount_percentage (0-100) - only for user_subscriptions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'user_subscriptions_discount_range'
    ) THEN
        ALTER TABLE user_subscriptions 
        ADD CONSTRAINT user_subscriptions_discount_range 
        CHECK (discount_percentage >= 0 AND discount_percentage <= 100);
    END IF;
END $$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON VIEW subscription_lifecycle IS 'Unified view combining pending and active subscriptions for complete lifecycle tracking';
COMMENT ON INDEX idx_unique_active_user_product_subscription IS 'Prevents duplicate active subscriptions for same user-product combination';
COMMENT ON INDEX idx_unique_pending_external_reference IS 'Prevents duplicate pending subscriptions with same external reference';

-- ============================================================================
-- PERFORMANCE MONITORING QUERIES (for reference)
-- ============================================================================

/*
-- Query to check index usage:
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename IN ('pending_subscriptions', 'user_subscriptions', 'product_subscription_config')
ORDER BY idx_tup_read DESC;

-- Query to check constraint violations:
SELECT conname, conrelid::regclass, pg_get_constraintdef(oid)
FROM pg_constraint 
WHERE conrelid::regclass::text IN ('pending_subscriptions', 'user_subscriptions')
AND contype = 'c';
*/