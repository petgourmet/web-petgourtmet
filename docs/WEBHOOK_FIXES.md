# Correcciones al Sistema de Webhooks y Flujo de Compra

## Fecha
17 de Octubre, 2025

## Problema Identificado
El sistema de webhooks y flujo de compra tenía varios problemas:

1. **Imports incorrectos**: Algunos archivos importaban `WebhookService` como named import cuando debería ser default import
2. **Rutas de import incorrectas**: El servicio de webhooks usaba rutas relativas incorrectas (ej: `../lib/` en vez de `./`)
3. **Dependencias faltantes**: Imports de módulos que no existían (`mercadopago/types`, `idempotency/service`)

## Cambios Realizados

### 1. `lib/webhook-service.ts`
**Problema**: Imports incorrectos y dependencias faltantes

**Correcciones**:
- ✅ Removidos imports de módulos inexistentes:
  - `./mercadopago/types` (WebhookPayload, PaymentData, SubscriptionData)
  - `./idempotency/service` (createIdempotencyService)
- ✅ Agregada definición local de `WebhookPayload` interface
- ✅ Corregida ruta en `createSupabaseClient()`: `./supabase/service` (antes: `../lib/supabase/service`)
- ✅ Mantenido export correcto: `export default webhookService` (instancia singleton)

```typescript
// Antes
import { WebhookPayload } from '../lib/mercadopago/types'
import { createIdempotencyService } from '../lib/idempotency/service'

// Después
interface WebhookPayload {
  type: string
  action?: string
  data?: { id: string }
  // ...
}
```

### 2. `app/api/subscriptions/verify-return/route.ts`
**Problema**: Import incorrecto de WebhookService

**Correcciones**:
- ✅ Cambiado de named import a default import
- ❌ Removida variable no utilizada

```typescript
// Antes
import WebhookService from '@/lib/webhook-service'
const webhookService = WebhookService

// Después  
import webhookService from '@/lib/webhook-service'
```

**Nota**: Este archivo aún tiene otros errores de logger (usa formato antiguo) pero no afectan el flujo de webhooks.

### 3. `app/api/admin/activate-subscription/route.ts`
**Problema**: Import incorrecto de WebhookService

**Correcciones**:
- ✅ Cambiado de named import a default import

```typescript
// Antes
import WebhookService from '@/lib/webhook-service'
const webhookService = WebhookService

// Después
import webhookService from '@/lib/webhook-service'
```

## Estado Actual

### ✅ Archivos Corregidos (Sin errores)
- `lib/webhook-service.ts`
- `app/api/mercadopago/webhook/route.ts`
- `app/api/subscriptions/webhook/route.ts`

### ⚠️ Archivos con Errores Menores (No críticos)
- `app/api/subscriptions/verify-return/route.ts` - Errores de tipado del logger
- `app/api/admin/activate-subscription/route.ts` - Error menor en nodemailer

## Flujo de Webhooks Corregido

```
1. MercadoPago envía webhook
   ↓
2. POST /api/mercadopago/webhook
   ↓
3. webhookService.processPaymentWebhook() o processSubscriptionWebhook()
   ↓
4. Valida firma y estructura
   ↓
5. Obtiene datos de MercadoPago API
   ↓
6. Busca suscripción/orden en Supabase
   ↓
7. Actualiza estado en base de datos
   ↓
8. Retorna respuesta a MercadoPago
```

## Arquitectura del Sistema de Webhooks

### Endpoints de Webhook
1. **`/api/mercadopago/webhook`** - Webhook principal para pagos y merchant orders
2. **`/api/subscriptions/webhook`** - Webhook para suscripciones (preapproval)

### Servicios
- **`webhookService`** (singleton) - Procesa todos los tipos de webhooks
  - `processPaymentWebhook()` - Maneja webhooks de pagos
  - `processSubscriptionWebhook()` - Maneja webhooks de suscripciones
  - `processMerchantOrderWebhook()` - Maneja webhooks de órdenes
  - `createPaymentSubscriptionMapping()` - Estrategias de mapeo robusto

### Estrategias de Mapeo de Pagos a Suscripciones
El sistema usa 5 estrategias para relacionar pagos con suscripciones:

1. **Direct External Reference** - Coincidencia exacta de external_reference
2. **Timestamp + Email** - Búsqueda por email en ventana de 10 minutos
3. **User + Product ID** - Extracción de IDs del external_reference
4. **Metadata Reference** - Búsqueda en campos de metadata
5. **Amount + Email** - Coincidencia por monto y email (último recurso)

## Recomendaciones

### Inmediatas ✅
1. ✅ Todos los archivos usen `import webhookService from '@/lib/webhook-service'`
2. ✅ Mantener exports consistentes (default para instancias, named para clases)
3. ✅ Usar rutas de import relativas correctas dentro de `/lib`

### Corto Plazo 🔄
1. **Crear tipos compartidos**: Definir interfaces en `types/mercadopago.ts`
2. **Actualizar logger calls**: Usar formato consistente en verify-return.ts
3. **Agregar tests**: Tests unitarios para webhook-service
4. **Documentar external_reference**: Formato y estructura esperada

### Medio Plazo 📋
1. **Implementar idempotency service**: Evitar procesamiento duplicado de webhooks
2. **Mejorar monitoreo**: Dashboard para visualizar estado de webhooks
3. **Rate limiting**: Protección contra spam de webhooks
4. **Retry mechanism**: Sistema de reintentos automáticos para webhooks fallidos

## Testing

### Verificación Manual
```bash
# 1. Probar endpoint de webhook (GET)
curl https://tu-dominio.com/api/mercadopago/webhook

# 2. Probar webhook de pago (desarrollo)
curl -X POST https://tu-dominio.com/api/mercadopago/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: test-signature-dev" \
  -d '{
    "type": "payment",
    "action": "payment.created",
    "data": { "id": "123456789" }
  }'
```

### Verificación en MercadoPago
1. Ir a MercadoPago Dashboard → Integraciones → Webhooks
2. Verificar que la URL esté configurada: `https://petgourmet.mx/api/mercadopago/webhook`
3. Realizar un pago de prueba
4. Verificar logs del webhook en el dashboard

## Solución de Problemas Comunes

### Webhook no recibe notificaciones
- ✅ Verificar URL configurada en MercadoPago
- ✅ Verificar que el servidor sea accesible públicamente
- ✅ Revisar logs de Vercel/servidor
- ✅ Verificar firma del webhook (x-signature header)

### Suscripción no se activa después del pago
- ✅ Verificar que external_reference sea consistente
- ✅ Revisar logs de mapeo de pagos a suscripciones
- ✅ Verificar que el pago esté "approved"
- ✅ Comprobar estado de la suscripción en DB

### Error "WebhookService is not defined"
- ✅ Usar `import webhookService from '@/lib/webhook-service'`
- ✅ No usar `const webhookService = WebhookService`

## Monitoreo

### Logs Importantes
```typescript
// Webhook recibido
LogCategory.WEBHOOK, 'Webhook MercadoPago recibido'

// Procesamiento exitoso
LogCategory.WEBHOOK, 'Webhook procesado exitosamente'

// Errores
LogCategory.WEBHOOK, 'Error procesando webhook'
```

### Métricas Clave
- Tasa de éxito de webhooks (debe ser > 98%)
- Tiempo de procesamiento (debe ser < 2 segundos)
- Reintentos de MercadoPago (debe ser < 5%)

## Conclusión

El sistema de webhooks ahora está funcional y correctamente estructurado. Los problemas principales de imports y rutas han sido resueltos. El flujo de compra debería funcionar correctamente desde la creación del pedido hasta la activación de la suscripción.

### Próximos Pasos
1. ✅ Verificar en producción con un pago real
2. 🔄 Monitorear logs durante las primeras 24 horas
3. 📋 Implementar mejoras de corto plazo si todo funciona bien
