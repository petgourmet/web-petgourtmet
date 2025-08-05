-- Agregar campos de suscripción y venta a la tabla products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sale_type VARCHAR(10) DEFAULT 'unit',
ADD COLUMN IF NOT EXISTS weight_reference TEXT,
ADD COLUMN IF NOT EXISTS subscription_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_types JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS weekly_discount NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS biweekly_discount NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS monthly_discount NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS quarterly_discount NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS annual_discount NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS weekly_mercadopago_url TEXT,
ADD COLUMN IF NOT EXISTS biweekly_mercadopago_url TEXT,
ADD COLUMN IF NOT EXISTS monthly_mercadopago_url TEXT,
ADD COLUMN IF NOT EXISTS quarterly_mercadopago_url TEXT,
ADD COLUMN IF NOT EXISTS annual_mercadopago_url TEXT,
ADD COLUMN IF NOT EXISTS purchase_types JSONB DEFAULT '["single"]'::jsonb,
ADD COLUMN IF NOT EXISTS subscription_discount NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2),
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS nutrition_info JSONB DEFAULT '{}'::jsonb;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_products_sale_type ON products(sale_type);
CREATE INDEX IF NOT EXISTS idx_products_subscription_available ON products(subscription_available);
CREATE INDEX IF NOT EXISTS idx_products_subscription_types ON products USING GIN(subscription_types);
CREATE INDEX IF NOT EXISTS idx_products_purchase_types ON products USING GIN(purchase_types);

-- Comentarios para documentar los nuevos campos
COMMENT ON COLUMN products.sale_type IS 'Tipo de venta: unit (por unidad) o weight (por peso)';
COMMENT ON COLUMN products.weight_reference IS 'Referencia de peso para productos vendidos por peso';
COMMENT ON COLUMN products.subscription_available IS 'Indica si el producto está disponible para suscripción';
COMMENT ON COLUMN products.subscription_types IS 'Tipos de suscripción disponibles: weekly, biweekly, monthly, quarterly, annual';
COMMENT ON COLUMN products.weekly_discount IS 'Descuento porcentual para suscripción semanal';
COMMENT ON COLUMN products.biweekly_discount IS 'Descuento porcentual para suscripción quincenal';
COMMENT ON COLUMN products.monthly_discount IS 'Descuento porcentual para suscripción mensual';
COMMENT ON COLUMN products.quarterly_discount IS 'Descuento porcentual para suscripción trimestral';
COMMENT ON COLUMN products.annual_discount IS 'Descuento porcentual para suscripción anual';
COMMENT ON COLUMN products.weekly_mercadopago_url IS 'URL de MercadoPago para suscripción semanal';
COMMENT ON COLUMN products.biweekly_mercadopago_url IS 'URL de MercadoPago para suscripción quincenal';
COMMENT ON COLUMN products.monthly_mercadopago_url IS 'URL de MercadoPago para suscripción mensual';
COMMENT ON COLUMN products.quarterly_mercadopago_url IS 'URL de MercadoPago para suscripción trimestral';
COMMENT ON COLUMN products.annual_mercadopago_url IS 'URL de MercadoPago para suscripción anual';
COMMENT ON COLUMN products.purchase_types IS 'Tipos de compra disponibles: single, subscription';
COMMENT ON COLUMN products.subscription_discount IS 'Descuento general para suscripciones (fallback)';
COMMENT ON COLUMN products.average_rating IS 'Calificación promedio del producto';
COMMENT ON COLUMN products.review_count IS 'Número total de reseñas';
COMMENT ON COLUMN products.nutrition_info IS 'Información nutricional en formato JSON';