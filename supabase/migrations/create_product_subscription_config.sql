-- Migration: Create product subscription configuration table
-- This table allows different subscription types per product
-- Based on analysis document recommendations

-- Create product_subscription_config table
CREATE TABLE IF NOT EXISTS product_subscription_config (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    subscription_type VARCHAR(20) NOT NULL CHECK (subscription_type IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual')),
    is_available BOOLEAN NOT NULL DEFAULT true,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    min_quantity INTEGER DEFAULT 1 CHECK (min_quantity > 0),
    max_quantity INTEGER CHECK (max_quantity IS NULL OR max_quantity >= min_quantity),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combination of product and subscription type
    UNIQUE(product_id, subscription_type)
);

-- Create indexes for optimization
CREATE INDEX IF NOT EXISTS idx_product_subscription_config_product_id ON product_subscription_config(product_id);
CREATE INDEX IF NOT EXISTS idx_product_subscription_config_type ON product_subscription_config(subscription_type);
CREATE INDEX IF NOT EXISTS idx_product_subscription_config_available ON product_subscription_config(is_available) WHERE is_available = true;

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_product_subscription_config_product_type_available 
ON product_subscription_config(product_id, subscription_type, is_available);

-- Add RLS (Row Level Security)
ALTER TABLE product_subscription_config ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Allow public read access to product subscription config" 
ON product_subscription_config FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated users to read product subscription config" 
ON product_subscription_config FOR SELECT 
TO authenticated 
USING (true);

-- Admin policies (assuming admin role exists or will be created)
CREATE POLICY "Allow admin full access to product subscription config" 
ON product_subscription_config FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'role' = 'admin');

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON product_subscription_config TO anon;
GRANT SELECT ON product_subscription_config TO authenticated;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_subscription_config_updated_at 
    BEFORE UPDATE ON product_subscription_config 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default configurations for existing products
-- This assumes products table exists and has some data
INSERT INTO product_subscription_config (product_id, subscription_type, is_available, discount_percentage)
SELECT 
    p.id,
    subscription_type,
    true as is_available,
    CASE 
        WHEN subscription_type = 'weekly' THEN 5.00
        WHEN subscription_type = 'biweekly' THEN 8.00
        WHEN subscription_type = 'monthly' THEN 10.00
        WHEN subscription_type = 'quarterly' THEN 15.00
        WHEN subscription_type = 'semiannual' THEN 20.00
        WHEN subscription_type = 'annual' THEN 25.00
        ELSE 0.00
    END as discount_percentage
FROM products p
CROSS JOIN (
    VALUES ('weekly'), ('biweekly'), ('monthly'), ('quarterly'), ('semiannual'), ('annual')
) AS subscription_types(subscription_type)
WHERE p.id IS NOT NULL
ON CONFLICT (product_id, subscription_type) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE product_subscription_config IS 'Configuration table for product-specific subscription options and pricing';
COMMENT ON COLUMN product_subscription_config.discount_percentage IS 'Discount percentage for this subscription type (0-100)';
COMMENT ON COLUMN product_subscription_config.min_quantity IS 'Minimum quantity required for this subscription type';
COMMENT ON COLUMN product_subscription_config.max_quantity IS 'Maximum quantity allowed for this subscription type (NULL = no limit)';