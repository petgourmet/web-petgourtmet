# 🚀 Guía de Configuración Rápida - Sistema de Sincronización

## ✅ Checklist de Implementación

### 1️⃣ Variables de Entorno (.env.local)

```bash
# ============================================
# STRIPE
# ============================================
STRIPE_SECRET_KEY=sk_live_xxxxx                    # ✅ Ya configurado
STRIPE_WEBHOOK_SECRET=whsec_xxxxx                  # ⚠️ NUEVO - Obtener de Dashboard

# ============================================
# SUPABASE
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co # ✅ Ya configurado
SUPABASE_SERVICE_ROLE_KEY=xxxxx                    # ✅ Ya configurado

# ============================================
# EMAIL (SMTP)
# ============================================
SMTP_HOST=smtp.gmail.com                           # ✅ Ya configurado
SMTP_PORT=587                                      # ✅ Ya configurado
SMTP_USER=tu-email@petgourmet.mx                   # ✅ Ya configurado
SMTP_PASSWORD=tu-password-smtp                     # ✅ Ya configurado
EMAIL_FROM="Pet Gourmet <noreply@petgourmet.mx>"   # ✅ Ya configurado

# ============================================
# CRON JOB SECURITY
# ============================================
CRON_SECRET=tu-secret-aleatorio-muy-seguro         # ⚠️ NUEVO - Generar uno seguro
```

**Generar CRON_SECRET:**
```bash
# En PowerShell
$bytes = New-Object byte[] 32; (New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes); [Convert]::ToBase64String($bytes)
```

### 2️⃣ Configurar Webhook en Stripe Dashboard

1. **Ir a:** https://dashboard.stripe.com/webhooks

2. **Agregar endpoint:**
   - URL: `https://petgourmet.mx/api/stripe/webhook`
   - Descripción: "Pet Gourmet - Sincronización de suscripciones"

3. **Seleccionar eventos:**
   ```
   ✅ checkout.session.completed
   ✅ invoice.payment_succeeded
   ✅ invoice.payment_failed
   ✅ customer.subscription.updated
   ✅ customer.subscription.deleted
   ```

4. **Copiar Signing Secret:**
   - Aparece como `whsec_xxxxx`
   - Pegarlo en: `STRIPE_WEBHOOK_SECRET`

### 3️⃣ Configurar Variables en Vercel

1. **Ir a:** https://vercel.com/tu-proyecto/settings/environment-variables

2. **Agregar:**
   ```
   CRON_SECRET = [tu secret generado]
   STRIPE_WEBHOOK_SECRET = whsec_xxxxx
   ```

3. **Verificar que ya existan:**
   - ✅ STRIPE_SECRET_KEY
   - ✅ NEXT_PUBLIC_SUPABASE_URL
   - ✅ SUPABASE_SERVICE_ROLE_KEY
   - ✅ SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD

4. **Re-deploy después de agregar:**
   ```bash
   git add .
   git commit -m "Agregar sistema de sincronización completo"
   git push
   ```

### 4️⃣ Verificar Cron Jobs en Vercel

1. **Ir a:** https://vercel.com/tu-proyecto/settings/cron-jobs

2. **Deberías ver:**
   ```
   ✅ /api/cron/subscription-notifications (cada 5 min)
   ✅ /api/cron/upcoming-payments (diario 10:00 AM)
   ```

3. **Si no aparecen:**
   - Vercel detecta automáticamente desde `vercel.json`
   - Hacer push para que se actualice

### 5️⃣ Probar Webhooks (Opcional - Local)

```bash
# Instalar Stripe CLI
# Windows (con scoop):
scoop install stripe

# Login
stripe login

# Escuchar webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook

# En otra terminal, disparar eventos:
stripe trigger invoice.payment_succeeded
stripe trigger customer.subscription.deleted
```

## 🧪 Pruebas Después de Desplegar

### Prueba 1: Webhook de Pago

```bash
# Crear una suscripción de prueba en Stripe Dashboard
# O usar Stripe CLI:
stripe trigger invoice.payment_succeeded
```

**Verificar:**
- ✅ Estado en BD cambió a `active`
- ✅ `last_payment_date` se actualizó
- ✅ Cliente recibió email
- ✅ Admin (contacto@petgourmet.mx) recibió email

### Prueba 2: Notificación de Pago Próximo

**Método 1: Crear dato de prueba**
```sql
-- En Supabase SQL Editor
UPDATE unified_subscriptions
SET next_billing_date = NOW() + INTERVAL '3 days',
    status = 'active'
WHERE customer_email = 'tu-email-prueba@example.com'
LIMIT 1;
```

**Método 2: Disparar cron manualmente**
```bash
# En PowerShell
$headers = @{
    "Authorization" = "Bearer TU_CRON_SECRET"
}
Invoke-WebRequest -Uri "https://petgourmet.mx/api/cron/upcoming-payments" -Headers $headers
```

**Verificar:**
- ✅ Logs en Vercel muestran emails enviados
- ✅ Cliente recibió recordatorio
- ✅ Admin recibió notificación con detalles

### Prueba 3: Cancelación

```bash
# Cancelar una suscripción en Stripe Dashboard
# O usar CLI:
stripe subscriptions cancel sub_xxxxx
```

**Verificar:**
- ✅ Estado cambió a `cancelled` en BD
- ✅ `cancelled_at` tiene fecha
- ✅ Emails de cancelación enviados

## 📊 Monitoreo Post-Lanzamiento

### Día 1: Verificar Sincronización

```sql
-- Ver últimas actualizaciones
SELECT 
  id,
  customer_name,
  status,
  updated_at
FROM unified_subscriptions
WHERE updated_at > NOW() - INTERVAL '1 day'
ORDER BY updated_at DESC;
```

### Día 2-7: Monitorear Notificaciones

```bash
# Ver logs de cron job
vercel logs --follow | grep "🔔"

# Ver logs de webhooks
vercel logs --follow | grep "💳\|❌\|🔄"
```

### Consulta: Próximos Pagos

```sql
SELECT 
  customer_name,
  customer_email,
  amount,
  next_billing_date,
  EXTRACT(DAY FROM next_billing_date - NOW()) as days_until_payment
FROM unified_subscriptions
WHERE status = 'active'
  AND next_billing_date > NOW()
ORDER BY next_billing_date ASC;
```

## ⚠️ Problemas Comunes

### Error: "Webhook signature verification failed"

**Causa:** `STRIPE_WEBHOOK_SECRET` incorrecto o falta en Vercel

**Solución:**
1. Verificar en Stripe Dashboard → Webhooks → Signing secret
2. Copiar el correcto (empieza con `whsec_`)
3. Actualizar en Vercel → Environment Variables
4. Re-deploy

### Error: "Unauthorized" en cron job

**Causa:** `CRON_SECRET` incorrecto o falta

**Solución:**
1. Generar nuevo secret:
   ```powershell
   $bytes = New-Object byte[] 32
   (New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
   [Convert]::ToBase64String($bytes)
   ```
2. Actualizar en Vercel
3. Re-deploy

### No llegan emails

**Causa:** Credenciales SMTP incorrectas

**Solución:**
1. Probar login SMTP manualmente
2. Si usas Gmail:
   - Habilitar "App Passwords"
   - Usar password de app, no tu password normal
3. Verificar logs: `vercel logs | grep "EMAIL-SERVICE"`

## 📞 Contacto de Emergencia

Si algo no funciona después de implementar:

1. **Revisar logs inmediatamente:**
   ```bash
   vercel logs --follow
   ```

2. **Verificar estado de servicios:**
   - Stripe Status: https://status.stripe.com
   - Vercel Status: https://www.vercel-status.com
   - Supabase Status: https://status.supabase.com

3. **Rollback rápido (si es necesario):**
   ```bash
   # En Vercel Dashboard
   Deployments → [deployment anterior] → "Promote to Production"
   ```

## 🎉 ¡Todo Listo!

Una vez completados todos los pasos:

✅ Sistema sincronizado con Stripe en tiempo real  
✅ Notificaciones automáticas de pagos, cancelaciones, etc.  
✅ Recordatorios proactivos 3 días antes del pago  
✅ Admin siempre informado en contacto@petgourmet.mx  
✅ Logs completos para debugging  

---

**Siguiente paso:** Monitorear durante la primera semana y ajustar si es necesario.

**Documentación completa:** Ver `SISTEMA-SINCRONIZACION-COMPLETO.md`
