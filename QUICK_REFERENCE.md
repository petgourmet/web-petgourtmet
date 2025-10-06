# 🚀 Referencia Rápida - Sistema de Notificaciones

## ✅ Sistema Probado y Funcionando

**Fecha de verificación:** 6 de octubre de 2025  
**Estado:** Completamente operativo  
**Prueba realizada:** Email enviado exitosamente a cristoferscalante@gmail.com

---

## 📋 Comandos Útiles

### Verificar Estadísticas
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/api/admin/subscription-notifications" -Method GET -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

### Procesar Notificaciones Manualmente
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/api/admin/subscription-notifications" -Method POST -UseBasicParsing
```

### Ver Notificaciones en Supabase
```sql
SELECT * FROM subscription_notifications 
ORDER BY created_at DESC 
LIMIT 10;
```

### Ver Notificaciones Pendientes
```sql
SELECT * FROM subscription_notifications 
WHERE notification_sent = false 
AND retry_count < 5
ORDER BY created_at ASC;
```

---

## 🧪 Probar con Diferentes Estados

### Activar Suscripción
```sql
UPDATE unified_subscriptions 
SET status = 'active' 
WHERE id = 199;
```

### Pausar Suscripción
```sql
UPDATE unified_subscriptions 
SET status = 'paused' 
WHERE id = 199;
```

### Cancelar Suscripción
```sql
UPDATE unified_subscriptions 
SET status = 'cancelled' 
WHERE id = 199;
```

Después de cada cambio, procesa manualmente:
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/api/admin/subscription-notifications" -Method POST -UseBasicParsing
```

---

## 🚀 Despliegue a Producción

### Paso 1: Commit
```bash
git add .
git commit -m "feat: Sistema de notificaciones de suscripciones por email"
```

### Paso 2: Push
```bash
git push
```

### Paso 3: Verificar en Vercel
1. Ir a [Vercel Dashboard](https://vercel.com/dashboard)
2. Verificar que el deploy fue exitoso
3. Ir a Settings → Cron Jobs
4. Confirmar que existe el job: `/api/admin/subscription-notifications` (*/5 * * * *)

---

## 📊 Monitoreo en Producción

### Ver Logs de Vercel
```bash
vercel logs --follow
```

### Buscar Logs de Notificaciones
```bash
vercel logs | grep "SUBSCRIPTION-NOTIFICATIONS"
```

### Estadísticas en Producción
```bash
curl https://tu-dominio.vercel.app/api/admin/subscription-notifications
```

---

## 🔧 Configuración SMTP Requerida

Asegúrate que estas variables estén en Vercel:

```env
SMTP_HOST=smtp.ejemplo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@ejemplo.com
SMTP_PASS=tu-contraseña
EMAIL_FROM="Pet Gourmet <noreply@petgourmet.mx>"
ADMIN_EMAILS=contacto@petgourmet.mx
```

---

## 📧 Estados y Emails

| Estado | Email Usuario | Email Admin | Icono |
|--------|---------------|-------------|-------|
| `active` | ✅ Sí | ✅ Sí | ✅ |
| `pending` | ✅ Sí | ✅ Sí | ⏳ |
| `cancelled` | ✅ Sí | ✅ Sí | ❌ |
| `paused` | ✅ Sí | ✅ Sí | ⏸️ |
| `expired` | ✅ Sí | ✅ Sí | ⏰ |
| `suspended` | ✅ Sí | ✅ Sí | 🚫 |

---

## 🐛 Troubleshooting Rápido

### Email no llega
1. Revisar spam/correo no deseado
2. Verificar variables SMTP en Vercel
3. Ver logs: `vercel logs`

### Notificaciones no se procesan
1. Verificar cron job en Vercel Dashboard
2. Procesar manualmente con POST
3. Revisar `retry_count` en base de datos

### Trigger no funciona
1. Verificar que existe: 
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'trigger_log_subscription_status_change';
   ```
2. Verificar permisos de la función

---

## 📖 Documentación Completa

- **Resumen:** `SUBSCRIPTION_NOTIFICATIONS_README.md`
- **Documentación técnica:** `docs/SUBSCRIPTION_NOTIFICATIONS.md`
- **Ejemplos:** `docs/SUBSCRIPTION_NOTIFICATIONS_EXAMPLES.md`
- **Checklist:** `INSTALLATION_CHECKLIST.md`
- **Tests SQL:** `supabase/test-subscription-notifications.sql`

---

## 🎯 Verificación Rápida del Sistema

```sql
-- Ver todas las estadísticas
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN notification_sent THEN 1 ELSE 0 END) as enviados,
  SUM(CASE WHEN NOT notification_sent AND retry_count < 5 THEN 1 ELSE 0 END) as pendientes,
  SUM(CASE WHEN NOT notification_sent AND retry_count >= 5 THEN 1 ELSE 0 END) as fallidos,
  ROUND(100.0 * SUM(CASE WHEN notification_sent THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as tasa_exito
FROM subscription_notifications;
```

**Sistema saludable si:**
- ✅ `tasa_exito` > 95%
- ✅ `fallidos` = 0 o muy bajo
- ✅ `pendientes` procesándose en < 5 minutos

---

## 🔄 Flujo Automático en Producción

```
1. Usuario hace pago → MercadoPago webhook
                      ↓
2. Sistema actualiza unified_subscriptions.status
                      ↓
3. Trigger SQL detecta cambio
                      ↓
4. Crea registro en subscription_notifications
                      ↓
5. Cron job (cada 5 min) ejecuta POST al endpoint
                      ↓
6. EmailService envía correos
                      ↓
7. Marca notification_sent = true
                      ↓
8. ✅ Usuario y admin reciben emails
```

---

## 💡 Tips Pro

1. **Limpieza automática:** Considera crear un cron job para limpiar notificaciones antiguas (>90 días)
2. **Alertas:** Configura alertas si `failed` > 5 o tasa de éxito < 95%
3. **Dashboard:** Crea una página de admin para visualizar estadísticas
4. **Logs:** Mantén logs de los últimos 30 días para debugging

---

**✨ Sistema completamente operativo y listo para producción ✨**

---

_Última actualización: 6 de octubre de 2025_  
_Versión: 1.0.0_  
_Estado: ✅ Verificado y Funcionando_
