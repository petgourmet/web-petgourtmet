-- Insertar datos de prueba para pending_subscriptions
-- Primero, crear un usuario de prueba si no existe
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'test@petgourmet.com',
  '$2a$10$abcdefghijklmnopqrstuvwxyz',
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"email": "test@petgourmet.com"}',
  false,
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Crear perfil para el usuario de prueba
INSERT INTO public.profiles (id, email, full_name, first_name, last_name, phone, role)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'test@petgourmet.com',
  'Usuario de Prueba',
  'Usuario',
  'Prueba',
  '+52 55 1234 5678',
  'user'
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone = EXCLUDED.phone;

-- Insertar suscripción pendiente de prueba
INSERT INTO public.pending_subscriptions (
  user_id,
  subscription_type,
  status,
  external_reference,
  customer_data,
  cart_items,
  notes
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'monthly',
  'pending',
  'TEST-REF-12345',
  '{
    "email": "test@petgourmet.com",
    "first_name": "Usuario",
    "last_name": "Prueba",
    "phone": "+52 55 1234 5678",
    "address": {
      "street": "Calle Ejemplo 123",
      "city": "Ciudad de México",
      "state": "CDMX",
      "zip_code": "01000",
      "country": "México"
    }
  }',
  '[
    {
      "id": 1,
      "name": "Alimento Premium para Perros",
      "price": 899.99,
      "quantity": 1,
      "size": "15kg",
      "image": "/images/products/premium-dog-food.jpg",
      "subscription_discount": 15,
      "final_price": 764.99
    }
  ]',
  'Suscripción de prueba para testing del flujo completo'
) ON CONFLICT (external_reference) DO UPDATE SET
  status = 'pending',
  updated_at = NOW();

-- Otorgar permisos necesarios
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_subscriptions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;