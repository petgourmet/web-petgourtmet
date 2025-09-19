-- Ver los resultados de la consulta anterior
DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Obtener la suscripción más reciente
    SELECT * INTO rec FROM unified_subscriptions ORDER BY created_at DESC LIMIT 1;
    
    IF rec IS NOT NULL THEN
        RAISE NOTICE 'DATOS DE LA SUSCRIPCIÓN MÁS RECIENTE:';
        RAISE NOTICE 'ID: %', rec.id;
        RAISE NOTICE 'Producto: %', rec.product_name;
        RAISE NOTICE 'Base Price: %', COALESCE(rec.base_price::text, 'NULL');
        RAISE NOTICE 'Discount Percentage: %', COALESCE(rec.discount_percentage::text, 'NULL');
        RAISE NOTICE 'Discounted Price: %', COALESCE(rec.discounted_price::text, 'NULL');
        RAISE NOTICE 'Transaction Amount: %', COALESCE(rec.transaction_amount::text, 'NULL');
        RAISE NOTICE 'Quantity: %', COALESCE(rec.quantity::text, 'NULL');
        RAISE NOTICE 'Status: %', rec.status;
        RAISE NOTICE 'Created At: %', rec.created_at;
        RAISE NOTICE '---';
        
        -- Análisis de los campos de precio
        IF rec.base_price IS NULL OR rec.base_price = 0 THEN
            RAISE NOTICE 'PROBLEMA: base_price es NULL o 0';
        ELSE
            RAISE NOTICE 'OK: base_price tiene valor válido: %', rec.base_price;
        END IF;
        
        IF rec.discounted_price IS NULL OR rec.discounted_price = 0 THEN
            RAISE NOTICE 'PROBLEMA: discounted_price es NULL o 0';
        ELSE
            RAISE NOTICE 'OK: discounted_price tiene valor válido: %', rec.discounted_price;
        END IF;
        
        IF rec.transaction_amount IS NULL OR rec.transaction_amount = 0 THEN
            RAISE NOTICE 'PROBLEMA: transaction_amount es NULL o 0';
        ELSE
            RAISE NOTICE 'OK: transaction_amount tiene valor válido: %', rec.transaction_amount;
        END IF;
    ELSE
        RAISE NOTICE 'NO SE ENCONTRARON SUSCRIPCIONES';
    END IF;
END $$;