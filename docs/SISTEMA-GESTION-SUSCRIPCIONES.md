# 🔄 Sistema Completo de Gestión de Suscripciones

## ✅ Implementación Completada

Se ha implementado un sistema completo para gestionar suscripciones con las siguientes características:

### 📋 Características Implementadas

1. **✅ Pausar Suscripciones**
   - Los usuarios pueden pausar temporalmente su suscripción
   - No se realizan cobros mientras está pausada
   - Se puede reactivar en cualquier momento

2. **✅ Cancelar Suscripciones**
   - Los usuarios pueden cancelar definitivamente su suscripción
   - Confirmación obligatoria antes de cancelar
   - No se puede revertir la cancelación

3. **✅ Reanudar Suscripciones**
   - Las suscripciones pausadas se pueden reactivar
   - Se recalcula automáticamente la próxima fecha de pago
   - Se notifica por email al cliente y admin

4. **✅ Historial de Pagos**
   - Cada pago se registra en `subscription_payments`
   - Se guardan pagos exitosos y fallidos
   - Incluye período cubierto, monto, estado, IDs de Stripe

5. **✅ Actualización Automática de Fechas**
   - `next_billing_date` se actualiza con cada pago
   - `last_billing_date` registra el último cobro
   - `current_period_start` y `current_period_end` se sincronizan con Stripe

6. **✅ Notificaciones por Email**
   - **Cliente**: Recibe emails de todos los eventos
   - **Admin (contacto@petgourmet.mx)**: Recibe copia de todas las notificaciones
   - **Tipos de email**:
     - Suscripción creada
     - Pago exitoso
     - Pago fallido
     - Suscripción pausada
     - Suscripción reactivada
     - Suscripción cancelada

---

## 📁 Archivos Creados/Modificados

### **Nuevas APIs**

#### 1. **`app/api/subscriptions/pause/route.ts`**
```typescript
POST /api/subscriptions/pause
Body: { subscriptionId: number }
```
- Pausa la suscripción en Stripe
- Actualiza estado a `paused` en la DB
- Envía emails al cliente y admin

#### 2. **`app/api/subscriptions/cancel/route.ts`**
```typescript
POST /api/subscriptions/cancel
Body: { subscriptionId: number, cancelAtPeriodEnd?: boolean }
```
- Cancela la suscripción en Stripe
- Actualiza estado a `canceled` en la DB
- Envía emails al cliente y admin

#### 3. **`app/api/subscriptions/resume/route.ts`**
```typescript
POST /api/subscriptions/resume
Body: { subscriptionId: number }
```
- Reactiva la suscripción en Stripe
- Actualiza estado a `active` en la DB
- Recalcula `next_billing_date`
- Envía emails al cliente y admin

### **Migraciones de Base de Datos**

#### 4. **`supabase/migrations/create_subscription_payments_table.sql`**
Crea la tabla `subscription_payments` con:
- Campos: `id`, `subscription_id`, `user_id`, `amount`, `currency`, `status`, `payment_date`
- IDs de Stripe: `stripe_invoice_id`, `stripe_payment_intent_id`, `stripe_charge_id`
- Período: `period_start`, `period_end`
- Errores: `failure_message`, `failure_code`
- Metadatos: `metadata`, `created_at`, `updated_at`

#### 5. **`supabase/migrations/add_paused_at_column.sql`**
Agrega columna `paused_at` a `unified_subscriptions`

### **Actualizaciones de Código**

#### 6. **`app/api/stripe/webhook/route.ts`**

**Función `handleInvoicePaymentSucceeded` mejorada:**
```typescript
- Obtiene suscripción de Stripe para sincronizar fechas
- Actualiza `next_billing_date`, `last_billing_date`, `current_period_start`, `current_period_end`
- Registra el pago en `subscription_payments`
- Envía email de pago exitoso al cliente
- Envía email de pago exitoso al admin (contacto@petgourmet.mx)
```

**Función `handleInvoicePaymentFailed` mejorada:**
```typescript
- Marca suscripción como `past_due`
- Registra el intento fallido en `subscription_payments`
- Envía email de error de pago al cliente
- Envía email de error de pago al admin
```

#### 7. **`lib/email-service.ts`**

**Nuevos tipos de email agregados:**
```typescript
type EmailType = 
  | 'created'
  | 'payment'
  | 'cancelled'
  | 'paused'        // ✨ NUEVO
  | 'resumed'       // ✨ NUEVO
  | 'payment_failed' // ✨ NUEVO
```

**Plantillas de email creadas:**
- ⏸️ **Pausada**: Notifica que no se harán cobros
- ▶️ **Reactivada**: Confirma reactivación con próxima fecha de pago
- ⚠️ **Pago Fallido**: Solicita actualizar método de pago

#### 8. **`app/perfil/page.tsx`**

**Nuevos handlers agregados:**
```typescript
- handlePauseSubscription(subscriptionId)
- handleResumeSubscription(subscriptionId)
- handleCancelSubscription(subscriptionId)
```

**UI de gestión de suscripciones:**
```tsx
// Para suscripciones ACTIVAS:
- Botón "Pausar Suscripción"
- Botón "Cancelar Suscripción"

// Para suscripciones PAUSADAS:
- Botón "Reanudar Suscripción" (verde)
- Botón "Cancelar Suscripción"

// Para suscripciones CANCELADAS:
- Mensaje "Esta suscripción ha sido cancelada"

// Para suscripciones PAST_DUE (con problemas de pago):
- Alerta roja explicando el problema
- Botón "Actualizar Método de Pago"
- Botón "Cancelar Suscripción"
```

---

## 🔄 Flujo de Eventos

### **Pago Exitoso (Renovación)**

```
1. Stripe dispara: invoice.payment_succeeded
2. Webhook:
   - Obtiene subscription de Stripe
   - Actualiza fechas en unified_subscriptions
   - Registra pago en subscription_payments (status: succeeded)
   - Envía email al cliente con detalles del pago
   - Envía email al admin (contacto@petgourmet.mx)
3. Cliente ve actualización en /perfil
```

### **Pago Fallido**

```
1. Stripe dispara: invoice.payment_failed
2. Webhook:
   - Marca suscripción como past_due
   - Registra pago fallido en subscription_payments
   - Envía email al cliente solicitando actualizar pago
   - Envía email al admin notificando el problema
3. Cliente ve alerta en /perfil con opción de actualizar pago
```

### **Pausar Suscripción**

```
1. Usuario hace clic en "Pausar Suscripción"
2. Frontend llama a POST /api/subscriptions/pause
3. API:
   - Pausa en Stripe (pause_collection: { behavior: 'void' })
   - Actualiza estado a 'paused' en DB
   - Envía email al cliente confirmando pausa
   - Envía email al admin
4. UI se actualiza mostrando "⏸️ Pausada"
```

### **Reanudar Suscripción**

```
1. Usuario hace clic en "Reanudar Suscripción"
2. Frontend llama a POST /api/subscriptions/resume
3. API:
   - Quita pausa en Stripe (pause_collection: null)
   - Actualiza estado a 'active' en DB
   - Recalcula next_billing_date
   - Envía email al cliente con próxima fecha de pago
   - Envía email al admin
4. UI se actualiza mostrando "✅ Activa"
```

### **Cancelar Suscripción**

```
1. Usuario hace clic en "Cancelar Suscripción"
2. Confirmación: "¿Estás seguro...?"
3. Frontend llama a POST /api/subscriptions/cancel
4. API:
   - Cancela en Stripe (stripe.subscriptions.cancel)
   - Actualiza estado a 'canceled' en DB
   - Envía email al cliente confirmando cancelación
   - Envía email al admin
5. UI se actualiza mostrando "❌ Cancelada"
```

---

## 📧 Emails de Notificación

Todos los emails se envían a:
- ✅ **Cliente**: Email del usuario
- ✅ **Admin**: `contacto@petgourmet.mx`

### **Plantilla de Email de Pago Exitoso:**

```
Asunto: 💳 Pago de suscripción procesado - Pet Gourmet

Hola [Nombre],

Tu pago de suscripción ha sido procesado exitosamente.

Detalles:
- Tipo: Suscripción [Mensual/Trimestral/etc]
- Monto: $XXX.XX MXN
- Próximo cobro: [Fecha]

Tu próximo envío está en camino.
```

### **Plantilla de Email de Pago Fallido:**

```
Asunto: ⚠️ Error en el pago de tu suscripción - Pet Gourmet

Hola [Nombre],

No pudimos procesar el pago de tu suscripción.

Por favor, actualiza tu método de pago para continuar:
[Botón: Actualizar Método de Pago]

Detalles:
- Monto pendiente: $XXX.XX MXN
- Suscripción: [Producto]
```

### **Plantilla de Email de Suscripción Pausada:**

```
Asunto: ⏸️ Suscripción pausada - Pet Gourmet

Hola [Nombre],

Tu suscripción ha sido pausada temporalmente.

No se realizarán cobros hasta que la reactives.
Puedes reactivarla en cualquier momento desde tu perfil.

[Botón: Ver Mi Suscripción]
```

### **Plantilla de Email de Suscripción Reactivada:**

```
Asunto: ▶️ Suscripción reactivada - Pet Gourmet

Hola [Nombre],

Tu suscripción ha sido reactivada exitosamente.

Detalles:
- Próximo cobro: [Fecha]
- Monto: $XXX.XX MXN

Los envíos se reanudarán según el calendario.
```

---

## 🗄️ Estructura de Base de Datos

### **Tabla `subscription_payments`**

```sql
CREATE TABLE subscription_payments (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT NOT NULL, -- FK a unified_subscriptions
  user_id UUID, -- FK a auth.users
  
  -- Información del pago
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MXN',
  status VARCHAR(50) NOT NULL, -- succeeded, failed, pending, refunded
  payment_date TIMESTAMPTZ NOT NULL,
  
  -- IDs de Stripe
  stripe_invoice_id VARCHAR(255) UNIQUE,
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  
  -- Período cubierto
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  
  -- Errores
  failure_message TEXT,
  failure_code VARCHAR(100),
  
  -- Metadatos
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Columnas Nuevas en `unified_subscriptions`**

```sql
ALTER TABLE unified_subscriptions
ADD COLUMN paused_at TIMESTAMPTZ;
```

---

## 🧪 Cómo Probar

### 1. **Ejecutar Migraciones SQL**

En Supabase Dashboard → SQL Editor:

```sql
-- 1. Crear tabla subscription_payments
-- (Copia el contenido de create_subscription_payments_table.sql)

-- 2. Agregar columna paused_at
ALTER TABLE unified_subscriptions
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
```

### 2. **Crear una Suscripción de Prueba**

1. Ve a `/productos`
2. Selecciona "Repetir compra" en un producto
3. Completa el checkout
4. Verifica que llegue email de "Suscripción Activada"

### 3. **Probar Pausar Suscripción**

1. Ve a `/perfil` → Suscripciones
2. Click en "Pausar Suscripción"
3. Verifica:
   - Estado cambia a "⏸️ Pausada"
   - Recibes email de confirmación
   - Admin recibe copia del email

### 4. **Probar Reanudar Suscripción**

1. Con una suscripción pausada
2. Click en "Reanudar Suscripción"
3. Verifica:
   - Estado cambia a "✅ Activa"
   - Se muestra próxima fecha de pago
   - Recibes email con fecha de próximo cobro

### 5. **Probar Cancelar Suscripción**

1. Click en "Cancelar Suscripción"
2. Confirmar en el diálogo
3. Verifica:
   - Estado cambia a "❌ Cancelada"
   - Recibes email de confirmación
   - Ya no aparecen botones de acción

### 6. **Probar Renovación de Pago**

Con Stripe CLI:
```bash
stripe trigger invoice.payment_succeeded
```

Verifica:
1. Se crea registro en `subscription_payments`
2. Se actualizan fechas en `unified_subscriptions`
3. Cliente recibe email de pago
4. Admin recibe copia

### 7. **Probar Pago Fallido**

Con Stripe CLI:
```bash
stripe trigger invoice.payment_failed
```

Verifica:
1. Suscripción marca como `past_due`
2. Se registra pago fallido en `subscription_payments`
3. Cliente recibe email con alerta
4. Admin recibe notificación

---

## 📊 Ver Historial de Pagos

### En Supabase SQL Editor:

```sql
-- Ver todos los pagos de una suscripción
SELECT 
  sp.*,
  us.customer_name,
  us.product_name
FROM subscription_payments sp
JOIN unified_subscriptions us ON sp.subscription_id = us.id
WHERE sp.subscription_id = 123 -- Tu subscription_id
ORDER BY sp.payment_date DESC;

-- Ver pagos exitosos
SELECT * FROM subscription_payments
WHERE status = 'succeeded'
ORDER BY payment_date DESC;

-- Ver pagos fallidos
SELECT * FROM subscription_payments
WHERE status = 'failed'
ORDER BY payment_date DESC;

-- Ver total recaudado por suscripciones
SELECT 
  currency,
  SUM(amount) as total_recaudado,
  COUNT(*) as total_pagos
FROM subscription_payments
WHERE status = 'succeeded'
GROUP BY currency;
```

---

## ✅ Checklist de Validación

- [ ] Ejecutadas migraciones SQL
- [ ] Tabla `subscription_payments` creada
- [ ] Columna `paused_at` agregada
- [ ] Botones de gestión aparecen en `/perfil`
- [ ] Se puede pausar una suscripción activa
- [ ] Se puede reanudar una suscripción pausada
- [ ] Se puede cancelar una suscripción (con confirmación)
- [ ] Los webhooks actualizan fechas correctamente
- [ ] Los pagos se registran en `subscription_payments`
- [ ] Cliente recibe emails de todos los eventos
- [ ] Admin (contacto@petgourmet.mx) recibe copias de emails
- [ ] Email de pago exitoso incluye próxima fecha
- [ ] Email de pago fallido solicita actualizar método de pago
- [ ] UI muestra estados correctos (Activa/Pausada/Cancelada/Past Due)

---

## 🔐 Variables de Entorno

Asegúrate de que `.env.local` tenga:

```bash
# Email
EMAIL_FROM=Pet Gourmet <contacto@petgourmet.mx>
SMTP_FROM=contacto@petgourmet.mx
SMTP_HOST=smtpout.secureserver.net
SMTP_USER=contacto@petgourmet.mx
SMTP_PASS=PGMexico1$
SMTP_PORT=465
SMTP_SECURE=true

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJh...
```

---

## 📞 Soporte

Si encuentras problemas:

1. **Revisa los logs del webhook** en la terminal
2. **Verifica la base de datos:**
   ```sql
   SELECT * FROM subscription_payments ORDER BY created_at DESC LIMIT 10;
   ```
3. **Revisa los emails enviados** en los logs de la consola
4. **Verifica el estado de las suscripciones:**
   ```sql
   SELECT 
     id,
     customer_email,
     status,
     next_billing_date,
     paused_at,
     canceled_at
   FROM unified_subscriptions
   ORDER BY created_at DESC;
   ```

---

## 🎉 Resumen

✅ **Sistema completo implementado con:**
- Pausar/Reanudar/Cancelar suscripciones
- Historial completo de pagos
- Actualización automática de fechas
- Notificaciones por email al cliente Y admin
- UI intuitiva con confirmaciones
- Manejo de errores de pago
- Sincronización perfecta con Stripe

¡Todo listo para gestionar suscripciones de forma profesional! 🚀
