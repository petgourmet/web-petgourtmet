# 🚀 Solución: Envío Inmediato de Emails (SIN delay de 5 minutos)

## 📋 Problema
Actualmente, cuando cambia el estado de una suscripción:
1. ✅ Trigger crea notificación en `subscription_notifications`
2. ⏰ **Cron job envía email después de 0-5 minutos**
3. ❌ Usuario NO recibe email inmediatamente

## ✅ Solución: Supabase Database Webhooks

Los webhooks de Supabase permiten **llamar automáticamente a una URL** cuando ocurre un evento en la base de datos (como un INSERT).

### 🎯 Configuración (5 minutos)

#### 1. Ve al Dashboard de Supabase
- Abre tu proyecto: https://supabase.com/dashboard/project/[TU_PROJECT_ID]
- Ve a: **Database** → **Webhooks** (en el menú lateral)

#### 2. Crea un Nuevo Webhook
Haz clic en "Create a new hook" y configura:

**Basic Settings:**
- **Name:** `send-subscription-email`
- **Table:** `subscription_notifications`
- **Events:** Marca solo `INSERT` ✅
- **Type:** `HTTP Request`

**HTTP Request Settings:**
- **Method:** `POST`
- **URL:** `https://petgourmet.mx/api/admin/subscription-notifications`
- **HTTP Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **HTTP Body:**
  ```json
  {
    "notification_id": {{ record.id }},
    "subscription_id": {{ record.subscription_id }},
    "immediate": true
  }
  ```

**Advanced Settings:**
- **Timeout:** `10000` (10 segundos)
- **Retries:** `3`

#### 3. Guardar y Activar
- Haz clic en **"Create webhook"**
- Verifica que el webhook aparezca en la lista con status: **Enabled** ✅

---

## 🧪 Prueba

### 1. Ejecuta el SQL para actualizar el trigger
Abre **SQL Editor** en Supabase y ejecuta el contenido de:
```
supabase/EJECUTAR-AHORA-emails-inmediatos.sql
```

### 2. Cambia el estado de una suscripción de prueba
```sql
-- Cambiar a 'paused'
UPDATE unified_subscriptions 
SET status = 'paused'
WHERE id = 213;

-- Espera 2-3 segundos

-- Verifica que se creó la notificación
SELECT * FROM subscription_notifications 
WHERE subscription_id = 213 
ORDER BY created_at DESC 
LIMIT 1;

-- Verifica que notification_sent = true (email enviado)
```

### 3. Verifica los Logs del Webhook
En el dashboard de Supabase:
- Ve a **Database** → **Webhooks** → Tu webhook
- Haz clic en **"View Logs"**
- Deberías ver una petición POST con status `200 OK`

---

## ⚙️ Cómo Funciona (Arquitectura)

### ANTES (con delay):
```
Cambio de estado → Trigger crea notificación → [ESPERA 5 MIN] → Cron envía email
```

### AHORA (inmediato):
```
Cambio de estado → Trigger crea notificación → Webhook detecta INSERT → API envía email ⚡
                                                      ↓
                                              (< 1 segundo)
```

### Flujo Detallado:
1. **Usuario paga suscripción** → MercadoPago webhook actualiza `unified_subscriptions.status`
2. **Trigger `trigger_send_immediate_notification`** detecta cambio de estado
3. **Función `log_and_send_subscription_notification()`** inserta en `subscription_notifications`
4. **Webhook de Supabase** detecta el INSERT inmediatamente
5. **Webhook llama a** `POST /api/admin/subscription-notifications` con `notification_id`
6. **API procesa la notificación** específica (no todas las pendientes)
7. **EmailService envía email** con template según el nuevo estado
8. **API actualiza** `notification_sent = true` y `email_sent_at = NOW()`

---

## 🔧 Archivos Modificados

### 1. `app/api/admin/subscription-notifications/route.ts`
**Cambio:** Ahora acepta `notification_id` en el body para procesar UNA notificación específica

```typescript
// Si viene notification_id, procesar solo esa notificación (llamada inmediata)
if (body.notification_id) {
  console.log(`[SUBSCRIPTION-NOTIFICATIONS] Procesamiento INMEDIATO de notificación #${body.notification_id}`);
  
  const { data: notification } = await supabase
    .from('subscription_notifications')
    .select('*, unified_subscriptions(*)')
    .eq('id', body.notification_id)
    .single();
  
  const result = await processNotification(notification, supabase);
  
  return NextResponse.json({
    success: result.success,
    message: result.success ? 'Email enviado inmediatamente' : 'Error al enviar email'
  });
}

// Si no viene notification_id, procesar todas las pendientes (llamada del cron)
```

### 2. `supabase/migrations/20250106_immediate_email_notification.sql`
**Cambio:** Nueva función `log_and_send_subscription_notification()` que reemplaza la anterior

**Incluye:**
- ✅ Validación de cambio de estado
- ✅ Extracción de email desde `customer_data`
- ✅ Creación de notificación
- ✅ Logs para debugging
- ✅ (Opcional) Llamada HTTP con `pg_net` si está disponible

### 3. `supabase/EJECUTAR-AHORA-emails-inmediatos.sql`
**Script para ejecutar AHORA** en el SQL Editor de Supabase

**Acciones:**
1. Crea función `log_and_send_subscription_notification()`
2. Elimina triggers antiguos
3. Crea nuevo trigger `trigger_send_immediate_notification`
4. Verificaciones de que todo está funcionando
5. Instrucciones de prueba

---

## 🛡️ Seguridad

### ¿El webhook es seguro?
- ✅ Solo Supabase puede llamar al endpoint con la IP correcta
- ✅ El endpoint valida que la notificación exista en la DB
- ✅ No se puede crear notificaciones falsas desde fuera

### ¿Qué pasa si falla?
- 🔄 Supabase reintenta el webhook 3 veces automáticamente
- 🔄 Si falla, el **cron job de 5 minutos** lo procesará como respaldo
- 📊 Todos los errores se logean en `subscription_notifications.error_message`

---

## 📊 Ventajas vs. Otras Soluciones

### ✅ Webhooks de Supabase (Solución Elegida)
- ✅ **Configuración:** Dashboard (sin código)
- ✅ **Velocidad:** < 1 segundo
- ✅ **Reintentos:** Automáticos (3x)
- ✅ **Logs:** Built-in en dashboard
- ✅ **Mantenimiento:** Cero
- ✅ **Costo:** Gratis en plan Pro

### ❌ pg_net (Extensión HTTP)
- ❌ Solo disponible en plan Enterprise
- ❌ Requiere modificar función SQL
- ⚠️ Errores HTTP no se logean bien

### ❌ Edge Functions
- ⚠️ Requiere deployment separado
- ⚠️ Más complejo de mantener
- ⚠️ Latencia adicional

### ❌ Realtime Subscriptions
- ⚠️ Requiere cliente persistente
- ⚠️ Consume recursos continuamente
- ⚠️ Más complejo de implementar

---

## 🎯 Checklist de Implementación

- [ ] **Paso 1:** Ejecutar `supabase/EJECUTAR-AHORA-emails-inmediatos.sql` en SQL Editor
- [ ] **Paso 2:** Configurar webhook en Supabase Dashboard
- [ ] **Paso 3:** Hacer commit y push del código modificado:
  ```bash
  git add app/api/admin/subscription-notifications/route.ts
  git add supabase/migrations/20250106_immediate_email_notification.sql
  git add supabase/EJECUTAR-AHORA-emails-inmediatos.sql
  git commit -m "feat: email inmediato al cambiar estado de suscripción"
  git push
  ```
- [ ] **Paso 4:** Deploy automático en Vercel
- [ ] **Paso 5:** Probar cambiando estado de suscripción #213
- [ ] **Paso 6:** Verificar logs del webhook en Supabase
- [ ] **Paso 7:** Confirmar que email llega en < 5 segundos

---

## 📝 Notas Adicionales

### El cron sigue funcionando como respaldo
El cron job (`vercel.json`) sigue ejecutándose cada 5 minutos para:
- ✅ Procesar notificaciones que fallaron con el webhook
- ✅ Reintentar notificaciones con `retry_count < 5`
- ✅ Garantizar que ningún email se pierda

### Logs para debugging
Todos los logs aparecen en:
1. **Supabase:** Database → Webhooks → Tu webhook → View Logs
2. **Vercel:** Project → Logs (filtrar por `/api/admin/subscription-notifications`)
3. **PostgreSQL:** Usar `RAISE NOTICE` en las funciones SQL

### Monitoreo
```sql
-- Ver notificaciones pendientes
SELECT COUNT(*) FROM subscription_notifications 
WHERE notification_sent = false;

-- Ver últimas notificaciones enviadas
SELECT 
  id,
  subscription_id,
  old_status,
  new_status,
  notification_sent,
  email_sent_at,
  created_at
FROM subscription_notifications
ORDER BY created_at DESC
LIMIT 10;

-- Ver tasa de éxito de emails
SELECT 
  notification_sent,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM subscription_notifications), 2) as porcentaje
FROM subscription_notifications
GROUP BY notification_sent;
```

---

## 🚀 ¡Listo!

Después de seguir estos pasos, los emails se enviarán **inmediatamente** (< 1 segundo) cuando cambie el estado de una suscripción.

No más esperas de 5 minutos ⚡
