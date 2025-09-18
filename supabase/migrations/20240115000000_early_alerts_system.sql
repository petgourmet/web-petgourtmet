-- 🔄 MIGRACIÓN: SISTEMA DE ALERTAS TEMPRANAS Y NOTIFICACIONES
-- Fecha: 2024-01-15
-- Descripción: Crear tablas para el sistema de alertas tempranas de suscripciones y notificaciones proactivas

-- 📊 TABLA: ALERTAS DE VENCIMIENTO ENVIADAS
CREATE TABLE IF NOT EXISTS expiration_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES unified_subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('1_day', '3_days', '7_days')),
  days_until_expiration INTEGER NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_expiration_alerts_subscription_id ON expiration_alerts(subscription_id);
CREATE INDEX IF NOT EXISTS idx_expiration_alerts_user_id ON expiration_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_expiration_alerts_created_at ON expiration_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_expiration_alerts_alert_type ON expiration_alerts(alert_type);

-- 🚨 TABLA: FALLOS DE PAGO
CREATE TABLE IF NOT EXISTS payment_failures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES unified_subscriptions(id) ON DELETE CASCADE,
  error_message TEXT NOT NULL,
  error_code VARCHAR(100),
  retry_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_payment_failures_subscription_id ON payment_failures(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_failures_created_at ON payment_failures(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_failures_retry_count ON payment_failures(retry_count);

-- 🔧 TABLA: PROBLEMAS DEL SISTEMA
CREATE TABLE IF NOT EXISTS system_issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(100) NOT NULL CHECK (type IN (
    'database_connection', 
    'payment_gateway_down', 
    'email_service_error', 
    'api_rate_limit', 
    'security_breach', 
    'performance_degradation'
  )),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  component VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_system_issues_type ON system_issues(type);
CREATE INDEX IF NOT EXISTS idx_system_issues_severity ON system_issues(severity);
CREATE INDEX IF NOT EXISTS idx_system_issues_created_at ON system_issues(created_at);
CREATE INDEX IF NOT EXISTS idx_system_issues_resolved_at ON system_issues(resolved_at);

-- 📧 TABLA: LOG DE NOTIFICACIONES ENVIADAS
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  recipient_count INTEGER DEFAULT 0,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_severity ON notification_logs(severity);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);

-- 🚨 TABLA: ALERTAS INMEDIATAS
CREATE TABLE IF NOT EXISTS immediate_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_immediate_alerts_created_at ON immediate_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_immediate_alerts_acknowledged_at ON immediate_alerts(acknowledged_at);

-- 🔄 FUNCIÓN: ACTUALIZAR TIMESTAMP
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 🔄 TRIGGERS PARA ACTUALIZAR TIMESTAMPS
CREATE TRIGGER update_expiration_alerts_updated_at 
  BEFORE UPDATE ON expiration_alerts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_failures_updated_at 
  BEFORE UPDATE ON payment_failures 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_issues_updated_at 
  BEFORE UPDATE ON system_issues 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 📊 VISTA: RESUMEN DE ALERTAS DIARIAS
CREATE OR REPLACE VIEW daily_alerts_summary AS
SELECT 
  DATE(created_at) as alert_date,
  alert_type,
  severity,
  COUNT(*) as alert_count,
  COUNT(DISTINCT user_id) as unique_users
FROM expiration_alerts
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), alert_type, severity
ORDER BY alert_date DESC, alert_type, severity;

-- 📊 VISTA: RESUMEN DE PROBLEMAS DEL SISTEMA
CREATE OR REPLACE VIEW system_health_summary AS
SELECT 
  DATE(created_at) as issue_date,
  type,
  severity,
  COUNT(*) as issue_count,
  COUNT(CASE WHEN resolved_at IS NOT NULL THEN 1 END) as resolved_count,
  COUNT(CASE WHEN resolved_at IS NULL THEN 1 END) as pending_count
FROM system_issues
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at), type, severity
ORDER BY issue_date DESC, type, severity;

-- 🔐 HABILITAR RLS (Row Level Security)
ALTER TABLE expiration_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE immediate_alerts ENABLE ROW LEVEL SECURITY;

-- 🔐 POLÍTICAS RLS PARA ADMINISTRADORES
CREATE POLICY "Admins can view all expiration alerts" ON expiration_alerts
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage all expiration alerts" ON expiration_alerts
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can view all payment failures" ON payment_failures
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage all payment failures" ON payment_failures
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can view all system issues" ON system_issues
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage all system issues" ON system_issues
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can view all notification logs" ON notification_logs
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage all notification logs" ON notification_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can view all immediate alerts" ON immediate_alerts
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage all immediate alerts" ON immediate_alerts
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- 🔐 POLÍTICAS RLS PARA USUARIOS (solo sus propios datos)
CREATE POLICY "Users can view their own expiration alerts" ON expiration_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own payment failures" ON payment_failures
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM unified_subscriptions WHERE id = subscription_id
    )
  );

-- 📝 COMENTARIOS EN TABLAS
COMMENT ON TABLE expiration_alerts IS 'Registro de alertas de vencimiento enviadas a usuarios';
COMMENT ON TABLE payment_failures IS 'Registro de fallos de pago para seguimiento y análisis';
COMMENT ON TABLE system_issues IS 'Registro de problemas del sistema para monitoreo';
COMMENT ON TABLE notification_logs IS 'Log de todas las notificaciones enviadas a administradores';
COMMENT ON TABLE immediate_alerts IS 'Alertas críticas que requieren atención inmediata';

-- ✅ MIGRACIÓN COMPLETADA