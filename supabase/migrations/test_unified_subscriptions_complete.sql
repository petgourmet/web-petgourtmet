-- =====================================================
-- TEST COMPLETO DE UNIFIED_SUBSCRIPTIONS
-- Análisis de integridad de datos para correos, perfil y administración
-- =====================================================

-- 1. ANÁLISIS GENERAL DE LA TABLA
SELECT 
    'ANÁLISIS GENERAL' as seccion,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as activas,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendientes,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as canceladas,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as con_usuario,
    COUNT(CASE WHEN external_reference IS NOT NULL THEN 1 END) as con_referencia_externa
FROM unified_subscriptions;

-- 2. VERIFICACIÓN DE RELACIÓN USER_ID
SELECT 
    'RELACIÓN USUARIOS' as seccion,
    us.id,
    us.user_id,
    us.external_reference,
    us.status,
    CASE 
        WHEN us.user_id IS NULL THEN 'SIN USUARIO ASIGNADO'
        WHEN au.id IS NULL THEN 'USUARIO NO EXISTE EN AUTH'
        ELSE 'RELACIÓN CORRECTA'
    END as estado_relacion,
    au.email as email_usuario
FROM unified_subscriptions us
LEFT JOIN auth.users au ON us.user_id = au.id
ORDER BY us.created_at DESC;

-- 3. ANÁLISIS DE CUSTOMER_DATA (DATOS PARA CORREOS)
SELECT 
    'CUSTOMER_DATA PARA CORREOS' as seccion,
    id,
    external_reference,
    status,
    CASE 
        WHEN customer_data IS NULL THEN 'SIN CUSTOMER_DATA'
        WHEN customer_data->>'email' IS NULL THEN 'SIN EMAIL'
        WHEN customer_data->>'name' IS NULL THEN 'SIN NOMBRE'
        WHEN customer_data->>'phone' IS NULL THEN 'SIN TELÉFONO'
        ELSE 'DATOS COMPLETOS'
    END as estado_customer_data,
    customer_data->>'email' as email,
    customer_data->>'name' as nombre,
    customer_data->>'phone' as telefono,
    customer_data->>'address' as direccion,
    customer_data->>'city' as ciudad,
    customer_data->>'state' as estado,
    customer_data->>'zip_code' as codigo_postal
FROM unified_subscriptions
ORDER BY created_at DESC;

-- 4. ANÁLISIS DE CART_ITEMS (DATOS DEL PRODUCTO)
SELECT 
    'CART_ITEMS PRODUCTOS' as seccion,
    id,
    external_reference,
    product_name,
    product_image,
    size,
    quantity,
    base_price,
    discounted_price,
    transaction_amount,
    CASE 
        WHEN cart_items IS NULL THEN 'SIN CART_ITEMS'
        WHEN jsonb_array_length(cart_items) = 0 THEN 'CART_ITEMS VACÍO'
        ELSE 'TIENE PRODUCTOS'
    END as estado_cart_items,
    cart_items
FROM unified_subscriptions
ORDER BY created_at DESC;

-- 5. ANÁLISIS DE FECHAS Y REFERENCIAS MERCADOPAGO
SELECT 
    'FECHAS Y REFERENCIAS MP' as seccion,
    id,
    external_reference,
    mercadopago_subscription_id,
    mercadopago_plan_id,
    preapproval_plan_id,
    created_at,
    start_date,
    next_billing_date,
    last_billing_date,
    processed_at,
    CASE 
        WHEN external_reference IS NULL THEN 'SIN EXTERNAL_REFERENCE'
        WHEN mercadopago_subscription_id IS NULL THEN 'SIN MP_SUBSCRIPTION_ID'
        WHEN next_billing_date IS NULL AND status = 'active' THEN 'ACTIVA SIN PRÓXIMA FECHA'
        ELSE 'REFERENCIAS COMPLETAS'
    END as estado_referencias
FROM unified_subscriptions
ORDER BY created_at DESC;

-- 6. ANÁLISIS DETALLADO DE PRODUCTOS (PARA PERFIL Y ADMIN)
SELECT 
    'DATOS PARA PERFIL/ADMIN' as seccion,
    us.id,
    us.external_reference,
    us.status,
    us.subscription_type,
    us.product_name,
    us.size,
    us.quantity,
    us.base_price,
    us.discounted_price,
    us.discount_percentage,
    us.transaction_amount,
    us.currency_id,
    us.frequency,
    us.frequency_type,
    us.charges_made,
    us.created_at,
    us.next_billing_date,
    p.name as product_name_from_table,
    p.price as product_price_from_table,
    p.image as product_image_from_table,
    CASE 
        WHEN us.product_name IS NULL AND p.name IS NULL THEN 'SIN NOMBRE PRODUCTO'
        WHEN us.base_price IS NULL AND p.price IS NULL THEN 'SIN PRECIO'
        WHEN us.product_image IS NULL AND p.image IS NULL THEN 'SIN IMAGEN'
        ELSE 'DATOS PRODUCTO OK'
    END as estado_producto
FROM unified_subscriptions us
LEFT JOIN products p ON us.product_id = p.id
ORDER BY us.created_at DESC;

-- 7. REPORTE DE INTEGRIDAD GENERAL
SELECT 
    'REPORTE INTEGRIDAD' as seccion,
    'CAMPOS CRÍTICOS FALTANTES' as tipo,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as sin_user_id,
    COUNT(CASE WHEN external_reference IS NULL THEN 1 END) as sin_external_reference,
    COUNT(CASE WHEN customer_data IS NULL THEN 1 END) as sin_customer_data,
    COUNT(CASE WHEN customer_data->>'email' IS NULL THEN 1 END) as sin_email,
    COUNT(CASE WHEN product_name IS NULL THEN 1 END) as sin_product_name,
    COUNT(CASE WHEN base_price IS NULL THEN 1 END) as sin_base_price,
    COUNT(CASE WHEN next_billing_date IS NULL AND status = 'active' THEN 1 END) as activas_sin_next_billing
FROM unified_subscriptions;

-- 8. CONSULTA ESPECÍFICA PARA CORREOS
SELECT 
    'DATOS PARA CORREOS' as seccion,
    id,
    external_reference,
    customer_data->>'email' as email_cliente,
    customer_data->>'name' as nombre_cliente,
    product_name,
    size,
    quantity,
    base_price,
    discounted_price,
    subscription_type,
    frequency,
    frequency_type,
    next_billing_date,
    created_at,
    status
FROM unified_subscriptions
WHERE customer_data->>'email' IS NOT NULL
ORDER BY created_at DESC;

-- 9. CONSULTA ESPECÍFICA PARA PERFIL DE USUARIO
SELECT 
    'DATOS PARA PERFIL USUARIO' as seccion,
    us.id,
    us.external_reference,
    us.status,
    us.product_name,
    us.product_image,
    us.size,
    us.quantity,
    us.base_price,
    us.discounted_price,
    us.subscription_type,
    us.next_billing_date,
    us.charges_made,
    us.created_at,
    au.email as user_email
FROM unified_subscriptions us
LEFT JOIN auth.users au ON us.user_id = au.id
WHERE us.user_id IS NOT NULL
ORDER BY us.created_at DESC;

-- 10. CONSULTA ESPECÍFICA PARA PANEL DE ADMINISTRADOR
SELECT 
    'DATOS PARA ADMIN PANEL' as seccion,
    us.id,
    us.external_reference,
    us.mercadopago_subscription_id,
    us.status,
    us.product_name,
    us.size,
    us.quantity,
    us.base_price,
    us.discounted_price,
    us.transaction_amount,
    us.subscription_type,
    us.frequency,
    us.frequency_type,
    us.charges_made,
    us.created_at,
    us.next_billing_date,
    us.last_billing_date,
    us.processed_at,
    customer_data->>'email' as customer_email,
    customer_data->>'name' as customer_name,
    customer_data->>'phone' as customer_phone,
    au.email as user_email,
    us.notes,
    us.reason
FROM unified_subscriptions us
LEFT JOIN auth.users au ON us.user_id = au.id
ORDER BY us.created_at DESC;

-- 11. VERIFICACIÓN DE DATOS JSON (CART_ITEMS Y CUSTOMER_DATA)
SELECT 
    'ESTRUCTURA JSON' as seccion,
    id,
    external_reference,
    CASE 
        WHEN customer_data IS NULL THEN 'customer_data: NULL'
        WHEN jsonb_typeof(customer_data) != 'object' THEN 'customer_data: TIPO INCORRECTO'
        ELSE 'customer_data: OK'
    END as estado_customer_data_json,
    CASE 
        WHEN cart_items IS NULL THEN 'cart_items: NULL'
        WHEN jsonb_typeof(cart_items) != 'array' THEN 'cart_items: TIPO INCORRECTO'
        WHEN jsonb_array_length(cart_items) = 0 THEN 'cart_items: ARRAY VACÍO'
        ELSE 'cart_items: OK'
    END as estado_cart_items_json,
    jsonb_array_length(cart_items) as cantidad_items_carrito
FROM unified_subscriptions
ORDER BY created_at DESC;

-- 12. RESUMEN FINAL DE ESTADO
SELECT 
    'RESUMEN FINAL' as seccion,
    COUNT(*) as total_suscripciones,
    COUNT(CASE WHEN user_id IS NOT NULL AND customer_data->>'email' IS NOT NULL AND product_name IS NOT NULL AND base_price IS NOT NULL THEN 1 END) as completamente_funcionales,
    COUNT(CASE WHEN user_id IS NULL OR customer_data->>'email' IS NULL OR product_name IS NULL OR base_price IS NULL THEN 1 END) as con_datos_faltantes,
    CASE 
        WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND(
            (COUNT(CASE WHEN user_id IS NOT NULL AND customer_data->>'email' IS NOT NULL AND product_name IS NOT NULL AND base_price IS NOT NULL THEN 1 END) * 100.0 / COUNT(*)), 2
        )
    END as porcentaje_integridad
FROM unified_subscriptions;