-- Consultar productos existentes para obtener un ID válido
SELECT id, name, price, subscription_available 
FROM products 
WHERE subscription_available = true 
ORDER BY id 
LIMIT 5;