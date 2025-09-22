-- Consultar productos existentes para obtener un ID válido
SELECT id, name, price, subscription_available 
FROM products 
WHERE subscription_available = true 
LIMIT 5;

-- Si no hay productos con suscripción disponible, mostrar los primeros 5
SELECT id, name, price 
FROM products 
LIMIT 5;