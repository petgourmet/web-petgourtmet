-- Create webhook_log table for tracking webhook processing
CREATE TABLE IF NOT EXISTS webhook_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    webhook_id VARCHAR(255) NOT NULL,
    request_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'received',
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_log_webhook_id ON webhook_log(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_log_status ON webhook_log(status);
CREATE INDEX IF NOT EXISTS idx_webhook_log_received_at ON webhook_log(received_at);
CREATE INDEX IF NOT EXISTS idx_webhook_log_request_id ON webhook_log(request_id);

-- Create composite index for duplicate checking
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_log_unique_processed 
ON webhook_log(webhook_id, status) 
WHERE status = 'processed';

-- Add comments
COMMENT ON TABLE webhook_log IS 'Log table for tracking MercadoPago webhook processing';
COMMENT ON COLUMN webhook_log.webhook_id IS 'Unique webhook ID from MercadoPago';
COMMENT ON COLUMN webhook_log.request_id IS 'Request ID for tracing';
COMMENT ON COLUMN webhook_log.status IS 'Processing status: received, processed, failed';
COMMENT ON COLUMN webhook_log.received_at IS 'When webhook was received';
COMMENT ON COLUMN webhook_log.processed_at IS 'When webhook was processed';
COMMENT ON COLUMN webhook_log.error_message IS 'Error message if processing failed';

-- Enable RLS
ALTER TABLE webhook_log ENABLE ROW LEVEL SECURITY;

-- Create policies for webhook_log table
-- Only service role can access webhook logs (admin only)
CREATE POLICY "Service role can manage webhook logs" ON webhook_log
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions to service role
GRANT ALL PRIVILEGES ON webhook_log TO service_role;

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_webhook_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_webhook_log_updated_at
    BEFORE UPDATE ON webhook_log
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_log_updated_at();