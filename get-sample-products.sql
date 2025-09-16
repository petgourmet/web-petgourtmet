-- Obtener algunos productos de ejemplo para las pruebas
SELECT id, name, price, subscription_available 
FROM products 
WHERE subscription_available = true 
LIMIT 3;

-- También obtener algunos usuarios de ejemplo
SELECT id, email 
FROM auth.users 
LIMIT 2;