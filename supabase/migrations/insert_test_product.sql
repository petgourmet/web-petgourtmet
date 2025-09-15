-- Insertar producto de prueba para testing
INSERT INTO products (
  id,
  name,
  slug,
  description,
  price,
  image,
  category_id,
  featured,
  stock,
  subscription_available,
  monthly_discount,
  quarterly_discount,
  annual_discount
) VALUES (
  1,
  'Alimento Premium para Perros',
  'alimento-premium-perros',
  'Alimento balanceado premium para perros adultos con ingredientes naturales',
  25000.00,
  '/images/products/alimento-premium.jpg',
  1,
  true,
  100,
  true,
  10.00,
  15.00,
  20.00
) ON CONFLICT (id) DO NOTHING;

-- Insertar categoría si no existe
INSERT INTO categories (id, name, slug, description) 
VALUES (1, 'Alimentos', 'alimentos', 'Alimentos para mascotas')
ON CONFLICT (id) DO NOTHING;

-- Otorgar permisos necesarios
GRANT SELECT, INSERT, UPDATE, DELETE ON products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO authenticated;