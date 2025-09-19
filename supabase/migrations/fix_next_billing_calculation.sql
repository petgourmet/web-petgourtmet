-- Función para calcular la próxima fecha de facturación basada en la frecuencia
CREATE OR REPLACE FUNCTION calculate_next_billing_date(
  base_date TIMESTAMPTZ,
  subscription_type VARCHAR,
  frequency INTEGER DEFAULT 1,
  frequency_type TEXT DEFAULT 'months'
) RETURNS TIMESTAMPTZ AS $$
BEGIN
  -- Si frequency_type está especificado, usarlo
  IF frequency_type IS NOT NULL THEN
    CASE frequency_type
      WHEN 'days' THEN
        RETURN base_date + (frequency || ' days')::INTERVAL;
      WHEN 'weeks' THEN
        RETURN base_date + (frequency || ' weeks')::INTERVAL;
      WHEN 'months' THEN
        RETURN base_date + (frequency || ' months')::INTERVAL;
      ELSE
        -- Default a months si frequency_type no es reconocido
        RETURN base_date + (frequency || ' months')::INTERVAL;
    END CASE;
  END IF;
  
  -- Fallback al subscription_type si frequency_type no está disponible
  CASE subscription_type
    WHEN 'weekly' THEN
      RETURN base_date + INTERVAL '1 week';
    WHEN 'biweekly' THEN
      RETURN base_date + INTERVAL '2 weeks';
    WHEN 'monthly' THEN
      RETURN base_date + INTERVAL '1 month';
    WHEN 'quarterly' THEN
      RETURN base_date + INTERVAL '3 months';
    WHEN 'semiannual' THEN
      RETURN base_date + INTERVAL '6 months';
    WHEN 'annual' THEN
      RETURN base_date + INTERVAL '1 year';
    ELSE
      -- Default a monthly si no se reconoce el tipo
      RETURN base_date + INTERVAL '1 month';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Actualizar todas las suscripciones activas que no tienen next_billing_date
UPDATE unified_subscriptions 
SET 
  next_billing_date = calculate_next_billing_date(
    COALESCE(last_billing_date, start_date, created_at),
    subscription_type,
    COALESCE(frequency, 1),
    COALESCE(frequency_type, 'months')
  ),
  updated_at = NOW()
WHERE status IN ('active', 'pending', 'processing')
  AND next_billing_date IS NULL;

-- Función trigger para calcular automáticamente next_billing_date
CREATE OR REPLACE FUNCTION update_next_billing_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo calcular para suscripciones activas/pendientes/procesando
  IF NEW.status IN ('active', 'pending', 'processing') THEN
    -- Si no hay next_billing_date o si cambió la frecuencia, recalcular
    IF NEW.next_billing_date IS NULL OR 
       OLD.subscription_type != NEW.subscription_type OR
       OLD.frequency != NEW.frequency OR
       OLD.frequency_type != NEW.frequency_type THEN
      
      NEW.next_billing_date := calculate_next_billing_date(
        COALESCE(NEW.last_billing_date, NEW.start_date, NEW.created_at),
        NEW.subscription_type,
        COALESCE(NEW.frequency, 1),
        COALESCE(NEW.frequency_type, 'months')
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar automáticamente next_billing_date
DROP TRIGGER IF EXISTS trigger_update_next_billing_date ON unified_subscriptions;
CREATE TRIGGER trigger_update_next_billing_date
  BEFORE INSERT OR UPDATE ON unified_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_next_billing_date();

-- Función para procesar pagos y actualizar next_billing_date
CREATE OR REPLACE FUNCTION process_subscription_payment(
  subscription_id INTEGER,
  payment_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS VOID AS $$
DECLARE
  sub_record RECORD;
BEGIN
  -- Obtener datos de la suscripción
  SELECT * INTO sub_record 
  FROM unified_subscriptions 
  WHERE id = subscription_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Suscripción no encontrada: %', subscription_id;
  END IF;
  
  -- Actualizar la suscripción con el nuevo pago
  UPDATE unified_subscriptions 
  SET 
    last_billing_date = payment_date,
    next_billing_date = calculate_next_billing_date(
      payment_date,
      sub_record.subscription_type,
      COALESCE(sub_record.frequency, 1),
      COALESCE(sub_record.frequency_type, 'months')
    ),
    charges_made = COALESCE(charges_made, 0) + 1,
    status = CASE 
      WHEN status = 'pending' THEN 'active'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = subscription_id;
END;
$$ LANGUAGE plpgsql;

-- Verificar que todas las suscripciones activas tengan next_billing_date
SELECT 
  COUNT(*) as total_active_subscriptions,
  COUNT(next_billing_date) as with_next_billing_date,
  COUNT(*) - COUNT(next_billing_date) as missing_next_billing_date
FROM unified_subscriptions 
WHERE status IN ('active', 'pending', 'processing');

-- Mostrar algunas suscripciones con sus fechas calculadas
SELECT 
  id,
  user_id,
  subscription_type,
  frequency,
  frequency_type,
  status,
  created_at,
  start_date,
  last_billing_date,
  next_billing_date
FROM unified_subscriptions 
WHERE status IN ('active', 'pending', 'processing')
ORDER BY created_at DESC
LIMIT 10;