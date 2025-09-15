# Guía Completa del Flujo de Suscripciones

## Resumen del Sistema

Este documento describe el flujo completo de suscripciones en PetGourmet, desde la creación hasta el monitoreo en producción, incluyendo la integración con MercadoPago y el manejo de webhooks.

## Arquitectura del Sistema

### Componentes Principales

1. **Frontend (Next.js)**
   - Páginas de suscripción
   - Manejo de autenticación
   - Integración con MercadoPago SDK

2. **Backend (API Routes)**
   - Creación de suscripciones
   - Procesamiento de webhooks
   - Gestión de estados

3. **Base de Datos (Supabase)**
   - `pending_subscriptions`: Suscripciones en proceso
   - `user_subscriptions`: Suscripciones activas
   - `profiles`: Información de usuarios
   - `webhook_logs`: Logs de webhooks
   - `subscription_billing_history`: Historial de pagos

4. **Servicios Externos**
   - MercadoPago API
   - Sistema de webhooks

## Flujo Completo de Suscripción

### 1. Iniciación de Suscripción

```typescript
// Usuario autenticado inicia suscripción
const user = await supabase.auth.getUser()
const externalReference = `sub_${user.id}_${Date.now()}`

// Se crea registro en pending_subscriptions
const { data: pendingSubscription } = await supabase
  .from('pending_subscriptions')
  .insert({
    user_id: user.id,
    external_reference: externalReference,
    subscription_type: 'premium',
    base_price: 299,
    discounted_price: 199,
    status: 'pending'
  })
```

### 2. Creación en MercadoPago

```typescript
// Se crea la suscripción en MercadoPago
const subscriptionData = {
  reason: 'Suscripción PetGourmet Premium',
  external_reference: externalReference,
  payer_email: user.email,
  back_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription/success`,
  auto_recurring: {
    frequency: 1,
    frequency_type: 'months',
    transaction_amount: 199,
    currency_id: 'MXN'
  }
}

const response = await mercadopago.preapproval.create(subscriptionData)
```

### 3. Redirección y Autorización

```typescript
// Usuario es redirigido a MercadoPago
window.location.href = response.body.init_point

// Después de autorizar, MercadoPago envía webhook
```

### 4. Procesamiento de Webhook

```typescript
// Webhook recibido en /api/webhooks/mercadopago
const webhookData = {
  id: '12345',
  topic: 'subscription_preapproval',
  type: 'subscription_preapproval'
}

// Se procesa el webhook
const webhookService = new WebhookService()
await webhookService.handleSubscriptionPreapproval(webhookData)
```

### 5. Activación de Suscripción

```typescript
// Se busca la suscripción pendiente
const { data: pendingSubscription } = await supabase
  .from('pending_subscriptions')
  .select('*')
  .eq('external_reference', externalReference)
  .single()

// Se crea la suscripción activa
const { data: activeSubscription } = await supabase
  .from('user_subscriptions')
  .insert({
    user_id: pendingSubscription.user_id,
    mercadopago_subscription_id: subscriptionId,
    external_reference: externalReference,
    subscription_type: pendingSubscription.subscription_type,
    status: 'active',
    next_billing_date: calculateNextBillingDate()
  })

// Se actualiza el perfil del usuario
await supabase
  .from('profiles')
  .update({ has_active_subscription: true })
  .eq('id', pendingSubscription.user_id)
```

## Testing en Desarrollo

### 1. Test Unitario del Flujo

```bash
# Ejecutar test completo
npm test tests/subscription-flow.test.ts
```

### 2. Test Manual con Endpoint de Debug

```bash
# Simular webhook de suscripción
curl -X POST http://localhost:3000/api/debug/subscription-flow \
  -H "Content-Type: application/json" \
  -d '{
    "action": "simulate_webhook",
    "subscription_id": "test_123",
    "external_reference": "sub_user123_1234567890"
  }'
```

### 3. Verificación de Integridad

```bash
# Verificar integridad de suscripciones
curl -X POST http://localhost:3000/api/debug/subscription-flow \
  -H "Content-Type: application/json" \
  -d '{
    "action": "check_integrity",
    "user_id": "user123"
  }'
```

## Testing en Producción

### 1. Monitoreo en Tiempo Real

**Acceder al Panel de Administración:**
```
https://tu-dominio.com/admin/subscription-monitor
```

**Características del Monitor:**
- Vista en tiempo real de suscripciones pendientes y activas
- Logs de webhooks procesados
- Estadísticas de conversión
- Búsqueda por usuario, email o referencia
- Alertas de errores

### 2. Verificación de Webhooks

**Logs de Webhook:**
```sql
-- Verificar webhooks recientes
SELECT * FROM webhook_logs 
WHERE source = 'mercadopago' 
AND processed_at > NOW() - INTERVAL '1 hour'
ORDER BY processed_at DESC;
```

**Webhooks Fallidos:**
```sql
-- Identificar webhooks con errores
SELECT * FROM webhook_logs 
WHERE success = false 
AND processed_at > NOW() - INTERVAL '24 hours';
```

### 3. Verificación de Integridad de Datos

**Suscripciones Huérfanas:**
```sql
-- Buscar suscripciones pendientes sin procesar (más de 1 hora)
SELECT ps.*, p.email 
FROM pending_subscriptions ps
JOIN profiles p ON ps.user_id = p.id
WHERE ps.status = 'pending' 
AND ps.created_at < NOW() - INTERVAL '1 hour';
```

**Usuarios sin Suscripción Activa:**
```sql
-- Verificar usuarios que deberían tener suscripción activa
SELECT p.* 
FROM profiles p
WHERE p.has_active_subscription = true
AND NOT EXISTS (
  SELECT 1 FROM user_subscriptions us 
  WHERE us.user_id = p.id AND us.status = 'active'
);
```

### 4. Utilidad de Verificación de Integridad

```typescript
// Usar la utilidad de verificación
import { SubscriptionIntegrityChecker } from '@/lib/subscription-integrity-checker'

const checker = new SubscriptionIntegrityChecker()
const report = await checker.generateIntegrityReport()

console.log('Integrity Score:', report.integrityScore)
console.log('Issues Found:', report.issues.length)
console.log('Recommendations:', report.recommendations)
```

## Casos de Prueba Críticos

### 1. Flujo Exitoso Completo

```typescript
// Test: Usuario se suscribe exitosamente
const testFlow = async () => {
  // 1. Usuario autenticado crea suscripción
  const user = await createTestUser()
  const subscription = await createSubscription(user.id)
  
  // 2. Verificar suscripción pendiente
  const pending = await getPendingSubscription(subscription.external_reference)
  expect(pending.status).toBe('pending')
  
  // 3. Simular webhook de MercadoPago
  await simulateWebhook({
    type: 'subscription_preapproval',
    data: { id: subscription.mercadopago_id }
  })
  
  // 4. Verificar activación
  const active = await getActiveSubscription(user.id)
  expect(active.status).toBe('active')
  
  // 5. Verificar perfil actualizado
  const profile = await getUserProfile(user.id)
  expect(profile.has_active_subscription).toBe(true)
}
```

### 2. Manejo de Errores

```typescript
// Test: Webhook duplicado
const testDuplicateWebhook = async () => {
  const webhookData = { id: 'test_123', type: 'subscription_preapproval' }
  
  // Procesar webhook primera vez
  const result1 = await processWebhook(webhookData)
  expect(result1.success).toBe(true)
  
  // Procesar webhook segunda vez (duplicado)
  const result2 = await processWebhook(webhookData)
  expect(result2.success).toBe(true) // Debe manejar duplicados
  expect(result2.message).toContain('already processed')
}
```

### 3. Recuperación de Errores

```typescript
// Test: Recuperación de suscripción fallida
const testFailureRecovery = async () => {
  // Crear suscripción pendiente
  const subscription = await createPendingSubscription()
  
  // Simular fallo en webhook
  await simulateWebhookFailure(subscription.external_reference)
  
  // Ejecutar recuperación manual
  const recovery = await recoverFailedSubscription(subscription.id)
  expect(recovery.success).toBe(true)
  
  // Verificar estado final
  const final = await getSubscriptionStatus(subscription.id)
  expect(final.status).toBe('active')
}
```

## Alertas y Monitoreo

### 1. Alertas Críticas

- **Webhooks Fallidos**: > 5 webhooks fallidos en 1 hora
- **Suscripciones Pendientes**: > 10 suscripciones pendientes por más de 2 horas
- **Inconsistencias de Datos**: Usuarios con `has_active_subscription=true` sin suscripción activa

### 2. Métricas de Rendimiento

- **Tiempo de Procesamiento**: Tiempo promedio de webhook a activación
- **Tasa de Conversión**: % de suscripciones pendientes que se activan
- **Tasa de Error**: % de webhooks que fallan

### 3. Logs Estructurados

```typescript
// Ejemplo de log estructurado
const webhookLogger = new WebhookLogger()
webhookLogger.logSubscriptionStart({
  webhookId: 'wh_123',
  subscriptionId: 'sub_456',
  userId: 'user_789',
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV
})
```

## Troubleshooting

### Problemas Comunes

1. **Suscripción Pendiente No Se Activa**
   - Verificar logs de webhook
   - Comprobar external_reference
   - Revisar configuración de MercadoPago

2. **Usuario No Tiene Acceso Premium**
   - Verificar `has_active_subscription` en perfil
   - Comprobar suscripción activa en `user_subscriptions`
   - Revisar fecha de próxima facturación

3. **Webhooks No Se Procesan**
   - Verificar URL de webhook en MercadoPago
   - Comprobar validación de firma
   - Revisar logs de error

### Comandos de Diagnóstico

```bash
# Verificar estado de suscripción específica
curl -X GET "http://localhost:3000/api/debug/subscription-flow?external_reference=sub_user123_1234567890"

# Forzar procesamiento de webhook
curl -X POST "http://localhost:3000/api/debug/subscription-flow" \
  -H "Content-Type: application/json" \
  -d '{"action": "force_process", "subscription_id": "12345"}'

# Generar reporte de integridad
curl -X POST "http://localhost:3000/api/debug/subscription-flow" \
  -H "Content-Type: application/json" \
  -d '{"action": "integrity_report"}'
```

## Mejores Prácticas

### 1. Desarrollo
- Usar external_reference únicos y descriptivos
- Implementar idempotencia en webhooks
- Validar siempre la firma de MercadoPago
- Manejar errores graciosamente

### 2. Testing
- Probar todos los casos de error
- Verificar integridad de datos
- Simular condiciones de red adversas
- Probar recuperación de fallos

### 3. Producción
- Monitorear métricas en tiempo real
- Configurar alertas proactivas
- Mantener logs detallados
- Implementar recuperación automática

### 4. Seguridad
- Validar todas las firmas de webhook
- Usar HTTPS en todos los endpoints
- Implementar rate limiting
- Auditar accesos a datos sensibles

## Conclusión

Este sistema proporciona un flujo robusto y monitoreado para el manejo de suscripciones, con herramientas completas para testing, debugging y monitoreo en producción. La implementación incluye redundancia, recuperación de errores y visibilidad completa del estado del sistema.

Para soporte adicional o reportar problemas, consultar los logs del sistema o contactar al equipo de desarrollo.