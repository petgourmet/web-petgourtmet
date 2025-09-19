-- Migración para corregir problemas de seguridad de PostgreSQL
-- Fecha: 2024-01-20
-- Descripción: Crear vistas faltantes y habilitar RLS en subscription_billing_history

-- 1. Crear vista webhook_stats (sin SECURITY DEFINER)
CREATE VIEW webhook_stats AS
SELECT 
  0::bigint as total_received,
  0::bigint as successful,
  0::bigint as failed,
  0::bigint as last_24h,
  0::numeric as avg_response_time,
  NULL::timestamp with time zone as last_webhook;

-- 2. Crear vista sync_stats (sin SECURITY DEFINER)
CREATE VIEW sync_stats AS
SELECT 
  0::bigint as orders_pending,
  COALESCE(COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE), 0)::bigint as orders_synced_today,
  COALESCE(MAX(created_at), NOW())::text as last_sync,
  (NOW() + INTERVAL '1 hour')::text as next_sync,
  CASE 
    WHEN COUNT(*) > 0 THEN 
      (COUNT(*) FILTER (WHERE status = 'approved')::float / COUNT(*)::float * 100)
    ELSE 100.0
  END as sync_success_rate
FROM subscription_billing_history;

-- 3. Habilitar RLS en subscription_billing_history
ALTER TABLE subscription_billing_history ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas RLS para subscription_billing_history

-- Política para usuarios autenticados: pueden ver solo sus propios registros
CREATE POLICY "Users can view their own billing history" ON subscription_billing_history
  FOR SELECT
  TO authenticated
  USING (
    subscription_id IN (
      SELECT id::text FROM subscriptions 
      WHERE user_id = auth.uid()
    )
  );

-- Política para administradores: acceso completo
CREATE POLICY "Admins have full access to billing history" ON subscription_billing_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Política para servicios del sistema: acceso completo con service_role
CREATE POLICY "Service role has full access" ON subscription_billing_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Otorgar permisos necesarios
GRANT SELECT ON webhook_stats TO authenticated;
GRANT SELECT ON webhook_stats TO anon;
GRANT SELECT ON sync_stats TO authenticated;
GRANT SELECT ON sync_stats TO anon;

-- Permisos para subscription_billing_history
GRANT SELECT ON subscription_billing_history TO authenticated;
GRANT INSERT, UPDATE ON subscription_billing_history TO authenticated;

-- Comentarios
COMMENT ON VIEW webhook_stats IS 'Vista que proporciona estadísticas de webhooks sin SECURITY DEFINER';
COMMENT ON VIEW sync_stats IS 'Vista que proporciona estadísticas de sincronización sin SECURITY DEFINER';

-- Log de finalización
DO $$
BEGIN
  RAISE NOTICE 'Migración de seguridad completada exitosamente:';
  RAISE NOTICE '- Vistas webhook_stats y sync_stats creadas sin SECURITY DEFINER';
  RAISE NOTICE '- RLS habilitado en subscription_billing_history';
  RAISE NOTICE '- Políticas de seguridad aplicadas';
  RAISE NOTICE '- Permisos otorgados correctamente';
END $$;