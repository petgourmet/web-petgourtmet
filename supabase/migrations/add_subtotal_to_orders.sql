-- Agregar campo subtotal a la tabla orders
ALTER TABLE orders ADD COLUMN subtotal NUMERIC DEFAULT 0;

-- Agregar comentario al campo
COMMENT ON COLUMN orders.subtotal IS 'Subtotal de la orden (sin envío ni impuestos)';

-- Actualizar órdenes existentes con subtotal = total por defecto
UPDATE orders SET subtotal = total WHERE subtotal IS NULL;

-- Hacer el campo NOT NULL después de actualizar
ALTER TABLE orders ALTER COLUMN subtotal SET NOT NULL;

-- Agregar índice para consultas por subtotal
CREATE INDEX idx_orders_subtotal ON orders(subtotal);