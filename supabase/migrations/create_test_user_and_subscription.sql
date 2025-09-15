-- Crear usuario de prueba y suscripción pendiente para cristoferscalante@gmail.com

-- Primero, crear el perfil del usuario
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'cristoferscalante@gmail.com',
  'Cristofer Escalante',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- Obtener el ID del usuario y crear la suscripción pendiente
DO $$
DECLARE
    user_id UUID;
    external_ref TEXT := 'TEST-REF-' || EXTRACT(EPOCH FROM NOW())::TEXT;
BEGIN
    -- Obtener el ID del usuario
    SELECT id INTO user_id FROM public.profiles WHERE email = 'cristoferscalante@gmail.com';
    
    -- Limpiar suscripciones pendientes existentes para este usuario
    DELETE FROM public.pending_subscriptions WHERE user_id = user_id;
    
    -- Crear nueva suscripción pendiente
    INSERT INTO public.pending_subscriptions (
        id,
        user_id,
        external_reference,
        subscription_data,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        user_id,
        external_ref,
        '{
            "product_name": "Plan Premium PetGourmet",
            "price": 29.99,
            "discount_percentage": 20,
            "final_price": 23.99,
            "duration_months": 12,
            "features": ["Descuentos exclusivos", "Envío gratis", "Soporte prioritario"]
        }'::jsonb,
        NOW(),
        NOW()
    );
    
    -- Mostrar información de la suscripción creada
    RAISE NOTICE 'Usuario creado/actualizado: %', user_id;
    RAISE NOTICE 'External reference: %', external_ref;
END $$;

-- Verificar los datos creados
SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    ps.external_reference,
    ps.subscription_data
FROM public.profiles p
JOIN public.pending_subscriptions ps ON p.id = ps.user_id
WHERE p.email = 'cristoferscalante@gmail.com';