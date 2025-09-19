-- Consultar productos existentes para usar en las pruebas
SELECT id, name, price, subscription_available, monthly_discount 
FROM products 
WHERE subscription_available = true 
LIMIT 5;

-- Si no hay productos con suscripción disponible, insertar uno de prueba
INSERT INTO products (
  name, 
  slug, 
  description, 
  price, 
  image, 
  subscription_available, 
  monthly_discount,
  stock
) 
SELECT 
  'Plan Pet Gourmet Premium', 
  'plan-pet-gourmet-premium', 
  'Plan premium de alimentación para mascotas con ingredientes de alta calidad', 
  120.00, 
  '/placeholder.svg', 
  true, 
  20.00,
  100
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE subscription_available = true
);

-- Mostrar el resultado final
SELECT id, name, price, subscription_available, monthly_discount 
FROM products 
WHERE subscription_available = true 
LIMIT 5;