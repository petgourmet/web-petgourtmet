# Sistema de Notificaciones por Email para Cambios de Estado de Suscripciones

## 📋 Descripción

Este sistema envía automáticamente correos electrónicos a los usuarios cuando el estado de su suscripción cambia en la tabla `unified_subscriptions`. También envía notificaciones a los administradores.

## 🏗️ Arquitectura

### Componentes

1. **Trigger SQL en Supabase** (`subscription_notifications`)
   - Detecta cambios de estado en `unified_subscriptions`
   - Crea registros en la tabla `subscription_notifications`
   
2. **API Endpoint** (`/api/admin/subscription-notifications`)
   - Procesa notificaciones pendientes
   - Envía emails usando el servicio SMTP configurado
   - Maneja reintentos automáticos

3. **Email Service** (`lib/email-service.ts`)
   - Templates HTML para diferentes estados
   - Envío a usuarios y administradores
   - Sistema de reintentos con backoff exponencial

4. **Cron Job** (Vercel Crons)
   - Se ejecuta cada 5 minutos
   - Procesa automáticamente notificaciones pendientes

## 📊 Base de Datos

### Tabla: `subscription_notifications`

```sql
CREATE TABLE subscription_notifications (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT NOT NULL REFERENCES unified_subscriptions(id),
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  admin_email VARCHAR(255) DEFAULT 'contacto@petgourmet.mx',
  notification_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Flujo de Datos

```
unified_subscriptions (UPDATE status)
    ↓
[TRIGGER] log_subscription_status_change()
    ↓
subscription_notifications (INSERT)
    ↓
[CRON JOB] Cada 5 minutos
    ↓
/api/admin/subscription-notifications (POST)
    ↓
Email Service
    ↓
Usuario + Administradores
```

## 🚀 Instalación y Configuración

### 1. Aplicar Migración SQL

**Opción A: Supabase CLI**
```bash
supabase db push
```

**Opción B: SQL Editor**
1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Abre SQL Editor
3. Copia el contenido de `supabase/migrations/20250106_subscription_notifications.sql`
4. Ejecuta el SQL

**Opción C: PowerShell Script**
```powershell
.\scripts\apply-subscription-notifications-migration.ps1
```

### 2. Verificar Configuración SMTP

Asegúrate de que estas variables de entorno estén configuradas:

```env
SMTP_HOST=smtp.ejemplo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@ejemplo.com
SMTP_PASS=tu-contraseña
EMAIL_FROM="Pet Gourmet <noreply@petgourmet.mx>"
ADMIN_EMAILS=contacto@petgourmet.mx,admin@petgourmet.mx
```

### 3. Configurar Cron Job

El cron job ya está configurado en `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/admin/subscription-notifications",
    "schedule": "*/5 * * * *"
  }]
}
```

Esto ejecuta el procesamiento cada 5 minutos.

### 4. Desplegar

```bash
git add .
git commit -m "feat: Sistema de notificaciones de suscripciones"
git push
```

Vercel automáticamente configurará el cron job.

## 📧 Estados de Suscripción Soportados

El sistema envía correos personalizados para estos estados:

| Estado | Icono | Color | Descripción |
|--------|-------|-------|-------------|
| `active` | ✅ | Verde | Suscripción activada |
| `pending` | ⏳ | Amarillo | Esperando confirmación |
| `cancelled` | ❌ | Rojo | Suscripción cancelada |
| `paused` | ⏸️ | Azul | Temporalmente pausada |
| `expired` | ⏰ | Rojo oscuro | Ha expirado |
| `suspended` | 🚫 | Rojo oscuro | Suspendida por admin |

## 🔌 API Endpoints

### POST `/api/admin/subscription-notifications`

Procesa notificaciones pendientes y envía emails.

**Request:**
```bash
curl -X POST https://tu-dominio.com/api/admin/subscription-notifications
```

**Response:**
```json
{
  "success": true,
  "message": "Procesamiento completado",
  "processed": 5,
  "results": {
    "success": 4,
    "failed": 1,
    "errors": [
      {
        "notification_id": 123,
        "subscription_id": 456,
        "error": "SMTP connection failed"
      }
    ]
  }
}
```

### GET `/api/admin/subscription-notifications`

Obtiene estadísticas y últimas notificaciones.

**Request:**
```bash
curl https://tu-dominio.com/api/admin/subscription-notifications
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 150,
    "pending": 3,
    "sent": 145,
    "failed": 2
  },
  "recent": [
    {
      "id": 150,
      "subscription_id": 197,
      "new_status": "active",
      "user_email": "cliente@ejemplo.com",
      "notification_sent": true,
      "retry_count": 0,
      "created_at": "2025-10-06T16:04:37.316511Z",
      "email_sent_at": "2025-10-06T16:05:00.123456Z"
    }
  ]
}
```

## 🧪 Pruebas

### Prueba Manual

1. **Cambiar estado de una suscripción:**
```sql
UPDATE unified_subscriptions 
SET status = 'active' 
WHERE id = 197;
```

2. **Verificar que se creó la notificación:**
```sql
SELECT * FROM subscription_notifications 
WHERE subscription_id = 197 
ORDER BY created_at DESC 
LIMIT 1;
```

3. **Procesar manualmente (sin esperar cron):**
```bash
curl -X POST http://localhost:3000/api/admin/subscription-notifications
```

4. **Verificar en la base de datos:**
```sql
SELECT * FROM subscription_notifications 
WHERE subscription_id = 197 
AND notification_sent = true;
```

### Ver Logs

En producción (Vercel):
```bash
vercel logs
```

En desarrollo local:
```bash
npm run dev
# Luego hacer POST al endpoint
```

## 🔄 Sistema de Reintentos

- **Máximo de reintentos:** 5
- **Backoff exponencial:** 2s, 4s, 8s, 16s, 32s
- **Notificaciones fallidas:** Se marcan con `notification_sent = false` y `retry_count >= 5`

## 🎨 Templates de Email

### Para Usuarios

Los correos incluyen:
- Logo y branding de Pet Gourmet
- Estado actual con color e icono
- Información de la suscripción
- Imagen del producto (si disponible)
- Próxima fecha de cobro (para suscripciones activas)
- Información de contacto

### Para Administradores

Los correos incluyen:
- Información del cliente
- ID de suscripción
- Cambio de estado (anterior → nuevo)
- Tipo de suscripción
- Enlace directo al panel de admin

## 📝 Logging

El sistema registra detalladamente:

```
[SUBSCRIPTION-NOTIFICATIONS] Iniciando procesamiento...
[SUBSCRIPTION-NOTIFICATIONS] Encontradas 3 notificaciones pendientes
[SUBSCRIPTION-NOTIFICATIONS] Procesando notificación #6 para suscripción #197
[SUBSCRIPTION-NOTIFICATIONS] ✅ Email enviado al usuario
[SUBSCRIPTION-NOTIFICATIONS] ✅ Email enviado a admin
[SUBSCRIPTION-NOTIFICATIONS] ✅ Notificación #6 marcada como enviada
[SUBSCRIPTION-NOTIFICATIONS] Procesamiento completado
```

## 🐛 Troubleshooting

### Las notificaciones no se envían

1. **Verificar SMTP:**
```bash
# En el proyecto
npm run dev
# Luego probar endpoint manualmente
```

2. **Ver notificaciones pendientes:**
```sql
SELECT * FROM subscription_notifications 
WHERE notification_sent = false 
AND retry_count < 5;
```

3. **Ver errores:**
```sql
SELECT id, subscription_id, error_message, retry_count 
FROM subscription_notifications 
WHERE notification_sent = false 
ORDER BY updated_at DESC;
```

### El trigger no se activa

1. **Verificar que el trigger existe:**
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_log_subscription_status_change';
```

2. **Probar manualmente el trigger:**
```sql
-- Cambiar estado
UPDATE unified_subscriptions SET status = 'active' WHERE id = 197;

-- Verificar creación
SELECT * FROM subscription_notifications WHERE subscription_id = 197 ORDER BY created_at DESC LIMIT 1;
```

### Emails no llegan

1. Verificar configuración SMTP en variables de entorno
2. Revisar logs de Vercel o consola local
3. Verificar que el email no esté en spam
4. Comprobar límites de envío del servidor SMTP

## 🔒 Seguridad

- El endpoint está en `/api/admin/` pero puede ser llamado por el cron job
- Para producción, considera agregar autenticación si lo expones públicamente
- Los emails no contienen información sensible de pago

## 📈 Monitoreo

Consulta SQL para monitoreo:

```sql
-- Resumen de notificaciones
SELECT 
  new_status,
  COUNT(*) as total,
  SUM(CASE WHEN notification_sent THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN NOT notification_sent AND retry_count < 5 THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN NOT notification_sent AND retry_count >= 5 THEN 1 ELSE 0 END) as failed
FROM subscription_notifications
GROUP BY new_status
ORDER BY total DESC;
```

## 🤝 Contribución

Para agregar nuevos templates de email o estados:

1. Agregar estado en `getStatusInfo()` en `email-service.ts`
2. Agregar badge en `getStatusBadge()` 
3. Probar con cambio manual de estado

## 📞 Soporte

Para problemas o preguntas:
- Email: contacto@petgourmet.mx
- Revisar logs en Vercel Dashboard
- Consultar tabla `subscription_notifications`

---

**Versión:** 1.0.0  
**Fecha:** Octubre 6, 2025  
**Autor:** Pet Gourmet Development Team
