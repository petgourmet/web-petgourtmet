# Sincronización Automática de Suscripciones con Webhooks

## 📋 Resumen

Sistema automático que sincroniza las fechas de suscripciones cuando Stripe actualiza los períodos de facturación y envía notificaciones por correo al cliente y administrador.

## 🔄 Flujo de Sincronización

### 1. Stripe actualiza la suscripción
- El webhook `customer.subscription.updated` se dispara cuando:
  - Inicia un nuevo período de facturación
  - Cambia el estado de la suscripción
  - Se actualiza la fecha del próximo cobro
  - Se modifica cualquier configuración

### 2. Webhook procesa la actualización
**Archivo:** `app/api/stripe/webhook/route.ts`

```typescript
async function handleSubscriptionUpdated(subscription: Stripe.Subscription)
```

**Proceso:**
1. ✅ Recibe datos de Stripe con nuevas fechas
2. 🔍 Obtiene suscripción actual de la BD
3. 📊 Detecta cambios significativos (fechas o estado)
4. 💾 Actualiza en `unified_subscriptions`:
   - `current_period_start`
   - `current_period_end`
   - `status`
   - `cancel_at_period_end`
   - `updated_at`
5. 📧 Envía notificaciones si hay cambios

### 3. Notificaciones por correo

#### Al Cliente
- **Para:** Email del cliente (de la suscripción)
- **Asunto:** 🔄 Tu suscripción ha sido actualizada - Pet Gourmet
- **Contenido:**
  - Tipo de suscripción (Semanal, Quincenal, Mensual)
  - Estado actual (✅ Activa, ⏸️ Pausada, etc.)
  - Monto por período
  - **Período actual inicia:** Fecha formateada
  - **Período actual termina:** Fecha formateada
  - **Próximo cobro:** Fecha del siguiente pago
  - Botón "Ver Mi Suscripción"

#### Al Administrador
- **Para:** contacto@petgourmet.mx
- **Asunto:** 🔄 Tu suscripción ha sido actualizada - Pet Gourmet
- **Contenido:** Todo lo anterior PLUS:
  - **Detalles de Actualización (Admin)**:
    - ID Usuario
    - ID Suscripción (Stripe)
    - Período anterior
    - Estado anterior
    - Indicadores de cambios

## 🛠️ Implementación Técnica

### Archivos Modificados

#### 1. `app/api/stripe/webhook/route.ts`
```typescript
// Función mejorada con:
// - Detección de cambios significativos
// - Logging detallado
// - Notificaciones condicionales
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // 1. Obtener datos actuales
  const { data: existingSubscription } = await supabaseAdmin
    .from('unified_subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  // 2. Detectar cambios
  const hasDateChanges = /* comparación de fechas */
  const hasStatusChange = /* comparación de estado */

  // 3. Actualizar BD
  const { data: updatedSubscription } = await supabaseAdmin
    .from('unified_subscriptions')
    .update({
      status: subscriptionData.status,
      current_period_start: new Date(...).toISOString(),
      current_period_end: new Date(...).toISOString(),
      // ...
    })

  // 4. Enviar notificaciones solo si hay cambios
  if (hasDateChanges || hasStatusChange) {
    await sendSubscriptionEmail('subscription_updated', {...})
  }
}
```

#### 2. `lib/email-service.ts`

**Interface actualizada:**
```typescript
export interface SubscriptionEmailData {
  user_email: string;
  user_name: string;
  subscription_type: string;
  amount: number;
  next_payment_date?: string;
  plan_description?: string;
  external_reference: string;
  current_period_start?: string;    // ✨ NUEVO
  current_period_end?: string;      // ✨ NUEVO
  status?: string;                  // ✨ NUEVO
  admin_details?: any;              // ✨ NUEVO
}
```

**Nuevo tipo de email:**
```typescript
export async function sendSubscriptionEmail(
  emailType: 'created' | 'payment' | 'cancelled' | 'paused' | 'resumed' | 'payment_failed' | 'subscription_updated', // ✨ NUEVO
  subscriptionData: SubscriptionEmailData,
  maxRetries: number = 3
)
```

**Template agregado:**
```typescript
subscription_updated: {
  subject: '🔄 Tu suscripción ha sido actualizada - Pet Gourmet',
  title: '🔄 Suscripción Actualizada',
  message: 'Tu suscripción ha sido actualizada. A continuación encontrarás los detalles del nuevo período.',
  color: '#3b82f6',
  icon: '🔄'
}
```

## 📧 Ejemplo de Email

### Para Cliente:
```
🐾 Pet Gourmet
━━━━━━━━━━━━━━━━━━━━━━

🔄 Suscripción Actualizada

Hola María,

Tu suscripción ha sido actualizada. A continuación encontrarás 
los detalles del nuevo período.

📦 Detalles de tu Suscripción

Tipo de suscripción:        Suscripción Mensual
Plan:                        Plan Premium Canino
Estado:                      ✅ Activa
Monto por período:           $499.00 MXN
Período actual inicia:       1 de diciembre de 2025
Período actual termina:      1 de enero de 2026
Próximo cobro:              1 de enero de 2026

[Ver Mi Suscripción]
```

### Para Admin (incluye detalles adicionales):
```
📊 Detalles de Actualización (Admin)

ID Usuario:              123
ID Suscripción:         sub_1O8Zx7x8Zx7x8Zx
Período anterior:        1 de nov de 2025 - 1 de dic de 2025
Estado anterior:         active
```

## 🎯 Eventos que Disparan Sincronización

### Cambios detectados automáticamente:

1. **Cambio de fechas** (`hasDateChanges`):
   - Nuevo período de facturación inicia
   - Fecha de finalización cambia
   - Próximo cobro se actualiza

2. **Cambio de estado** (`hasStatusChange`):
   - `active` → `paused`
   - `paused` → `active`
   - `active` → `past_due`
   - Cualquier transición de estado

### Cuándo NO se envían notificaciones:
- Actualizaciones sin cambios significativos
- Cambios menores en metadata
- Actualizaciones de ID de Stripe interno

## 🔍 Logs y Monitoreo

### Consola del servidor muestra:
```
🔄 Subscription updated: sub_1O8Zx7x8Zx7x8Zx
✅ Suscripción actualizada en BD: {
  id: 'sub_1O8Zx7x8Zx7x8Zx',
  status: 'active',
  period: '2025-12-01T00:00:00.000Z - 2026-01-01T00:00:00.000Z',
  hasDateChanges: true,
  hasStatusChange: false
}
✅ Email de actualización enviado al cliente: maria@example.com
✅ Email de actualización enviado al admin: contacto@petgourmet.mx
```

### Si no hay cambios:
```
ℹ️ Sin cambios significativos, no se envían notificaciones
```

## 🛡️ Seguridad y Confiabilidad

### Validación del Webhook
- Verifica firma de Stripe con `STRIPE_WEBHOOK_SECRET`
- Rechaza webhooks no autenticados
- Usa transacción única por evento

### Manejo de Errores
```typescript
try {
  await sendSubscriptionEmail(...)
  console.log('✅ Email enviado')
} catch (emailError) {
  console.error('❌ Error enviando email:', emailError)
  // NO falla el webhook por error de email
}
```

### Reintentos Automáticos
- Email service tiene 3 intentos por defecto
- Backoff exponencial (2s, 4s, 8s)
- Logs detallados de cada intento

## 🚀 Configuración Requerida

### Variables de Entorno
```env
# Stripe
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SECRET_KEY=sk_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@petgourmet.mx
SMTP_PASSWORD=...
EMAIL_FROM="Pet Gourmet <noreply@petgourmet.mx>"

# Base URL
NEXT_PUBLIC_BASE_URL=https://petgourmet.mx
```

### Configurar Webhook en Stripe Dashboard

1. Ir a: https://dashboard.stripe.com/webhooks
2. Agregar endpoint: `https://petgourmet.mx/api/stripe/webhook`
3. Eventos a escuchar:
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `checkout.session.completed`

4. Copiar `Signing secret` a `STRIPE_WEBHOOK_SECRET`

## 📊 Campos de Base de Datos

### Tabla: `unified_subscriptions`

```sql
-- Campos sincronizados automáticamente:
current_period_start   TIMESTAMP  -- Inicio del período actual
current_period_end     TIMESTAMP  -- Fin del período actual
status                 VARCHAR    -- Estado de la suscripción
cancel_at_period_end   BOOLEAN    -- Si se cancela al terminar período
updated_at            TIMESTAMP  -- Última actualización
```

## 🧪 Testing

### Probar con Stripe CLI:
```bash
# Instalar Stripe CLI
stripe login

# Escuchar webhooks localmente
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Disparar evento de prueba
stripe trigger customer.subscription.updated
```

### Verificar en logs:
```bash
# Terminal donde corre Next.js
pnpm run dev
# Ver logs de webhook
```

## 📞 Soporte

### En caso de problemas:

1. **Verificar configuración:**
   - Variables de entorno correctas
   - Webhook configurado en Stripe
   - SMTP funcionando

2. **Revisar logs:**
   - Consola del servidor Next.js
   - Stripe Dashboard → Webhooks → Logs
   - Supabase Dashboard → Logs

3. **Contacto:**
   - Email admin: contacto@petgourmet.mx
   - Documentación Stripe: https://docs.stripe.com/webhooks

## 📅 Historial de Cambios

- **2025-11-25**: Implementación inicial de sincronización automática
  - Webhook actualizado para detectar cambios
  - Sistema de notificaciones dual (cliente + admin)
  - Templates de email con fechas formateadas
  - Logs mejorados para debugging
