-- Script SQL para corregir la orden 90 y crear la suscripción correspondiente
-- Fecha: 31 de Julio, 2025
-- Orden: #90 - Fabian Gutierrez
-- Problema: Suscripción no guardada, pago en estado pendiente

-- =====================================================
-- PASO 1: VERIFICAR ESTADO ACTUAL DE LA ORDEN 90
-- =====================================================

SELECT 
    id,
    customer_name,
    customer_phone,
    status,
    payment_status,
    total,
    payment_method,
    payment_intent_id,
    mercadopago_payment_id,
    created_at,
    confirmed_at
FROM orders 
WHERE id = 90;

-- =====================================================
-- PASO 2: VERIFICAR SI YA EXISTE SUSCRIPCIÓN
-- =====================================================

SELECT * 
FROM user_subscriptions 
WHERE external_reference = '90' 
   OR external_reference LIKE '%90%';

-- =====================================================
-- PASO 3: OBTENER DATOS DEL USUARIO
-- =====================================================

SELECT 
    auth_users_id,
    email,
    first_name,
    last_name,
    phone
FROM profiles 
WHERE email = 'fabyo66@hotmail.com';

-- =====================================================
-- PASO 4: VERIFICAR PRODUCTO DE SUSCRIPCIÓN
-- =====================================================

SELECT 
    id,
    name,
    description,
    price,
    image,
    category
FROM products 
WHERE id = 65;

-- =====================================================
-- PASO 5: ACTUALIZAR ESTADO DE LA ORDEN 90
-- =====================================================

-- Actualizar orden a estado pagado y procesando
UPDATE orders 
SET 
    payment_status = 'paid',
    status = 'processing',
    confirmed_at = NOW(),
    updated_at = NOW()
WHERE id = 90;

-- Verificar actualización
SELECT 
    id,
    status,
    payment_status,
    confirmed_at,
    updated_at
FROM orders 
WHERE id = 90;

-- =====================================================
-- PASO 6: CREAR SUSCRIPCIÓN PARA LA ORDEN 90
-- =====================================================

-- Insertar nueva suscripción
INSERT INTO user_subscriptions (
    user_id,
    product_id,
    product_name,
    product_image,
    subscription_type,
    quantity,
    base_price,
    discounted_price,
    status,
    next_billing_date,
    last_billing_date,
    external_reference,
    customer_phone,
    is_active,
    created_at,
    updated_at
) 
SELECT 
    p.auth_users_id,                                    -- user_id del perfil
    65,                                                 -- product_id
    'Pastel por porción de pollo y verduras x 6 unidades', -- product_name
    COALESCE(prod.image, ''),                          -- product_image
    'monthly',                                          -- subscription_type (mensual por defecto)
    1,                                                  -- quantity
    330.48,                                            -- base_price
    330.48,                                            -- discounted_price
    'authorized',                                       -- status (autorizada porque el pago está hecho)
    NOW() + INTERVAL '1 month',                        -- next_billing_date (próximo mes)
    NOW(),                                             -- last_billing_date (ahora, primer pago)
    '90',                                              -- external_reference (ID de la orden)
    '5616683424',                                      -- customer_phone
    true,                                              -- is_active
    NOW(),                                             -- created_at
    NOW()                                              -- updated_at
FROM profiles p
LEFT JOIN products prod ON prod.id = 65
WHERE p.email = 'fabyo66@hotmail.com'
LIMIT 1;

-- Verificar que se creó la suscripción
SELECT 
    id,
    user_id,
    product_name,
    subscription_type,
    status,
    external_reference,
    is_active,
    next_billing_date,
    created_at
FROM user_subscriptions 
WHERE external_reference = '90';

-- =====================================================
-- PASO 7: CREAR HISTORIAL DE FACTURACIÓN
-- =====================================================

-- Insertar registro en historial de facturación
INSERT INTO subscription_billing_history (
    subscription_id,
    user_id,
    amount,
    status,
    billing_date,
    payment_method,
    created_at
)
SELECT 
    us.id,                                             -- subscription_id
    us.user_id,                                        -- user_id
    330.48,                                            -- amount
    'completed',                                       -- status
    NOW(),                                             -- billing_date
    'mercadopago',                                     -- payment_method
    NOW()                                              -- created_at
FROM user_subscriptions us
WHERE us.external_reference = '90'
LIMIT 1;

-- Verificar historial de facturación
SELECT 
    sbh.id,
    sbh.subscription_id,
    sbh.amount,
    sbh.status,
    sbh.billing_date,
    sbh.payment_method,
    us.product_name
FROM subscription_billing_history sbh
JOIN user_subscriptions us ON us.id = sbh.subscription_id
WHERE us.external_reference = '90';

-- =====================================================
-- PASO 8: VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que todo está correcto
SELECT 
    'ORDEN' as tipo,
    o.id,
    o.customer_name,
    o.status,
    o.payment_status,
    o.total,
    o.confirmed_at
FROM orders o
WHERE o.id = 90

UNION ALL

SELECT 
    'SUSCRIPCIÓN' as tipo,
    us.id,
    us.product_name,
    us.status,
    CASE WHEN us.is_active THEN 'active' ELSE 'inactive' END,
    us.discounted_price,
    us.created_at
FROM user_subscriptions us
WHERE us.external_reference = '90'

UNION ALL

SELECT 
    'FACTURACIÓN' as tipo,
    sbh.id,
    'Primer pago',
    sbh.status,
    sbh.payment_method,
    sbh.amount,
    sbh.billing_date
FROM subscription_billing_history sbh
JOIN user_subscriptions us ON us.id = sbh.subscription_id
WHERE us.external_reference = '90';

-- =====================================================
-- PASO 9: CONSULTAS DE VALIDACIÓN PARA EL USUARIO
-- =====================================================

-- Verificar que el usuario puede ver su suscripción
SELECT 
    us.id,
    us.product_name,
    us.subscription_type,
    us.status,
    us.is_active,
    us.next_billing_date,
    us.discounted_price as monthly_price
FROM user_subscriptions us
JOIN profiles p ON p.auth_users_id = us.user_id
WHERE p.email = 'fabyo66@hotmail.com'
  AND us.is_active = true;

-- Verificar historial de pagos del usuario
SELECT 
    sbh.billing_date,
    sbh.amount,
    sbh.status,
    sbh.payment_method,
    us.product_name
FROM subscription_billing_history sbh
JOIN user_subscriptions us ON us.id = sbh.subscription_id
JOIN profiles p ON p.auth_users_id = us.user_id
WHERE p.email = 'fabyo66@hotmail.com'
ORDER BY sbh.billing_date DESC;

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================

/*
1. Este script corrige manualmente la orden 90 que no se procesó correctamente
2. Actualiza el estado de la orden de 'pending' a 'paid' y 'processing'
3. Crea la suscripción correspondiente en user_subscriptions
4. Genera el historial de facturación para el primer pago
5. Establece la próxima fecha de facturación para el siguiente mes

DESPUÉS DE EJECUTAR ESTE SCRIPT:
- El usuario debería ver su suscripción en el perfil
- El admin debería poder gestionar la suscripción
- El sistema debería procesar automáticamente el próximo pago
- Se debería enviar confirmación por email al cliente

PARA VERIFICAR QUE TODO FUNCIONA:
1. Revisar perfil del usuario: fabyo66@hotmail.com
2. Verificar en admin dashboard que aparece la suscripción
3. Confirmar que la próxima fecha de facturación es correcta
4. Probar que se puede pausar/reactivar la suscripción
*/