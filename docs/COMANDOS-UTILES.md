# 🛠️ Comandos Útiles para Administración del Sistema

## 📊 Consultas SQL Útiles (Supabase)

### Ver Suscripciones Activas con Próximos Pagos

```sql
-- Suscripciones ordenadas por fecha de pago
SELECT 
  id,
  customer_name,
  customer_email,
  subscription_type,
  amount,
  status,
  next_billing_date,
  EXTRACT(DAY FROM next_billing_date - NOW()) as days_until_payment,
  CASE 
    WHEN EXTRACT(DAY FROM next_billing_date - NOW()) <= 3 
    THEN '🔔 Notificación próxima'
    ELSE '✅ OK'
  END as notification_status
FROM unified_subscriptions
WHERE status = 'active'
  AND next_billing_date > NOW()
ORDER BY next_billing_date ASC
LIMIT 20;
```

### Historial de Pagos Recientes

```sql
-- Últimos 20 pagos procesados
SELECT 
  s.customer_name,
  s.customer_email,
  sp.amount,
  sp.currency,
  sp.status,
  sp.payment_date,
  sp.stripe_invoice_id
FROM subscription_payments sp
JOIN unified_subscriptions s ON s.id = sp.subscription_id
ORDER BY sp.payment_date DESC
LIMIT 20;
```

### Suscripciones con Problemas de Pago

```sql
-- Ver suscripciones con status problemático
SELECT 
  customer_name,
  customer_email,
  status,
  amount,
  last_payment_date,
  next_billing_date,
  updated_at
FROM unified_subscriptions
WHERE status IN ('past_due', 'unpaid')
ORDER BY updated_at DESC;
```

### Resumen Mensual de Ingresos

```sql
-- Ingresos por mes
SELECT 
  DATE_TRUNC('month', payment_date) as month,
  COUNT(*) as total_payments,
  SUM(amount) as total_revenue,
  COUNT(DISTINCT subscription_id) as unique_subscriptions
FROM subscription_payments
WHERE status = 'succeeded'
  AND payment_date >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', payment_date)
ORDER BY month DESC;
```

### Notificaciones Enviadas Hoy

```sql
-- Ver qué notificaciones deberían enviarse hoy
SELECT 
  customer_name,
  customer_email,
  next_billing_date,
  amount,
  '🔔 Recordatorio enviado' as action
FROM unified_subscriptions
WHERE status = 'active'
  AND next_billing_date::date = (NOW() + INTERVAL '3 days')::date;
```

### Cancelaciones Recientes

```sql
-- Suscripciones canceladas en los últimos 30 días
SELECT 
  customer_name,
  customer_email,
  subscription_type,
  amount,
  cancelled_at,
  EXTRACT(DAY FROM NOW() - cancelled_at::timestamp) as days_ago
FROM unified_subscriptions
WHERE status = 'cancelled'
  AND cancelled_at > NOW() - INTERVAL '30 days'
ORDER BY cancelled_at DESC;
```

## 🔧 Comandos PowerShell para Testing

### Probar Cron Job de Recordatorios

```powershell
# Ejecutar manualmente el cron de recordatorios
$headers = @{
    "Authorization" = "Bearer $env:CRON_SECRET"
}
$response = Invoke-WebRequest -Uri "https://petgourmet.mx/api/cron/upcoming-payments" -Headers $headers -Method GET
$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### Ver Logs en Tiempo Real

```powershell
# Ver todos los logs
vercel logs --follow

# Filtrar por tipo
vercel logs --follow | Select-String "🔔"  # Recordatorios
vercel logs --follow | Select-String "💳"  # Pagos
vercel logs --follow | Select-String "❌"  # Errores
vercel logs --follow | Select-String "EMAIL-SERVICE"  # Emails
```

### Probar Webhooks Localmente

```powershell
# Terminal 1: Iniciar Next.js
pnpm dev

# Terminal 2: Escuchar webhooks de Stripe
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Terminal 3: Disparar eventos de prueba
stripe trigger invoice.payment_succeeded
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

### Generar CRON_SECRET Nuevo

```powershell
# Generar secret seguro de 32 bytes en base64
$bytes = New-Object byte[] 32
$rng = New-Object Security.Cryptography.RNGCryptoServiceProvider
$rng.GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)
Write-Host "CRON_SECRET=$secret"
```

## 🔍 Comandos para Debugging

### Ver Estado de una Suscripción Específica

```sql
-- Reemplazar 'sub_xxxxx' con el ID de Stripe
SELECT 
  s.*,
  (
    SELECT json_agg(sp ORDER BY sp.payment_date DESC)
    FROM subscription_payments sp
    WHERE sp.subscription_id = s.id
    LIMIT 5
  ) as recent_payments
FROM unified_subscriptions s
WHERE stripe_subscription_id = 'sub_xxxxx';
```

### Verificar Sincronización con Stripe

```powershell
# Obtener info de Stripe
$stripeKey = $env:STRIPE_SECRET_KEY
$subId = "sub_xxxxx"
$headers = @{
    "Authorization" = "Bearer $stripeKey"
}
$stripeData = Invoke-RestMethod -Uri "https://api.stripe.com/v1/subscriptions/$subId" -Headers $headers
$stripeData | ConvertTo-Json -Depth 10

# Comparar con BD (ejecutar SQL arriba)
```

### Ver Emails Enviados (Logs)

```powershell
# Buscar logs de emails específicos
vercel logs --since 1d | Select-String "EMAIL-SERVICE" | Select-String "juan@example.com"

# Ver solo errores de email
vercel logs --since 1d | Select-String "EMAIL-SERVICE.*❌"

# Ver emails exitosos
vercel logs --since 1d | Select-String "EMAIL-SERVICE.*✅"
```

## 🚨 Comandos de Emergencia

### Re-sincronizar Suscripción Manual

```sql
-- Forzar actualización manual desde Stripe
-- (Usar después de verificar en Stripe Dashboard)

UPDATE unified_subscriptions
SET 
  status = 'active',  -- Cambiar según Stripe
  next_billing_date = '2024-01-31',  -- Fecha real de Stripe
  current_period_start = '2024-01-01',
  current_period_end = '2024-01-31',
  updated_at = NOW()
WHERE stripe_subscription_id = 'sub_xxxxx';
```

### Reenviar Notificación a Cliente

```powershell
# Si un email falló, crear endpoint temporal para reenviar
# o usar función directa de email-service

# Opción: Trigger cron manualmente con filtro
$headers = @{"Authorization" = "Bearer $env:CRON_SECRET"}
Invoke-WebRequest -Uri "https://petgourmet.mx/api/cron/upcoming-payments" -Headers $headers
```

### Cancelar Notificaciones Programadas

```sql
-- Marcar suscripciones para NO enviar recordatorio
-- (Temporal, hasta que pase la fecha)
UPDATE unified_subscriptions
SET next_billing_date = next_billing_date + INTERVAL '1 day'
WHERE id = 123
  AND status = 'active';
```

### Rollback de Deploy

```powershell
# En caso de problemas, volver a versión anterior
# Desde Vercel Dashboard o CLI:
vercel rollback
```

## 📈 Comandos de Monitoreo Periódico

### Dashboard Diario (SQL)

```sql
-- KPIs diarios
WITH daily_stats AS (
  SELECT 
    COUNT(DISTINCT CASE WHEN status = 'active' THEN id END) as active_subs,
    COUNT(DISTINCT CASE WHEN status = 'cancelled' THEN id END) as cancelled_today,
    COUNT(DISTINCT CASE WHEN DATE(next_billing_date) = CURRENT_DATE + 3 THEN id END) as reminders_today,
    SUM(CASE WHEN status = 'active' THEN amount ELSE 0 END) as monthly_revenue
  FROM unified_subscriptions
)
SELECT 
  '📊 Suscripciones activas' as metric, active_subs as value FROM daily_stats
UNION ALL
SELECT '❌ Canceladas hoy', cancelled_today FROM daily_stats
UNION ALL
SELECT '🔔 Recordatorios hoy', reminders_today FROM daily_stats
UNION ALL
SELECT '💰 Revenue mensual (MXN)', monthly_revenue FROM daily_stats;
```

### Salud del Sistema (PowerShell)

```powershell
# Script para verificar salud del sistema
function Test-SystemHealth {
    Write-Host "🏥 Verificando salud del sistema..." -ForegroundColor Cyan
    
    # 1. Verificar variables de entorno
    Write-Host "`n1️⃣ Variables de Entorno:" -ForegroundColor Yellow
    $envVars = @("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "CRON_SECRET", "SMTP_USER")
    foreach ($var in $envVars) {
        if ($env:$var) {
            Write-Host "   ✅ $var configurado" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $var FALTA" -ForegroundColor Red
        }
    }
    
    # 2. Verificar endpoint de webhook
    Write-Host "`n2️⃣ Endpoint Webhook:" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "https://petgourmet.mx/api/stripe/webhook" -Method POST -ErrorAction Stop
        Write-Host "   ❌ No debería aceptar POST sin firma" -ForegroundColor Red
    } catch {
        if ($_.Exception.Response.StatusCode -eq 400) {
            Write-Host "   ✅ Webhook rechazando requests sin firma (OK)" -ForegroundColor Green
        }
    }
    
    # 3. Verificar logs recientes
    Write-Host "`n3️⃣ Logs Recientes (últimos 100):" -ForegroundColor Yellow
    $logs = vercel logs --since 1h 2>&1 | Select-String "ERROR|❌" 
    if ($logs.Count -eq 0) {
        Write-Host "   ✅ Sin errores en última hora" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ $($logs.Count) errores encontrados" -ForegroundColor Yellow
    }
    
    Write-Host "`n✅ Verificación completa" -ForegroundColor Green
}

# Ejecutar
Test-SystemHealth
```

## 🔄 Comandos de Mantenimiento Semanal

### Limpiar Logs Antiguos

```sql
-- Archivar pagos antiguos (mover a tabla de histórico)
-- Solo si necesitas optimizar rendimiento
INSERT INTO subscription_payments_archive
SELECT * FROM subscription_payments
WHERE payment_date < NOW() - INTERVAL '1 year';

DELETE FROM subscription_payments
WHERE payment_date < NOW() - INTERVAL '1 year';
```

### Verificar Consistencia de Datos

```sql
-- Encontrar suscripciones sin pagos registrados
SELECT s.*
FROM unified_subscriptions s
LEFT JOIN subscription_payments sp ON sp.subscription_id = s.id
WHERE s.status = 'active'
  AND s.created_at < NOW() - INTERVAL '30 days'
  AND sp.id IS NULL;
```

## 📝 Notas Importantes

- **Backups:** Supabase hace backups automáticos, pero considera exportar data crítica semanalmente
- **Logs:** Vercel retiene logs por tiempo limitado según tu plan
- **Monitoreo:** Considera implementar alertas (ej. Sentry, Datadog) para errores críticos
- **Testing:** Siempre probar en ambiente de desarrollo antes de producción

## 🆘 Contactos de Emergencia

- **Stripe Support:** https://support.stripe.com
- **Vercel Support:** https://vercel.com/support
- **Supabase Support:** https://supabase.com/support

---

**Tip:** Guarda estos comandos en un archivo accesible para el equipo de soporte.
