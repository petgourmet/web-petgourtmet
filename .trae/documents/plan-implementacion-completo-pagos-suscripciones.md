# Plan de Implementación Completo - Sistema de Pagos y Suscripciones Pet Gourmet

## 📋 Estado Actual del Proyecto

### ✅ Componentes Ya Implementados

1. **Sistema de Webhooks**
   - ✅ `WebhookService` en `lib/webhook-service.ts`
   - ✅ Endpoint `/api/mercadopago/webhook/route.ts`
   - ✅ Validación de firmas de seguridad
   - ✅ Procesamiento de pagos de órdenes y suscripciones

2. **Base de Datos**
   - ✅ Tabla `orders` - Órdenes de compra
   - ✅ Tabla `order_items` - Productos de cada orden
   - ✅ Tabla `user_subscriptions` - Suscripciones de usuarios
   - ✅ Tabla `subscription_billing_history` - Historial de pagos
   - ✅ Tabla `profiles` - Perfiles de usuario
   - ✅ Tabla `products` - Catálogo de productos

3. **Interfaces de Usuario**
   - ✅ Panel de administración (`/admin/orders`, `/admin/subscription-orders`)
   - ✅ Página de perfil de usuario (`/perfil`)
   - ✅ Componentes de tiempo real implementados

4. **Configuración**
   - ✅ MercadoPago en producción configurado
   - ✅ SMTP para emails configurado
   - ✅ Supabase como base de datos
   - ✅ Variables de entorno configuradas

## 🔧 Ajustes y Configuraciones Necesarias

### 1. Configuración Externa - MercadoPago

#### 1.1 Configurar Webhooks en Panel de MercadoPago

**URL del Webhook:**
```
https://petgourmet.mx/api/mercadopago/webhook
```

**Eventos a Configurar:**
- ✅ `payment` - Pagos creados/actualizados
- ✅ `subscription_preapproval` - Suscripciones creadas/actualizadas/canceladas
- ✅ `subscription_authorized_payment` - Pagos de suscripciones
- ✅ `plan` - Planes de suscripción (opcional)
- ✅ `invoice` - Facturas (opcional)

**Pasos para Configurar:**
1. Ir a https://www.mercadopago.com.mx/developers/panel/webhooks
2. Crear nuevo webhook con URL: `https://petgourmet.mx/api/mercadopago/webhook`
3. Seleccionar todos los eventos mencionados arriba
4. Guardar y activar el webhook
5. Copiar el ID del webhook para monitoreo

#### 1.2 Verificar Credenciales

**Variables de Entorno Actuales:**
```bash
MERCADOPAGO_ACCESS_TOKEN=APP_USR-1329434229865091-103120-bd57a35fcc4262dcc18064dd52ccaac7-1227980651
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-78b50431-bdd5-435d-b76f-98114b4fcccd
NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT=production
MERCADOPAGO_WEBHOOK_SECRET=PetGourmet2025_WebhookSecret_MercadoPago_Secure
```

**✅ Verificación:** Las credenciales están configuradas para producción.

### 2. Ajustes de Código Necesarios

#### 2.1 Mejorar Manejo de Errores en WebhookService

**Archivo:** `lib/webhook-service.ts`

**Ajustes Necesarios:**

1. **Agregar Logging Mejorado:**
```typescript
// Agregar al inicio de processPaymentWebhook
console.log(`💳 [${new Date().toISOString()}] Procesando webhook de pago: ${paymentId}`);

// Agregar logging de respuesta de MercadoPago
if (!response.ok) {
  console.error(`❌ [${new Date().toISOString()}] Error API MercadoPago:`, {
    status: response.status,
    statusText: response.statusText,
    paymentId
  });
}
```

2. **Mejorar Validación de Datos:**
```typescript
// En handleOrderPayment, agregar validación
if (!paymentData.external_reference) {
  console.warn(`⚠️ Pago ${paymentData.id} sin external_reference - posible pago directo`);
  // Buscar orden por mercadopago_payment_id como fallback
  const { data: orderByPaymentId } = await supabase
    .from('orders')
    .select('*')
    .eq('mercadopago_payment_id', paymentData.id.toString())
    .single();
  
  if (orderByPaymentId) {
    orderId = orderByPaymentId.id;
  } else {
    return true; // No fallar por pagos sin referencia
  }
}
```

#### 2.2 Agregar Endpoint de Verificación de Estado

**Crear:** `app/api/mercadopago/verify-payment/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { payment_id, order_id } = await request.json()
    
    // Obtener datos del pago desde MercadoPago
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Error al verificar pago en MercadoPago' },
        { status: 400 }
      )
    }
    
    const paymentData = await response.json()
    
    // Actualizar orden si el estado cambió
    const supabase = await createClient()
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: paymentData.status,
        status: mapPaymentStatusToOrderStatus(paymentData.status),
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id)
    
    if (error) {
      return NextResponse.json(
        { error: 'Error actualizando orden' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      payment_status: paymentData.status,
      order_status: mapPaymentStatusToOrderStatus(paymentData.status)
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

function mapPaymentStatusToOrderStatus(paymentStatus: string): string {
  const statusMap: Record<string, string> = {
    'approved': 'confirmed',
    'paid': 'confirmed',
    'pending': 'pending_payment',
    'in_process': 'processing',
    'cancelled': 'cancelled',
    'rejected': 'cancelled',
    'refunded': 'refunded'
  }
  return statusMap[paymentStatus] || 'pending_payment'
}
```

#### 2.3 Mejorar Componente de Admin - Órdenes

**Archivo:** `app/admin/(dashboard)/orders/page.tsx`

**Agregar Botón de Verificación Masiva:**

```typescript
// Agregar función para verificar todos los pagos pendientes
async function verifyAllPendingPayments() {
  const pendingOrders = orders.filter(order => 
    order.payment_status === 'pending' && order.mercadopago_payment_id
  )
  
  for (const order of pendingOrders) {
    try {
      const response = await fetch('/api/mercadopago/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: order.mercadopago_payment_id,
          order_id: order.id
        })
      })
      
      if (response.ok) {
        console.log(`✅ Orden ${order.id} verificada`)
      }
    } catch (error) {
      console.error(`❌ Error verificando orden ${order.id}:`, error)
    }
  }
  
  // Refrescar órdenes
  fetchOrders()
}
```

### 3. Scripts de Verificación y Monitoreo

#### 3.1 Script de Verificación del Sistema

**Crear:** `scripts/verify-payment-system.js`

```javascript
const fetch = require('node-fetch')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyPaymentSystem() {
  console.log('🚀 Verificando sistema de pagos...')
  
  // 1. Verificar webhook endpoint
  try {
    const webhookResponse = await fetch('https://petgourmet.mx/api/mercadopago/webhook')
    console.log(`✅ Webhook endpoint: ${webhookResponse.status === 200 ? 'OK' : 'ERROR'}`)
  } catch (error) {
    console.log('❌ Webhook endpoint: ERROR')
  }
  
  // 2. Verificar conexión a base de datos
  try {
    const { data, error } = await supabase.from('orders').select('count').limit(1)
    console.log(`✅ Base de datos: ${error ? 'ERROR' : 'OK'}`)
  } catch (error) {
    console.log('❌ Base de datos: ERROR')
  }
  
  // 3. Verificar órdenes pendientes
  const { data: pendingOrders } = await supabase
    .from('orders')
    .select('id, payment_status, mercadopago_payment_id')
    .eq('payment_status', 'pending')
    .not('mercadopago_payment_id', 'is', null)
  
  console.log(`📊 Órdenes pendientes con ID de MercadoPago: ${pendingOrders?.length || 0}`)
  
  // 4. Verificar suscripciones activas
  const { data: activeSubscriptions } = await supabase
    .from('user_subscriptions')
    .select('id, status')
    .eq('status', 'active')
  
  console.log(`📊 Suscripciones activas: ${activeSubscriptions?.length || 0}`)
  
  console.log('✅ Verificación completada')
}

verifyPaymentSystem().catch(console.error)
```

#### 3.2 Script de Monitoreo de Webhooks

**Crear:** `scripts/monitor-webhooks.js`

```javascript
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function monitorWebhooks() {
  console.log('📡 Iniciando monitoreo de webhooks...')
  
  // Crear tabla de logs si no existe
  const { error: createError } = await supabase.rpc('create_webhook_logs_table')
  
  // Monitorear cambios en tiempo real
  const channel = supabase
    .channel('webhook_monitor')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'orders'
    }, (payload) => {
      console.log(`🔔 [${new Date().toISOString()}] Cambio en orders:`, {
        event: payload.eventType,
        order_id: payload.new?.id || payload.old?.id,
        status: payload.new?.status,
        payment_status: payload.new?.payment_status
      })
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_subscriptions'
    }, (payload) => {
      console.log(`🔔 [${new Date().toISOString()}] Cambio en suscripciones:`, {
        event: payload.eventType,
        subscription_id: payload.new?.id || payload.old?.id,
        status: payload.new?.status
      })
    })
    .subscribe()
  
  console.log('✅ Monitoreo activo. Presiona Ctrl+C para salir.')
}

monitorWebhooks().catch(console.error)
```

## 🧪 Plan de Pruebas Completo

### 1. Pruebas de Configuración

#### 1.1 Verificar Webhook
```bash
# Verificar que el webhook responde
curl https://petgourmet.mx/api/mercadopago/webhook

# Respuesta esperada:
{
  "status": "active",
  "message": "Webhook endpoint de MercadoPago funcionando",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production"
}
```

#### 1.2 Probar Webhook con Datos de Prueba
```bash
curl -X POST https://petgourmet.mx/api/mercadopago/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: test" \
  -H "x-request-id: test-123" \
  -d '{
    "id": "test-webhook",
    "live_mode": false,
    "type": "payment",
    "date_created": "2024-01-01T00:00:00.000Z",
    "application_id": "123",
    "user_id": "456",
    "version": 1,
    "api_version": "v1",
    "action": "payment.updated",
    "data": {
      "id": "1234567890"
    }
  }'
```

### 2. Pruebas de Flujo Completo

#### 2.1 Flujo de Orden Individual
1. **Crear orden de prueba** en el frontend
2. **Procesar pago** con MercadoPago
3. **Verificar webhook** se recibe y procesa
4. **Confirmar actualización** en admin y perfil de usuario
5. **Verificar email** de confirmación se envía

#### 2.2 Flujo de Suscripción
1. **Crear suscripción** en el frontend
2. **Procesar primer pago** con MercadoPago
3. **Verificar webhook de suscripción** se procesa
4. **Confirmar registro** en `user_subscriptions`
5. **Verificar historial** en `subscription_billing_history`
6. **Confirmar email** de bienvenida

### 3. Pruebas de Tiempo Real

#### 3.1 Verificar Actualizaciones Automáticas
1. **Abrir panel de admin** en una pestaña
2. **Abrir perfil de usuario** en otra pestaña
3. **Simular webhook** de cambio de estado
4. **Verificar** que ambas interfaces se actualizan automáticamente

## 📊 Monitoreo y Troubleshooting

### 1. Logs a Monitorear

#### 1.1 Logs de Webhook
```bash
# En producción, revisar logs de Vercel/servidor
# Buscar estos patrones:
🔔 Webhook recibido de MercadoPago
✅ Webhook procesado exitosamente
❌ Error procesando webhook
```

#### 1.2 Logs de Base de Datos
```sql
-- Verificar órdenes recientes
SELECT id, status, payment_status, created_at, updated_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;

-- Verificar suscripciones activas
SELECT id, status, next_billing_date, last_billing_date
FROM user_subscriptions
WHERE status = 'active'
ORDER BY created_at DESC;

-- Verificar historial de pagos reciente
SELECT subscription_id, billing_date, amount, status
FROM subscription_billing_history
ORDER BY billing_date DESC
LIMIT 10;
```

### 2. Problemas Comunes y Soluciones

#### 2.1 Webhook No Se Recibe
**Síntomas:**
- Pagos no se actualizan automáticamente
- Estados permanecen en "pending"

**Soluciones:**
1. Verificar URL del webhook en MercadoPago
2. Revisar logs del servidor
3. Verificar que el endpoint responde con 200
4. Comprobar configuración de firewall/CDN

#### 2.2 Firma de Webhook Inválida
**Síntomas:**
- Webhooks se reciben pero no se procesan
- Error 401 en logs

**Soluciones:**
1. Verificar `MERCADOPAGO_WEBHOOK_SECRET`
2. Regenerar secret en MercadoPago si es necesario
3. Verificar que el secret coincide en ambos lados

#### 2.3 Órdenes No Se Encuentran
**Síntomas:**
- Webhook se procesa pero orden no se actualiza
- Warning "Orden no encontrada" en logs

**Soluciones:**
1. Verificar que `external_reference` se está enviando correctamente
2. Revisar formato del ID de orden
3. Verificar que la orden existe en la base de datos

## 📝 Lista de Tareas Específicas

### Para el Desarrollador

#### ✅ Tareas Inmediatas
1. **Configurar Webhook en MercadoPago**
   - URL: `https://petgourmet.mx/api/mercadopago/webhook`
   - Eventos: payment, subscription_preapproval, subscription_authorized_payment

2. **Ejecutar Scripts de Verificación**
   ```bash
   npm run verify-mercadopago
   node scripts/verify-payment-system.js
   ```

3. **Probar Flujo Completo**
   - Crear orden de prueba
   - Verificar webhook se recibe
   - Confirmar actualización en admin

4. **Implementar Mejoras de Código**
   - Agregar logging mejorado en WebhookService
   - Crear endpoint de verificación de pagos
   - Mejorar manejo de errores

#### 🔄 Tareas de Mantenimiento
1. **Monitoreo Diario**
   - Revisar logs de webhooks
   - Verificar órdenes pendientes
   - Confirmar suscripciones activas

2. **Verificación Semanal**
   - Ejecutar script de verificación del sistema
   - Revisar métricas de pagos
   - Verificar emails se están enviando

3. **Mantenimiento Mensual**
   - Limpiar logs antiguos
   - Revisar suscripciones vencidas
   - Actualizar documentación si es necesario

### Para Configuración Externa

#### 🌐 MercadoPago
1. **Panel de Webhooks**
   - Configurar URL del webhook
   - Activar eventos necesarios
   - Verificar estado del webhook

2. **Monitoreo**
   - Revisar logs de webhooks en panel de MercadoPago
   - Verificar que se están enviando correctamente
   - Confirmar respuestas 200 del servidor

#### 📧 Email
1. **SMTP**
   - Verificar configuración actual funciona
   - Probar envío de emails de prueba
   - Confirmar templates se renderizan correctamente

## 🚀 Próximos Pasos

### Fase 1: Configuración y Verificación (1-2 días)
1. Configurar webhook en MercadoPago
2. Ejecutar scripts de verificación
3. Probar flujo básico de pagos
4. Verificar emails se envían

### Fase 2: Mejoras y Optimización (2-3 días)
1. Implementar mejoras de código sugeridas
2. Agregar endpoint de verificación de pagos
3. Mejorar logging y monitoreo
4. Probar casos edge

### Fase 3: Monitoreo y Mantenimiento (Continuo)
1. Establecer rutinas de monitoreo
2. Documentar procedimientos de troubleshooting
3. Capacitar al equipo en el uso del sistema
4. Planificar mejoras futuras

## 📞 Soporte y Contacto

**En caso de problemas:**
1. Revisar logs del sistema
2. Ejecutar scripts de verificación
3. Consultar esta documentación
4. Contactar soporte técnico si es necesario

**Recursos útiles:**
- [Documentación de MercadoPago](https://www.mercadopago.com.mx/developers/es/docs)
- [Panel de Webhooks](https://www.mercadopago.com.mx/developers/panel/webhooks)
- [Supabase Dashboard](https://app.supabase.com/)

---

**Última actualización:** Enero 2025
**Versión:** 1.0
**Estado:** Listo para implementación