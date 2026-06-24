-- ============================================================
-- FIX 1: Crear tabla webhook_logs
-- Esquema unificado que satisface todos los consumidores:
--   - subscription-monitor/page.tsx
--   - app/api/admin/webhooks/recent/route.ts
--   - lib/subscription-integrity-checker.ts
-- ============================================================

CREATE TABLE IF NOT EXISTS webhook_logs (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  source          VARCHAR(50)  NOT NULL DEFAULT 'stripe',   -- 'stripe' | 'mercadopago'
  event_type      VARCHAR(255),           -- e.g. 'checkout.session.completed'
  type            VARCHAR(100),           -- alias / categoría del evento
  action          VARCHAR(100),           -- sub-acción
  status          VARCHAR(20)  DEFAULT 'success',  -- 'success' | 'failed' | 'pending'
  success         BOOLEAN      DEFAULT true,
  data_id         VARCHAR(255),           -- Stripe event ID o MP notification ID
  payload         TEXT,                   -- JSON payload crudo
  error_message   TEXT,
  processing_time INTEGER,                -- tiempo de procesamiento en ms
  processed_at    TIMESTAMPTZ  DEFAULT NOW(),
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_webhook_logs_source     ON webhook_logs(source);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status     ON webhook_logs(status);

-- RLS: lectura solo para service_role (datos sensibles)
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON webhook_logs
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- FIX 2: Columnas faltantes en unified_subscriptions
-- El webhook de Stripe intenta insertar estas columnas y
-- Supabase las ignora silenciosamente — agregamos para persistirlas.
-- ============================================================

ALTER TABLE unified_subscriptions
  ADD COLUMN IF NOT EXISTS shipping_cost   NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processed_at    TIMESTAMPTZ;

-- ============================================================
-- FIX 3: Normalizar spelling de cancelled_at
-- La migración add_paused_at_column.sql creó 'canceled_at' (americano)
-- pero el webhook de Stripe escribe 'cancelled_at' (británico).
-- Añadimos la columna con el spelling del webhook si no existe.
-- ============================================================

ALTER TABLE unified_subscriptions
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Copiar datos existentes de canceled_at a cancelled_at (si la columna vieja existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'unified_subscriptions' AND column_name = 'canceled_at'
  ) THEN
    UPDATE unified_subscriptions
    SET cancelled_at = canceled_at
    WHERE cancelled_at IS NULL AND canceled_at IS NOT NULL;
  END IF;
END $$;
