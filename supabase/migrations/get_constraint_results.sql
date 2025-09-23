-- Obtener información sobre constraints únicos
DO $$
DECLARE
    constraint_exists boolean;
    duplicate_records record;
    user_records record;
BEGIN
    -- Verificar si existe el constraint único
    SELECT EXISTS(
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'unified_subscriptions'::regclass 
            AND conname = 'unique_user_external_reference'
    ) INTO constraint_exists;
    
    RAISE NOTICE 'Constraint unique_user_external_reference exists: %', constraint_exists;
    
    -- Mostrar registros del usuario problemático
    RAISE NOTICE '--- Registros del usuario cristoferscalante@gmail.com ---';
    FOR user_records IN 
        SELECT 
            us.id,
            us.user_id,
            us.external_reference,
            us.status,
            us.created_at,
            p.email
        FROM unified_subscriptions us
        JOIN profiles p ON us.user_id = p.id
        WHERE p.email = 'cristoferscalante@gmail.com'
        ORDER BY us.created_at DESC
    LOOP
        RAISE NOTICE 'ID: %, User: %, External Ref: %, Status: %, Created: %', 
            user_records.id, user_records.user_id, user_records.external_reference, 
            user_records.status, user_records.created_at;
    END LOOP;
    
    -- Mostrar duplicados globales
    RAISE NOTICE '--- Duplicados globales por user_id + external_reference ---';
    FOR duplicate_records IN 
        SELECT 
            user_id,
            external_reference,
            COUNT(*) as duplicate_count,
            array_agg(id) as record_ids
        FROM unified_subscriptions
        GROUP BY user_id, external_reference
        HAVING COUNT(*) > 1
        ORDER BY duplicate_count DESC
    LOOP
        RAISE NOTICE 'User: %, External Ref: %, Count: %, IDs: %', 
            duplicate_records.user_id, duplicate_records.external_reference, 
            duplicate_records.duplicate_count, duplicate_records.record_ids;
    END LOOP;
END $$;