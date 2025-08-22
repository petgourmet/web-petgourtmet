-- Migración para agregar columna customer_email a la tabla orders
-- Ejecutar en Supabase SQL Editor

-- Agregar columna customer_email si no existe
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'customer_email';

-- Comentario: Esta columna almacenará el email del cliente para órdenes
-- Permite null para mantener compatibilidad con órdenes existentes