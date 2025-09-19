-- Agregar campo shipping_cost a la tabla orders
ALTER TABLE orders ADD COLUMN shipping_cost NUMERIC DEFAULT 0;

-- Agregar campo subtotal a la tabla orders
ALTER TABLE orders ADD COLUMN subtotal NUMERIC DEFAULT 0;

-- Agregar comentarios a los campos
COMMENT ON COLUMN orders.shipping_cost IS 'Costo de envío de la orden';
COMMENT ON COLUMN orders.subtotal IS 'Subtotal de la orden (sin envío ni impuestos)';

-- Actualizar órdenes existentes con valores por defecto
UPDATE orders SET shipping_cost = 0 WHERE shipping_cost IS NULL;
UPDATE orders SET subtotal = total WHERE subtotal IS NULL;

-- Hacer los campos NOT NULL después de actualizar
ALTER TABLE orders ALTER COLUMN shipping_cost SET NOT NULL;
ALTER TABLE orders ALTER COLUMN subtotal SET NOT NULL;

-- Agregar índices para consultas
CREATE INDEX idx_orders_shipping_cost ON orders(shipping_cost);
CREATE INDEX idx_orders_subtotal ON orders(subtotal);