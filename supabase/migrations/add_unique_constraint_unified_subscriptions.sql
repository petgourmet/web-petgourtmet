-- Agregar constraint único para evitar duplicados en unified_subscriptions
-- Este constraint garantiza que no puede haber dos registros con el mismo user_id y external_reference

ALTER TABLE unified_subscriptions 
ADD CONSTRAINT unique_user_external_reference 
UNIQUE (user_id, external_reference);

-- Verificar que el constraint se creó correctamente
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'unified_subscriptions'::regclass 
AND conname = 'unique_user_external_reference';