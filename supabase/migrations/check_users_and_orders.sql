-- Verificar usuarios existentes en profiles
SELECT id, email, full_name, created_at 
FROM profiles 
ORDER BY created_at DESC;

-- Verificar órdenes sin user_id
SELECT id, customer_email, status, total, created_at
FROM orders 
WHERE user_id IS NULL 
ORDER BY created_at DESC;