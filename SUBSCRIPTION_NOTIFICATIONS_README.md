# 📧 Sistema de Notificaciones de Suscripciones - Resumen Ejecutivo

## ✅ ¿Qué se ha implementado?

Se ha creado un sistema completo para enviar correos electrónicos automáticamente cuando cambia el estado de una suscripción en `unified_subscriptions`.

## 📦 Archivos Creados/Modificados

### Nuevos Archivos:
1. **`supabase/migrations/20250106_subscription_notifications.sql`**
   - Crea tabla `subscription_notifications`
   - Crea trigger automático en `unified_subscriptions`
   - Detecta cambios de estado y registra notificaciones

2. **`app/api/admin/subscription-notifications/route.ts`**
   - Endpoint GET: Ver estadísticas
   - Endpoint POST: Procesar notificaciones pendientes
   - Sistema de reintentos con backoff exponencial

3. **`docs/SUBSCRIPTION_NOTIFICATIONS.md`**
   - Documentación completa del sistema
   - Guías de instalación y uso
   - Troubleshooting

4. **`supabase/test-subscription-notifications.sql`**
   - Scripts de prueba y verificación
   - Consultas de monitoreo
   - Herramientas de debugging

5. **`scripts/apply-subscription-notifications-migration.ps1`**
   - Script PowerShell para aplicar migración
   - Instrucciones paso a paso

### Archivos Modificados:
1. **`lib/email-service.ts`**
   - ✅ Agregada interfaz `SubscriptionStatusChangeData`
   - ✅ Método `sendSubscriptionStatusChangeEmail()` - Email para usuarios
   - ✅ Método `sendAdminSubscriptionStatusChangeEmail()` - Email para admins
   - ✅ Templates HTML personalizados por estado
   - ✅ Sistema de badges y colores por estado

2. **`vercel.json`**
   - ✅ Cron job cada 5 minutos
   - ✅ Timeout de 180 segundos para el endpoint

## 🚀 Pasos para Activar

### 1️⃣ Aplicar Migración SQL

**Opción A - Supabase CLI:**
```powershell
supabase db push
```

**Opción B - Dashboard de Supabase:**
1. Ir a https://app.supabase.com
2. Seleccionar tu proyecto
3. Ir a SQL Editor
4. Copiar contenido de `supabase/migrations/20250106_subscription_notifications.sql`
5. Ejecutar

**Opción C - Script PowerShell:**
```powershell
.\scripts\apply-subscription-notifications-migration.ps1
```

### 2️⃣ Verificar Variables de Entorno

Asegúrate que estas estén configuradas en Vercel/tu entorno:

```env
SMTP_HOST=smtp.tu-servidor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@ejemplo.com
SMTP_PASS=tu-contraseña
EMAIL_FROM="Pet Gourmet <noreply@petgourmet.mx>"
ADMIN_EMAILS=contacto@petgourmet.mx
```

### 3️⃣ Desplegar a Producción

```powershell
git add .
git commit -m "feat: Sistema de notificaciones de suscripciones por email"
git push
```

Vercel automáticamente:
- ✅ Desplegará el código
- ✅ Configurará el cron job
- ✅ Iniciará el procesamiento cada 5 minutos

## 🧪 Probar el Sistema

### Prueba 1: Cambiar Estado Manualmente

En Supabase SQL Editor:

```sql
-- Ver suscripciones disponibles
SELECT id, status, customer_data->>'email' as email 
FROM unified_subscriptions 
LIMIT 5;

-- Cambiar estado (reemplaza 197 con un ID real)
UPDATE unified_subscriptions 
SET status = 'active' 
WHERE id = 197;

-- Verificar que se creó la notificación
SELECT * FROM subscription_notifications 
WHERE subscription_id = 197 
ORDER BY created_at DESC 
LIMIT 1;
```

### Prueba 2: Procesar Notificaciones Manualmente

```powershell
# Local (con npm run dev corriendo)
curl -X POST http://localhost:3000/api/admin/subscription-notifications

# Producción
curl -X POST https://tu-dominio.vercel.app/api/admin/subscription-notifications
```

### Prueba 3: Ver Estadísticas

```powershell
# Local
curl http://localhost:3000/api/admin/subscription-notifications

# Producción
curl https://tu-dominio.vercel.app/api/admin/subscription-notifications
```

## 📊 Monitoreo

### Dashboard de Estadísticas

```sql
-- En Supabase SQL Editor
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN notification_sent THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN NOT notification_sent AND retry_count < 5 THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN NOT notification_sent AND retry_count >= 5 THEN 1 ELSE 0 END) as failed
FROM subscription_notifications;
```

### Ver Notificaciones Pendientes

```sql
SELECT 
  id,
  subscription_id,
  new_status,
  user_email,
  retry_count,
  error_message,
  created_at
FROM subscription_notifications
WHERE notification_sent = false 
  AND retry_count < 5
ORDER BY created_at ASC;
```

### Ver Últimas Notificaciones Enviadas

```sql
SELECT 
  id,
  subscription_id,
  old_status,
  new_status,
  user_email,
  email_sent_at,
  created_at
FROM subscription_notifications
WHERE notification_sent = true
ORDER BY email_sent_at DESC
LIMIT 10;
```

## 🎨 Estados Soportados

| Estado | Email Usuario | Email Admin | Icono |
|--------|---------------|-------------|-------|
| `active` | ✅ Sí | ✅ Sí | ✅ |
| `pending` | ✅ Sí | ✅ Sí | ⏳ |
| `cancelled` | ✅ Sí | ✅ Sí | ❌ |
| `paused` | ✅ Sí | ✅ Sí | ⏸️ |
| `expired` | ✅ Sí | ✅ Sí | ⏰ |
| `suspended` | ✅ Sí | ✅ Sí | 🚫 |

## 🔄 Flujo Automático

```
1. Usuario hace un pago → MercadoPago webhook
2. Sistema actualiza unified_subscriptions.status
3. Trigger SQL detecta el cambio
4. Se crea registro en subscription_notifications
5. Cron job (cada 5 min) procesa notificaciones
6. EmailService envía correos
7. Se marca notification_sent = true
```

## ⚙️ Características

✅ **Automático:** No requiere intervención manual  
✅ **Reintentos:** Hasta 5 intentos con backoff exponencial  
✅ **Logs:** Registro completo de intentos y errores  
✅ **Templates:** HTML responsive con branding  
✅ **Estados:** Soporte para todos los estados de suscripción  
✅ **Admin:** Notificaciones también a administradores  
✅ **Monitoreo:** Estadísticas y queries de análisis  

## 🔧 Mantenimiento

### Limpiar Notificaciones Antiguas (90+ días)

```sql
DELETE FROM subscription_notifications
WHERE notification_sent = true
  AND created_at < NOW() - INTERVAL '90 days';
```

### Reintentar Notificaciones Fallidas

```sql
UPDATE subscription_notifications
SET retry_count = 0, error_message = NULL
WHERE notification_sent = false
  AND retry_count >= 5
  AND created_at > NOW() - INTERVAL '1 day';
```

## 📞 Soporte y Debug

### Ver Logs en Vercel

```powershell
vercel logs --follow
```

### Verificar Configuración SMTP

```powershell
# En desarrollo local
npm run dev
# Hacer POST al endpoint y revisar console
```

### Buscar Errores

```sql
SELECT 
  id,
  subscription_id,
  error_message,
  retry_count,
  created_at
FROM subscription_notifications
WHERE error_message IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;
```

## 📖 Recursos

- **Documentación completa:** `docs/SUBSCRIPTION_NOTIFICATIONS.md`
- **Tests SQL:** `supabase/test-subscription-notifications.sql`
- **Migración:** `supabase/migrations/20250106_subscription_notifications.sql`
- **Código Email Service:** `lib/email-service.ts`
- **API Endpoint:** `app/api/admin/subscription-notifications/route.ts`

## ✨ Ejemplos de Emails

Los correos incluyen:
- 🎨 Branding de Pet Gourmet
- 🖼️ Imagen del producto
- 📋 Detalles de la suscripción
- 📅 Próxima fecha de cobro
- 📧 Información de contacto
- 🔗 Enlaces al sitio web

---

## 🎯 Checklist de Activación

- [ ] Migración SQL aplicada
- [ ] Variables de entorno configuradas
- [ ] Código desplegado a Vercel
- [ ] Cron job verificado en Vercel Dashboard
- [ ] Prueba manual realizada
- [ ] Email de prueba recibido
- [ ] Estadísticas verificadas
- [ ] Sistema monitoreado por 24 horas

---

**¡Sistema listo para producción! 🚀**

Cualquier duda, consulta la documentación completa en `docs/SUBSCRIPTION_NOTIFICATIONS.md`
