-- Agregar campos para URLs de suscripción de prueba en la tabla products
-- Esto permite tener URLs separadas para modo de pruebas y producción

ALTER TABLE products 
ADD COLUMN weekly_mercadopago_url_test TEXT,
ADD COLUMN biweekly_mercadopago_url_test TEXT,
ADD COLUMN monthly_mercadopago_url_test TEXT,
ADD COLUMN quarterly_mercadopago_url_test TEXT,
ADD COLUMN annual_mercadopago_url_test TEXT;

-- Agregar comentarios para documentar los campos
COMMENT ON COLUMN products.weekly_mercadopago_url_test IS 'URL de Mercado Pago para suscripción semanal en modo de pruebas/sandbox';
COMMENT ON COLUMN products.biweekly_mercadopago_url_test IS 'URL de Mercado Pago para suscripción quincenal en modo de pruebas/sandbox';
COMMENT ON COLUMN products.monthly_mercadopago_url_test IS 'URL de Mercado Pago para suscripción mensual en modo de pruebas/sandbox';
COMMENT ON COLUMN products.quarterly_mercadopago_url_test IS 'URL de Mercado Pago para suscripción trimestral en modo de pruebas/sandbox';
COMMENT ON COLUMN products.annual_mercadopago_url_test IS 'URL de Merca