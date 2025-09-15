-- Crear usuario de prueba cristoferscalante@gmail.com
-- Insertar directamente sin ON CONFLICT ya que no hay constraint único en email

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

-- Verificar que el usuario fue creado
SELECT id, email, full_name FROM public.profiles WHERE email = 'cristoferscalante@gmail.com';