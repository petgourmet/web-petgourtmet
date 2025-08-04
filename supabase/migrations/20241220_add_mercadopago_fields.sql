-- Agregar campos adicionales de MercadoPago a la tabla orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS collection_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS merchant_order_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS external_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100),
ADD COLUMN IF NOT EXISTS site_id VARCHAR(10),
ADD COLUMN IF NOT EXISTS processing_mode VARCHAR(50),
ADD COLUMN IF NOT EXISTS merchant_account_id VARCHAR(255);

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_orders_collection_id ON orders(collection_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_order_id ON orders(merchant_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_external_reference ON orders(external_reference);
CREATE INDEX IF NOT EXISTS idx_orders_payment_type ON orders(payment_type);

-- Comentarios para documentar los nuevos campos
COMMENT ON COLUMN orders.collection_id IS 'ID de la transacción en MercadoPago';
COMMENT ON COLUMN orders.merchant_order_id IS 'ID de la orden del comerciante en MercadoPago';
COMMENT ON COLUMN orders.external_reference IS 'Referencia externa del pago';
COMMENT ON COLUMN orders.payment_type IS 'Tipo de pago (credit_card, debit_card, cash, etc.)';
COMMENT ON COLUMN orders.payment_method IS 'Método de pago específico';
COMMENT ON COLUMN orders.site_id IS 'ID del sitio de MercadoPago (MLM, MLA, etc.)';
COMMENT ON COLUMN orders.processing_mode IS 'Modo de procesamiento (aggregator, gateway)';
COMMENT ON COLUMN orders.merchant_account_id IS 'ID de la cuenta del comerciante';