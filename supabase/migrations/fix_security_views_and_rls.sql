-- Fix security issues: Create missing views and enable RLS
-- Drop existing views if they exist (to avoid conflicts)
DROP VIEW IF EXISTS webhook_stats;
DROP VIEW IF EXISTS sync_stats;

-- Create webhook_stats view without SECURITY DEFINER
CREATE VIEW webhook_stats AS
SELECT 
    COUNT(*) as total_webhooks,
    COUNT(CASE WHEN status = 'processed' THEN 1 END) as successful_webhooks,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_webhooks,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_webhooks,
    AVG(retry_count) as avg_retry_count
FROM webhook_logs
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Create sync_stats view without SECURITY DEFINER
CREATE VIEW sync_stats AS
SELECT 
    COUNT(*) as total_syncs,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_syncs,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_syncs,
    COUNT(CASE WHEN status = 'completed_with_errors' THEN 1 END) as syncs_with_errors,
    AVG(duration_ms) as avg_duration_ms,
    SUM(synced_count) as total_synced_items,
    SUM(errors_count) as total_errors,
    MAX(completed_at) as last_sync_time
FROM sync_logs
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Enable RLS on subscription_billing_history
ALTER TABLE subscription_billing_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscription_billing_history
-- Policy for authenticated users to see their own billing history
CREATE POLICY "Users can view their own billing history" ON subscription_billing_history
    FOR SELECT
    USING (auth.uid() IN (
        SELECT user_id FROM unified_subscriptions WHERE id::text = subscription_id
    ));

-- Policy for admin users to see all billing history
CREATE POLICY "Admins can view all billing history" ON subscription_billing_history
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- Policy for service role to manage billing history
CREATE POLICY "Service role can manage billing history" ON subscription_billing_history
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON webhook_stats TO anon, authenticated;
GRANT SELECT ON sync_stats TO anon, authenticated;
GRANT SELECT ON subscription_billing_history TO authenticated;
GRANT ALL ON subscription_billing_history TO service_role;

-- Comments for documentation
COMMENT ON VIEW webhook_stats IS 'Statistics view for webhook monitoring without SECURITY DEFINER';
COMMENT ON VIEW sync_stats IS 'Statistics view for sync monitoring without SECURITY DEFINER';