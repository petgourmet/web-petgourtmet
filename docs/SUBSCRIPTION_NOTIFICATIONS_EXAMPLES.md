# 🧪 Ejemplos Prácticos - Sistema de Notificaciones

## Escenario 1: Suscripción Activada

### Paso 1: Cambiar Estado
```sql
UPDATE unified_subscriptions 
SET status = 'active' 
WHERE id = 197;
```

### Paso 2: Verificar Notificación Creada
```sql
SELECT * FROM subscription_notifications 
WHERE subscription_id = 197 
ORDER BY created_at DESC 
LIMIT 1;
```

**Resultado esperado:**
```
id: 6
subscription_id: 197
old_status: "pending"
new_status: "active"
user_email: "cristoferscalante@gmail.com"
notification_sent: false
retry_count: 0
```

### Paso 3: Procesar Manualmente
```bash
curl -X POST http://localhost:3000/api/admin/subscription-notifications
```

**Response:**
```json
{
  "success": true,
  "processed": 1,
  "results": {
    "success": 1,
    "failed": 0,
    "errors": []
  }
}
```

### Paso 4: Verificar Email Enviado
```sql
SELECT 
  id,
  notification_sent,
  email_sent_at,
  retry_count
FROM subscription_notifications 
WHERE subscription_id = 197;
```

**Resultado esperado:**
```
notification_sent: true
email_sent_at: "2025-10-06 16:05:30.123456+00"
retry_count: 0
```

---

## Escenario 2: Suscripción Cancelada

### SQL
```sql
UPDATE unified_subscriptions 
SET status = 'cancelled' 
WHERE id = 197;
```

### Email que recibirá el usuario:
- **Subject:** "❌ Tu suscripción ha sido cancelada - Pet Gourmet"
- **Contenido:**
  - Mensaje de cancelación
  - Información de contacto
  - Opción de renovar

---

## Escenario 3: Monitoreo de Notificaciones

### Ver Estadísticas en Tiempo Real
```sql
SELECT 
  new_status,
  COUNT(*) as total,
  SUM(CASE WHEN notification_sent THEN 1 ELSE 0 END) as enviados,
  SUM(CASE WHEN NOT notification_sent THEN 1 ELSE 0 END) as pendientes
FROM subscription_notifications
GROUP BY new_status;
```

**Resultado ejemplo:**
```
new_status | total | enviados | pendientes
-----------|-------|----------|------------
active     | 45    | 43       | 2
cancelled  | 12    | 12       | 0
pending    | 8     | 7        | 1
```

---

## Escenario 4: Debugging - Notificación Falló

### Buscar Errores
```sql
SELECT 
  id,
  subscription_id,
  user_email,
  error_message,
  retry_count,
  created_at
FROM subscription_notifications
WHERE error_message IS NOT NULL
ORDER BY created_at DESC;
```

### Reintentar Manualmente
```sql
-- Resetear contador de reintentos
UPDATE subscription_notifications
SET retry_count = 0, error_message = NULL
WHERE id = 6;
```

### Procesar de Nuevo
```bash
curl -X POST http://localhost:3000/api/admin/subscription-notifications
```

---

## Escenario 5: Prueba de Carga

### Crear Múltiples Notificaciones
```sql
-- Cambiar varias suscripciones
UPDATE unified_subscriptions 
SET status = 'active' 
WHERE status = 'pending' 
LIMIT 10;
```

### Ver Cuántas se Crearon
```sql
SELECT COUNT(*) 
FROM subscription_notifications 
WHERE notification_sent = false;
```

### Procesar en Batch
```bash
curl -X POST http://localhost:3000/api/admin/subscription-notifications
```

**El sistema procesa hasta 20 notificaciones por llamada**

---

## Escenario 6: Ver Últimas Actividades

### Query de Dashboard
```sql
SELECT 
  n.id,
  n.subscription_id,
  n.new_status,
  n.user_email,
  n.notification_sent,
  n.created_at,
  n.email_sent_at,
  s.product_name,
  s.subscription_type
FROM subscription_notifications n
LEFT JOIN unified_subscriptions s ON s.id = n.subscription_id
ORDER BY n.created_at DESC
LIMIT 20;
```

---

## Escenario 7: API Testing con Postman/Insomnia

### GET - Obtener Estadísticas
```http
GET /api/admin/subscription-notifications HTTP/1.1
Host: localhost:3000
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
      "user_email": "cristoferscalante@gmail.com",
      "notification_sent": true,
      "retry_count": 0,
      "created_at": "2025-10-06T16:04:37.316511Z",
      "email_sent_at": "2025-10-06T16:05:00.123456Z"
    }
  ]
}
```

### POST - Procesar Notificaciones
```http
POST /api/admin/subscription-notifications HTTP/1.1
Host: localhost:3000
Content-Type: application/json
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
        "error": "SMTP connection timeout"
      }
    ]
  }
}
```

---

## Escenario 8: Logs en Desarrollo

### Ejecutar Servidor Local
```bash
npm run dev
```

### Ver Logs en Consola
```
[SUBSCRIPTION-NOTIFICATIONS] Iniciando procesamiento de notificaciones pendientes...
[SUBSCRIPTION-NOTIFICATIONS] Encontradas 3 notificaciones pendientes
[SUBSCRIPTION-NOTIFICATIONS] Procesando notificación #6 para suscripción #197
[SUBSCRIPTION-NOTIFICATIONS] Datos de email preparados: {
  notification_id: 6,
  subscription_id: 197,
  user_email: 'cristoferscalante@gmail.com',
  new_status: 'active'
}
[EMAIL-SERVICE] Iniciando envío de correo a cristoferscalante@gmail.com
[EMAIL-SERVICE] Intento 1/3 - Enviando correo a cristoferscalante@gmail.com
[EMAIL-SERVICE] ✅ Correo enviado exitosamente a cristoferscalante@gmail.com
[SUBSCRIPTION-NOTIFICATIONS] ✅ Email enviado al usuario
[SUBSCRIPTION-NOTIFICATIONS] ✅ Email enviado a admin
[SUBSCRIPTION-NOTIFICATIONS] ✅ Notificación #6 marcada como enviada
[SUBSCRIPTION-NOTIFICATIONS] Procesamiento completado
```

---

## Escenario 9: Verificación de Trigger

### Test del Trigger
```sql
DO $$
DECLARE
  test_sub_id INTEGER;
BEGIN
  -- Obtener una suscripción
  SELECT id INTO test_sub_id 
  FROM unified_subscriptions 
  LIMIT 1;
  
  -- Cambiar estado
  UPDATE unified_subscriptions 
  SET status = 'active' 
  WHERE id = test_sub_id;
  
  -- Verificar notificación
  IF EXISTS(
    SELECT 1 FROM subscription_notifications 
    WHERE subscription_id = test_sub_id 
    AND new_status = 'active'
  ) THEN
    RAISE NOTICE '✅ Trigger funciona correctamente';
  ELSE
    RAISE NOTICE '❌ Trigger no funcionó';
  END IF;
END $$;
```

---

## Escenario 10: Limpieza de Datos Antiguos

### Ver Notificaciones Antiguas
```sql
SELECT 
  COUNT(*) as total,
  MIN(created_at) as mas_antigua,
  MAX(created_at) as mas_reciente
FROM subscription_notifications
WHERE notification_sent = true
  AND created_at < NOW() - INTERVAL '90 days';
```

### Limpiar (después de confirmar)
```sql
DELETE FROM subscription_notifications
WHERE notification_sent = true
  AND created_at < NOW() - INTERVAL '90 days'
RETURNING id;
```

---

## 📊 Queries Útiles para Dashboard

### Tasa de Éxito Diaria
```sql
SELECT 
  DATE(created_at) as fecha,
  COUNT(*) as total,
  SUM(CASE WHEN notification_sent THEN 1 ELSE 0 END) as exitosos,
  ROUND(100.0 * SUM(CASE WHEN notification_sent THEN 1 ELSE 0 END) / COUNT(*), 2) as porcentaje_exito
FROM subscription_notifications
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY fecha DESC;
```

### Estados Más Comunes
```sql
SELECT 
  new_status,
  COUNT(*) as cantidad,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM subscription_notifications), 2) as porcentaje
FROM subscription_notifications
GROUP BY new_status
ORDER BY cantidad DESC;
```

### Tiempos de Procesamiento
```sql
SELECT 
  id,
  subscription_id,
  EXTRACT(EPOCH FROM (email_sent_at - created_at)) as segundos_procesamiento,
  retry_count
FROM subscription_notifications
WHERE notification_sent = true
  AND email_sent_at IS NOT NULL
ORDER BY email_sent_at DESC
LIMIT 20;
```

---

## 🔔 Alertas Recomendadas

### Notificaciones Pendientes > 10 minutos
```sql
SELECT COUNT(*)
FROM subscription_notifications
WHERE notification_sent = false
  AND retry_count < 5
  AND created_at < NOW() - INTERVAL '10 minutes';
```

### Tasa de Fallos > 5%
```sql
SELECT 
  ROUND(100.0 * 
    COUNT(CASE WHEN NOT notification_sent AND retry_count >= 5 THEN 1 END) / 
    COUNT(*), 2
  ) as tasa_fallos
FROM subscription_notifications
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

---

**💡 Tip:** Guarda estos queries en tu herramienta de SQL favorita para acceso rápido.
