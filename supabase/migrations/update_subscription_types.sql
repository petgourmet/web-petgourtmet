-- Actualizar constraint de subscription_type para permitir todas las frecuencias
-- Incluye: weekly, biweekly, monthly, quarterly, annual

-- Eliminar el constraint existente
ALTER TABLE user_subscriptions 
DROP CONSTRAINT IF EXISTS user_subscriptions_subscription_type_check;

-- Agregar el nuevo constraint con todas las frecuencias
ALTER TABLE user_subscriptions 
ADD CONSTRAINT user_subscriptions_subscription_type_check 
CHECK (subscription_type::text = ANY (ARRAY[
  'weekly'::character varying::text, 
  'biweekly'::character varying::text, 
  'monthly'::character varying::text, 
  'quarterly'::character varying::text, 
  'annual'::character varying::text
]));

-- Verificar que el constraint se aplicó correctamente
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'user_subscriptions'::regclass 
AND conname = 'user_subscriptions_subscription_type_check';

-- Comentario sobre las frecuencias soportadas
COMMENT ON COLUMN user_subscriptions.subscription_type IS 
'Tipo de suscripción: weekly (semanal), biweekly (quincenal), monthly (mensual), quarterly (trimestral), annual (anual)';