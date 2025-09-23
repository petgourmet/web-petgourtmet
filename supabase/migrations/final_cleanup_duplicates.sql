-- Limpieza definitiva de duplicados existentes
-- El constraint único existe y funciona, pero hay duplicados previos que deben eliminarse

BEGIN;

-- 1. Mostrar duplicados actuales antes de la limpieza
SELECT 
    'BEFORE_CLEANUP' as status,
    us.id,
    us.user_id,
    us.external_reference,
    us.status,
    us.created_at,
    us.updated_at,
    p.email
FROM unified_subscriptions us
JOIN profiles p ON us.user_id = p.id
WHERE p.email = 'cristoferscalante@gmail.com'
ORDER BY us.created_at DESC;

-- 2. Eliminar duplicados manteniendo solo el registro más reciente y completo
DO $$
DECLARE
    user_uuid UUID;
    records_to_delete INTEGER;
BEGIN
    -- Obtener el UUID del usuario
    SELECT p.id INTO user_uuid
    FROM profiles p 
    WHERE p.email = 'cristoferscalante@gmail.com';
    
    IF user_uuid IS NULL THEN
        RAISE NOTICE 'Usuario no encontrado';
        RETURN;
    END IF;
    
    -- Eliminar duplicados manteniendo solo el más reciente por external_reference
    WITH ranked_subscriptions AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY user_id, external_reference 
                ORDER BY 
                    CASE WHEN status = 'active' THEN 1 ELSE 2 END,
                    CASE WHEN updated_at IS NOT NULL THEN updated_at ELSE created_at END DESC
            ) as rn
        FROM unified_subscriptions
        WHERE user_id = user_uuid
            AND external_reference IS NOT NULL
    ),
    duplicates_to_delete AS (
        SELECT id 
        FROM ranked_subscriptions 
        WHERE rn > 1
    )
    DELETE FROM unified_subscriptions 
    WHERE id IN (SELECT id FROM duplicates_to_delete);
    
    GET DIAGNOSTICS records_to_delete = ROW_COUNT;
    RAISE NOTICE 'Registros duplicados eliminados: %', records_to_delete;
    
END $$;

-- 3. Mostrar estado final después de la limpieza
SELECT 
    'AFTER_CLEANUP' as status,
    us.id,
    us.user_id,
    us.external_reference,
    us.status,
    us.created_at,
    us.updated_at,
    p.email
FROM unified_subscriptions us
JOIN profiles p ON us.user_id = p.id
WHERE p.email = 'cristoferscalante@gmail.com'
ORDER BY us.created_at DESC;

-- 4. Verificar que no quedan duplicados globales
SELECT 
    'REMAINING_DUPLICATES' as status,
    user_id,
    external_reference,
    COUNT(*) as count
FROM unified_subscriptions
WHERE external_reference IS NOT NULL
GROUP BY user_id, external_reference
HAVING COUNT(*) > 1;

-- 5. Activar la suscripción si está en pending
UPDATE unified_subscriptions 
SET 
    status = 'active',
    updated_at = NOW()
WHERE user_id = (
    SELECT p.id 
    FROM profiles p 
    WHERE p.email = 'cristoferscalante@gmail.com'
)
AND status = 'pending'
AND external_reference IS NOT NULL;

COMMIT;

-- 6. Mostrar resultado final
SELECT 
    'FINAL_RESULT' as status,
    us.id,
    us.external_reference,
    us.status,
    us.subscription_type,
    us.created_at,
    us.updated_at
FROM unified_subscriptions us
JOIN profiles p ON us.user_id = p.id
WHERE p.email = 'cristoferscalante@gmail.com'
ORDER BY us.created_at DESC;