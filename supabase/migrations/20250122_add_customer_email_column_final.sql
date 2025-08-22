-- Agregar columna customer_email a la tabla orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);

-- Crear índice para mejorar el rendimiento de las consultas por email
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);

-- Comentario para documentar el nuevo campo
COMMENT ON COLUMN orders.customer_email IS 'Email del cliente que realizó la compra';

-- Actualizar órdenes existentes que tienen shipping_address con customer_data
-- para extraer el email del cliente
UPDATE orders 
SET customer_email = (
  CASE 
    WHEN shipping_address IS NOT NULL AND shipping_address::text LIKE '%customer_data%' THEN
      (shipping_address::json->'customer_data'->>'email')
    ELSE NULL
  END
)
WHERE customer_email IS NULL 
  AND shipping_address IS NOT NULL 
  AND shipping_address::text LIKE '%customer_data%';

-- Actualizar órdenes que no tienen customer_email pero tienen datos en shipping_address
-- con emails que no sean el genérico
UPDATE orders 
SET customer_email = (
  shipping_address::json->'customer_data'->>'email'
)
WHERE customer_email IS NULL 
  AND shipping_address IS NOT NULL 
  AND shipping_address::text LIKE '%customer_data%'
  AND (shipping_address::json->'customer_data'->>'email') IS NOT NULL
  AND (shipping_address::json->'customer_data'->>'email') != 'cliente@petgourmet.mx';