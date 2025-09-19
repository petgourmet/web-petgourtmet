-- Insertar datos de prueba en billing_history
-- Primero verificamos que existe al menos una suscripción
INSERT INTO public.billing_history (
    subscription_id,
    payment_id,
    amount,
    currency,
    status,
    payment_method,
    transaction_date,
    mercadopago_payment_id,
    mercadopago_status,
    metadata
) 
SELECT 
    us.id as subscription_id,
    'test_payment_001' as payment_id,
    COALESCE(us.transaction_amount, us.discounted_price, us.base_price, 100.00) as amount,
    'MXN' as currency,
    'approved' as status,
    'credit_card' as payment_method,
    NOW() - INTERVAL '1 month' as transaction_date,
    'mp_test_12345' as mercadopago_payment_id,
    'approved' as mercadopago_status,
    '{"test": true, "payment_type": "subscription"}' as metadata
FROM public.unified_subscriptions us
WHERE us.status IN ('active', 'pending')
LIMIT 1;

-- Insertar un segundo registro de prueba si existe la suscripción
INSERT INTO public.billing_history (
    subscription_id,
    payment_id,
    amount,
    currency,
    status,
    payment_method,
    transaction_date,
    mercadopago_payment_id,
    mercadopago_status,
    metadata
) 
SELECT 
    us.id as subscription_id,
    'test_payment_002' as payment_id,
    COALESCE(us.transaction_amount, us.discounted_price, us.base_price, 100.00) as amount,
    'MXN' as currency,
    'pending' as status,
    'debit_card' as payment_method,
    NOW() as transaction_date,
    'mp_test_67890' as mercadopago_payment_id,
    'pending' as mercadopago_status,
    '{"test": true, "payment_type": "subscription", "retry_count": 1}' as metadata
FROM public.unified_subscriptions us
WHERE us.status IN ('active', 'pending')
LIMIT 1;

-- Verificar que los datos se insertaron correctamente
SELECT 
    bh.id,
    bh.subscription_id,
    bh.payment_id,
    bh.amount,
    bh.status,
    bh.transaction_date,
    us.product_name,
    us.subscription_type
FROM public.billing_history bh
JOIN public.unified_subscriptions us ON bh.subscription_id = us.id
WHERE bh.payment_id LIKE 'test_payment_%'
ORDER BY bh.created_at DESC;