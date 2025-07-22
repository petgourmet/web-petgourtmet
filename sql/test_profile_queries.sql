-- =====================================================
-- SCRIPT PARA PROBAR EL PERFIL DE USUARIO - CORREGIDO
-- =====================================================

-- 1. Verificar estructura de la tabla profiles (NO users)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================

-- 2. Verificar estructura de la tabla order_items (NO orders)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_items' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================

-- 3. Verificar estructura de la tabla user_subscriptions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================

-- 4. Verificar datos de ejemplo en order_items (primeras 5)
SELECT 
    id,
    order_id,
    product_name,
    product_image,
    quantity,
    price,
    size
FROM order_items 
ORDER BY id DESC
LIMIT 5;

-- =====================================================

-- 5. Verificar datos de ejemplo en order_items con productos
SELECT 
    oi.id,
    oi.order_id,
    oi.product_name,
    oi.product_image,
    oi.quantity,
    oi.price,
    oi.size,
    p.name as product_db_name,
    p.image as product_db_image
FROM order_items oi
LEFT JOIN products p ON p.name ILIKE '%' || oi.product_name || '%'
ORDER BY oi.id DESC
LIMIT 10;

-- =====================================================

-- 6. Verificar suscripciones activas en user_subscriptions
SELECT 
    id,
    user_id,
    product_id,
    subscription_type,
    quantity,
    size,
    discount_percentage,
    base_price,
    discounted_price,
    next_billing_date,
    is_active,
    created_at
FROM user_subscriptions 
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================

-- 7. Verificar suscripciones en tabla subscriptions
SELECT 
    id,
    plan_id,
    plan_name,
    status,
    current_period_start,
    current_period_end,
    created_at
FROM subscriptions 
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================

-- 8. Verificar profiles de usuarios
SELECT 
    id,
    auth_users_id,
    email,
    full_name,
    phone,
    address,
    created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================

-- 9. Consulta completa para probar el perfil (reemplazar AUTH_USER_ID)
-- Reemplaza 'AUTH_USER_ID_AQUI' con un ID real de usuario de Supabase Auth
/*
-- Perfil del usuario
SELECT 
    p.*
FROM profiles p
WHERE p.auth_users_id = 'AUTH_USER_ID_AQUI';

-- Order items del usuario (no hay relación directa, necesitarías implementarla)
SELECT 
    oi.*,
    prod.name as product_name_db,
    prod.image as product_image_db
FROM order_items oi
LEFT JOIN products prod ON prod.name ILIKE '%' || oi.product_name || '%'
ORDER BY oi.id DESC
LIMIT 20;

-- Suscripciones del usuario
SELECT 
    us.*,
    p.name as product_name,
    p.image as product_image,
    p.price as product_price
FROM user_subscriptions us
LEFT JOIN products p ON us.product_id = p.id
WHERE us.user_id = 'AUTH_USER_ID_AQUI'
   AND us.is_active = true;
*/

-- =====================================================

-- 10. Insertar datos de ejemplo para pruebas (opcional)
-- Solo ejecutar si necesitas datos de prueba

/*
-- Ejemplo de perfil de prueba
INSERT INTO profiles (
    id,
    auth_users_id,
    email,
    full_name,
    phone,
    address,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'AUTH_USER_ID_AQUI', -- Reemplazar con ID real de Supabase Auth
    'test@example.com',
    'Usuario de Prueba',
    '+52 123 456 7890',
    'Calle de Prueba 123, Ciudad',
    NOW(),
    NOW()
);

-- Ejemplo de order_item de prueba
INSERT INTO order_items (
    id,
    order_id,
    product_name,
    product_image,
    quantity,
    price,
    size
) VALUES (
    gen_random_uuid(),
    gen_random_uuid(), -- ID de orden ficticio
    'Pastel de Carne',
    '/pastel-carne.png',
    2,
    125.00,
    '200g'
);

-- Ejemplo de suscripción de prueba
INSERT INTO user_subscriptions (
    id,
    user_id,
    product_id,
    subscription_type,
    quantity,
    size,
    discount_percentage,
    base_price,
    discounted_price,
    next_billing_date,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'AUTH_USER_ID_AQUI', -- Reemplazar con ID real
    1, -- ID de producto existente
    'monthly',
    1,
    '200g',
    10.0,
    250.00,
    225.00, -- Precio con descuento
    (NOW() + INTERVAL '1 month'),
    true,
    NOW(),
    NOW()
);
*/
