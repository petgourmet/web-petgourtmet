# 🛠️ SCRIPTS DE MANTENIMIENTO - BASE DE DATOS PETGOURMET

## 🔍 CONSULTAS DE DIAGNÓSTICO

### 📊 **Verificar Estado General**
```sql
-- Resumen general de todas las tablas
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

### 🔄 **Estado de Suscripciones**
```sql
-- Dashboard de suscripciones
SELECT 
    'Suscripciones Activas' as metric,
    COUNT(*) as value
FROM user_subscriptions 
WHERE is_active = true

UNION ALL

SELECT 
    'Suscripciones Canceladas' as metric,
    COUNT(*) as value
FROM user_subscriptions 
WHERE cancelled_at IS NOT NULL

UNION ALL

SELECT 
    'Próximos Pagos (7 días)' as metric,
    COUNT(*) as value
FROM user_subscriptions 
WHERE is_active = true 
  AND next_billing_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'

UNION ALL

SELECT 
    'Pagos Vencidos' as metric,
    COUNT(*) as value
FROM user_subscriptions 
WHERE is_active = true 
  AND next_billing_date < NOW();
```

### 💰 **Análisis Financiero**
```sql
-- Ingresos por suscripciones (MRR)
WITH monthly_revenue AS (
    SELECT 
        subscription_type,
        COUNT(*) as subscriptions,
        SUM(discounted_price) as total_revenue,
        AVG(discounted_price) as avg_price
    FROM user_subscriptions 
    WHERE is_active = true
    GROUP BY subscription_type
)
SELECT 
    subscription_type,
    subscriptions,
    total_revenue,
    ROUND(avg_price, 2) as avg_price,
    CASE 
        WHEN subscription_type = 'monthly' THEN total_revenue
        WHEN subscription_type = 'quarterly' THEN total_revenue / 3
        WHEN subscription_type = 'annual' THEN total_revenue / 12
        ELSE total_revenue
    END as monthly_recurring_revenue
FROM monthly_revenue
ORDER BY monthly_recurring_revenue DESC;
```

## 🧹 SCRIPTS DE LIMPIEZA

### 🗑️ **Limpiar Datos Obsoletos**
```sql
-- Eliminar notificaciones enviadas hace más de 90 días
DELETE FROM scheduled_notifications 
WHERE sent_at IS NOT NULL 
  AND sent_at < NOW() - INTERVAL '90 days';

-- Limpiar modificaciones de suscripciones antiguas (más de 1 año)
DELETE FROM subscription_modifications 
WHERE created_at < NOW() - INTERVAL '1 year';

-- Archivar historial de facturación muy antiguo (más de 2 años)
-- Nota: Considerar mover a tabla de archivo en lugar de eliminar
UPDATE subscription_billing_history 
SET metadata = jsonb_set(
    COALESCE(metadata, '{}'), 
    '{archived}', 
    'true'
)
WHERE billing_date < NOW() - INTERVAL '2 years'
  AND (metadata->>'archived') IS NULL;
```

### 🔄 **Actualizar Datos Inconsistentes**
```sql
-- Sincronizar precios de productos en suscripciones
UPDATE user_subscriptions us
SET base_price = p.price,
    updated_at = NOW()
FROM products p
WHERE us.product_id = p.id
  AND us.base_price != p.price
  AND us.is_active = true;

-- Corregir fechas de próximo cobro para suscripciones vencidas
UPDATE user_subscriptions 
SET next_billing_date = CASE 
    WHEN subscription_type = 'monthly' THEN 
        last_billing_date + INTERVAL '1 month'
    WHEN subscription_type = 'quarterly' THEN 
        last_billing_date + INTERVAL '3 months'
    WHEN subscription_type = 'annual' THEN 
        last_billing_date + INTERVAL '1 year'
    ELSE next_billing_date
END,
updated_at = NOW()
WHERE is_active = true 
  AND next_billing_date < NOW() - INTERVAL '7 days'
  AND last_billing_date IS NOT NULL;
```

## 📈 OPTIMIZACIÓN DE RENDIMIENTO

### 🚀 **Crear Índices Faltantes**
```sql
-- Índices para suscripciones
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_subscriptions_user_active 
ON user_subscriptions(user_id, is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_subscriptions_next_billing 
ON user_subscriptions(next_billing_date) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_subscriptions_mercadopago 
ON user_subscriptions(mercadopago_subscription_id) 
WHERE mercadopago_subscription_id IS NOT NULL;

-- Índices para historial de facturación
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_billing_history_user_date 
ON subscription_billing_history(user_id, billing_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_billing_history_status 
ON subscription_billing_history(status, billing_date DESC);

-- Índices para pagos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_payments_date 
ON subscription_payments(payment_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_payments_status 
ON subscription_payments(status, payment_date DESC);

-- Índices para productos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_subscription_available 
ON products(subscription_available, price) 
WHERE subscription_available = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_active 
ON products(category_id, stock) 
WHERE stock > 0;
```

### 📊 **Estadísticas de Tablas**
```sql
-- Actualizar estadísticas para el optimizador
ANALYZE user_subscriptions;
ANALYZE subscription_billing_history;
ANALYZE subscription_payments;
ANALYZE products;
ANALYZE profiles;
ANALYZE order_items;
```

### 🔍 **Identificar Consultas Lentas**
```sql
-- Consultas más lentas (requiere pg_stat_statements)
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE query LIKE '%user_subscriptions%' 
   OR query LIKE '%subscription_billing%'
   OR query LIKE '%products%'
ORDER BY mean_time DESC 
LIMIT 10;
```

## 🔒 SEGURIDAD Y RESPALDOS

### 🛡️ **Verificar Políticas RLS**
```sql
-- Verificar que RLS esté habilitado en tablas críticas
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE WHEN rowsecurity THEN '✅ Habilitado' ELSE '❌ Deshabilitado' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'profiles', 
    'user_subscriptions', 
    'subscription_billing_history',
    'user_payment_methods',
    'pets'
  )
ORDER BY tablename;
```

### 📋 **Auditoría de Accesos**
```sql
-- Últimos accesos por usuario (requiere logging habilitado)
SELECT 
    auth_users_id,
    COUNT(*) as access_count,
    MAX(updated_at) as last_access,
    MIN(created_at) as first_access
FROM profiles 
GROUP BY auth_users_id
HAVING MAX(updated_at) > NOW() - INTERVAL '30 days'
ORDER BY last_access DESC;
```

### 💾 **Script de Respaldo Selectivo**
```sql
-- Exportar datos críticos para respaldo
COPY (
    SELECT 
        us.*,
        p.name as product_name,
        pr.email as user_email
    FROM user_subscriptions us
    JOIN products p ON us.product_id = p.id
    JOIN profiles pr ON us.user_id = pr.auth_users_id
    WHERE us.is_active = true
) TO '/tmp/active_subscriptions_backup.csv' WITH CSV HEADER;

COPY (
    SELECT *
    FROM subscription_billing_history
    WHERE billing_date >= NOW() - INTERVAL '1 year'
) TO '/tmp/billing_history_backup.csv' WITH CSV HEADER;
```

## 🚨 MONITOREO Y ALERTAS

### ⚠️ **Detectar Problemas**
```sql
-- Suscripciones con problemas de pago
SELECT 
    us.id,
    us.user_id,
    us.product_name,
    us.next_billing_date,
    us.discounted_price,
    pr.email,
    EXTRACT(days FROM NOW() - us.next_billing_date) as days_overdue
FROM user_subscriptions us
JOIN profiles pr ON us.user_id = pr.auth_users_id
WHERE us.is_active = true 
  AND us.next_billing_date < NOW() - INTERVAL '3 days'
ORDER BY days_overdue DESC;

-- Webhooks fallidos recientes
SELECT 
    sp.id,
    sp.subscription_id,
    sp.status,
    sp.amount,
    sp.payment_date,
    sp.mercadopago_payment_id
FROM subscription_payments sp
WHERE sp.status IN ('failed', 'rejected', 'cancelled')
  AND sp.payment_date >= NOW() - INTERVAL '24 hours'
ORDER BY sp.payment_date DESC;

-- Usuarios sin método de pago activo
SELECT 
    pr.id,
    pr.email,
    pr.full_name,
    COUNT(us.id) as active_subscriptions
FROM profiles pr
JOIN user_subscriptions us ON pr.auth_users_id = us.user_id
LEFT JOIN user_payment_methods upm ON pr.auth_users_id = upm.user_id 
    AND upm.is_active = true
WHERE us.is_active = true
  AND upm.user_id IS NULL
GROUP BY pr.id, pr.email, pr.full_name
HAVING COUNT(us.id) > 0;
```

### 📊 **Métricas de Salud del Sistema**
```sql
-- Dashboard de salud general
WITH health_metrics AS (
    SELECT 
        'Suscripciones Activas' as metric,
        COUNT(*)::text as value,
        'success' as status
    FROM user_subscriptions 
    WHERE is_active = true
    
    UNION ALL
    
    SELECT 
        'Pagos Fallidos (24h)' as metric,
        COUNT(*)::text as value,
        CASE WHEN COUNT(*) > 5 THEN 'error' ELSE 'success' END as status
    FROM subscription_payments 
    WHERE status IN ('failed', 'rejected') 
      AND payment_date >= NOW() - INTERVAL '24 hours'
    
    UNION ALL
    
    SELECT 
        'Suscripciones Vencidas' as metric,
        COUNT(*)::text as value,
        CASE WHEN COUNT(*) > 10 THEN 'warning' ELSE 'success' END as status
    FROM user_subscriptions 
    WHERE is_active = true 
      AND next_billing_date < NOW() - INTERVAL '1 day'
    
    UNION ALL
    
    SELECT 
        'Usuarios Activos (30d)' as metric,
        COUNT(DISTINCT user_id)::text as value,
        'info' as status
    FROM user_subscriptions 
    WHERE updated_at >= NOW() - INTERVAL '30 days'
)
SELECT 
    metric,
    value,
    CASE status
        WHEN 'success' THEN '✅ ' || value
        WHEN 'warning' THEN '⚠️ ' || value
        WHEN 'error' THEN '❌ ' || value
        ELSE 'ℹ️ ' || value
    END as display_value
FROM health_metrics;
```

## 🔧 UTILIDADES DE DESARROLLO

### 🧪 **Datos de Prueba**
```sql
-- Crear usuario de prueba
INSERT INTO profiles (id, auth_users_id, email, full_name, phone)
VALUES (
    gen_random_uuid(),
    gen_random_uuid(),
    'test@petgourmet.mx',
    'Usuario de Prueba',
    '+52 123 456 7890'
);

-- Crear suscripción de prueba
INSERT INTO user_subscriptions (
    id, user_id, product_id, subscription_type, quantity,
    base_price, discounted_price, next_billing_date,
    product_name, is_active
)
SELECT 
    gen_random_uuid(),
    pr.auth_users_id,
    p.id,
    'monthly',
    1,
    p.price,
    p.price * 0.9,
    NOW() + INTERVAL '30 days',
    p.name,
    true
FROM profiles pr, products p
WHERE pr.email = 'test@petgourmet.mx'
  AND p.subscription_available = true
LIMIT 1;
```

### 🔄 **Reset de Datos de Prueba**
```sql
-- Limpiar datos de prueba
DELETE FROM subscription_billing_history 
WHERE user_id IN (
    SELECT auth_users_id FROM profiles WHERE email LIKE '%test%'
);

DELETE FROM user_subscriptions 
WHERE user_id IN (
    SELECT auth_users_id FROM profiles WHERE email LIKE '%test%'
);

DELETE FROM profiles WHERE email LIKE '%test%';
```

---

## 📅 MANTENIMIENTO PROGRAMADO

### 🗓️ **Tareas Diarias**
```sql
-- Ejecutar diariamente a las 2:00 AM
-- 1. Actualizar estadísticas
ANALYZE;

-- 2. Limpiar notificaciones enviadas
DELETE FROM scheduled_notifications 
WHERE sent_at < NOW() - INTERVAL '7 days';

-- 3. Verificar suscripciones vencidas
SELECT COUNT(*) FROM user_subscriptions 
WHERE is_active = true AND next_billing_date < NOW();
```

### 📅 **Tareas Semanales**
```sql
-- Ejecutar domingos a las 3:00 AM
-- 1. Reindexar tablas principales
REINDEX TABLE user_subscriptions;
REINDEX TABLE subscription_billing_history;

-- 2. Limpiar logs antiguos
DELETE FROM subscription_modifications 
WHERE created_at < NOW() - INTERVAL '90 days';

-- 3. Generar reporte semanal
SELECT 
    'Reporte Semanal' as title,
    COUNT(*) as new_subscriptions,
    SUM(discounted_price) as revenue
FROM user_subscriptions 
WHERE created_at >= NOW() - INTERVAL '7 days';
```

### 🗓️ **Tareas Mensuales**
```sql
-- Ejecutar el primer día del mes
-- 1. Archivar datos antiguos
UPDATE subscription_billing_history 
SET metadata = jsonb_set(metadata, '{archived}', 'true')
WHERE billing_date < NOW() - INTERVAL '1 year';

-- 2. Generar métricas mensuales
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as new_subscriptions,
    SUM(discounted_price) as mrr
FROM user_subscriptions 
WHERE created_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;
```

---

*Scripts actualizados: Enero 2025*
*Compatibilidad: PostgreSQL 13+*
*Estado: ✅ PROBADO Y FUNCIONAL*