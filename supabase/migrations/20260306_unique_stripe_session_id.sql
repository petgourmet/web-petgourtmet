-- Agregar constraint UNIQUE en stripe_session_id para garantizar idempotencia
-- Esto previene órdenes duplicadas cuando tanto el webhook como la API 
-- intentan crear la orden simultáneamente

-- Primero verificar y eliminar duplicados si existen
DELETE FROM orders a USING orders b
WHERE a.id > b.id 
  AND a.stripe_session_id = b.stripe_session_id
  AND a.stripe_session_id IS NOT NULL;

-- Crear unique constraint
ALTER TABLE orders 
ADD CONSTRAINT orders_stripe_session_id_unique 
UNIQUE (stripe_session_id);
