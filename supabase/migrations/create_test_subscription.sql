-- Crear perfil de usuario de prueba para cristoferscalante@gmail.com
-- Usando un UUID válido sin depender de auth.users
INSERT INTO public.profiles (id, email, full_name, first_name, last_name, role, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'cristoferscalante@gmail.com',
  'Cristofer Escalante',
  'Cristofer',
  'Escalante',
  'user',
  NOW(),
  NOW()
);

-- Obtener el ID del usuario recién creado
DO $$
DECLARE
    user_uuid UUID;
BEGIN
    -- Obtener el ID del usuario
    SELECT id INTO user_uuid FROM public.profiles WHERE email = 'cristoferscalante@gmail.com';
    
    -- Limpiar suscripción pendiente existente si existe
    DELETE FROM public.pending_subscriptions 
    WHERE external_reference = 'TEST_CRISTOFER_2024_001';
    
    -- Crear suscripción pendiente de prueba
    INSERT INTO public.pending_subscriptions (
      user_id,
      subscription_type,
      status,
      external_reference,
      customer_data,
      cart_items,
      created_at,
      updated_at
    )
    VALUES (
      user_uuid,
      'monthly',
      'pending',
      'TEST_CRISTOFER_2024_001',
      '{
        "email": "cristoferscalante@gmail.com",
        "name": "Cristofer Escalante",
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
          "price": 899.00,
          "discounted_price": 719.20,
          "discount_percentage": 20,
          "quantity": 1,
          "size": "15kg",
          "image": "/images/products/premium-dog-food.jpg",
          "description": "Alimento premium con ingredientes naturales para perros adultos"
        }
      ]',
      NOW(),
      NOW()
    );
END $$;

-- Verificar que los datos se insertaron correctamente
SELECT 
  ps.id,
  ps.external_reference,
  ps.subscription_type,
  ps.status,
  p.email,
  p.full_name,
  p.id as user_id
FROM pending_subscriptions ps
JOIN profiles p ON ps.user_id = p.id
WHERE ps.external_reference = 'TEST_CRISTOFER_2024_001';