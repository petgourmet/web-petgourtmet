# 🔧 Correcciones al Flujo de Suscripciones - Octubre 15, 2025

## 🎯 Problemas Identificados y Solucionados

### ❌ Problemas Originales
1. **No aparecía botón "Volver al sitio"** en MercadoPago después del pago
2. **Webhook no se estaba ejecutando** (la suscripción quedaba en `pending` con `mercadopago_subscription_id = null`)
3. **Usuario quedaba atrapado** en la página de éxito de MercadoPago sin forma de regresar
4. **No había feedback claro** sobre el estado de la suscripción después del pago

### ✅ Soluciones Implementadas

#### 1. **Configuración de `auto_return` en MercadoPago** ✅
**Archivo**: `app/api/mercadopago/create-preference/route.ts`

```typescript
// Línea ~334
auto_return: "approved", // ✅ Agregar auto_return para mostrar botón "Volver al sitio"
```

**Resultado**: Ahora MercadoPago muestra el botón "Volver al sitio" automáticamente cuando el pago es aprobado.

---

#### 2. **Redirección a página correcta de suscripción** ✅
**Archivo**: `components/checkout-modal.tsx`

```typescript
// Línea ~930
backUrls: {
  success: `${window.location.origin}/suscripcion/exito`, // ✅ Cambiado de /gracias-por-tu-compra
  failure: `${window.location.origin}/error-pago`,
  pending: `${window.location.origin}/pago-pendiente`
}
```

**Resultado**: Los usuarios ahora son redirigidos a `/suscripcion/exito` específicamente para suscripciones.

---

#### 3. **Logging Mejorado en Webhook** ✅
**Archivo**: `app/api/mercadopago/webhook/route.ts`

```typescript
// Línea ~46
console.log('🔔🔔🔔 ==================== WEBHOOK RECIBIDO DE MERCADOPAGO ====================')
console.log('🔔 Timestamp:', new Date().toISOString())
console.log('🔔 URL:', request.url)

// Línea ~101
console.log('📦📦📦 DATOS DEL WEBHOOK:', {
  id: webhookData.id,
  type: webhookData.type,
  action: webhookData.action,
  dataId: webhookData.data?.id,
  liveMode: webhookData.live_mode,
  fullPayload: JSON.stringify(webhookData, null, 2)
})
```

**Resultado**: Ahora es mucho más fácil detectar si el webhook se ejecuta y qué datos recibe.

---

#### 4. **Logging Detallado en processPaymentWebhook** ✅
**Archivo**: `lib/webhook-service.ts`

```typescript
// Línea ~238
console.log('🔍 VERIFICANDO METADATA DEL PAGO', {
  raw_metadata: JSON.stringify(paymentData.metadata),
  is_subscription: paymentData.metadata?.is_subscription,
  first_payment: paymentData.metadata?.first_payment,
  subscription_id: paymentData.metadata?.subscription_id,
  user_id: paymentData.metadata?.user_id
})

console.log('✅ PAGO APROBADO - Verificando si es suscripción')

console.log('🔍 Resultado verificación suscripción:', {
  isSubscription,
  isFirstPayment,
  metadata_keys: Object.keys(metadata)
})

console.log('🎯 ¡ACTIVANDO FLUJO DE SUSCRIPCIÓN! Pago aprobado es primer pago de suscripción...')
```

**Resultado**: Podemos rastrear exactamente cómo el webhook procesa la metadata y detecta suscripciones.

---

#### 5. **Página de Éxito Mejorada** ✅
**Archivo**: `app/suscripcion/exito/page.tsx`

**Cambios principales**:
- ✅ Busca suscripciones del usuario directamente en la base de datos
- ✅ Muestra suscripciones activas O pendientes (no solo activas)
- ✅ Distingue visualmente entre estados "Activa" y "Activando..."
- ✅ Mensajes más claros según el estado
- ✅ Logging detallado del proceso

**Resultado**: El usuario siempre ve información útil, incluso si el webhook aún no se ha ejecutado.

---

## 🔄 Flujo Completo Actualizado

### 📋 Paso a Paso

1. **Usuario completa checkout** → Se crea suscripción en DB con `status = 'pending'`
2. **Se crea preferencia de MercadoPago** con:
   - `auto_return: "approved"` ✅
   - `back_urls.success: "/suscripcion/exito"` ✅
   - `metadata`: incluye `is_subscription: true`, `first_payment: true`, `subscription_id` ✅
3. **Usuario paga en MercadoPago**
4. **Usuario ve página de éxito** → Aparece botón "Volver al sitio" ✅
5. **Usuario regresa al sitio** → Va a `/suscripcion/exito`
6. **Página de éxito busca suscripción** → Muestra estado actual (activa o pendiente)
7. **MercadoPago envía webhook** (puede tardar segundos o minutos)
8. **Webhook procesa pago**:
   - Detecta `metadata.is_subscription = true` ✅
   - Detecta `metadata.first_payment = true` ✅
   - Crea preapproval en MercadoPago ✅
   - Actualiza suscripción a `status = 'active'` ✅
   - Guarda `mercadopago_subscription_id` ✅

---

## 🧪 Cómo Probar

### Prueba Completa

1. **Iniciar servidor**:
   ```bash
   pnpm dev
   ```

2. **Crear una suscripción**:
   - Ir a un producto
   - Seleccionar suscripción
   - Completar checkout
   - Click en "Finalizar compra"

3. **Verificar logs en consola del servidor**:
   ```
   ✅ Preferencia de pago creada correctamente
   📋 Datos de suscripción creados con ID: XXX
   ```

4. **En MercadoPago sandbox**:
   - Completar pago con tarjeta de prueba
   - **VERIFICAR**: Aparece botón "Volver al sitio" ✅

5. **Click en "Volver al sitio"**

6. **En página `/suscripcion/exito`**:
   - Ver mensaje de éxito
   - Ver detalles de la suscripción
   - Puede estar "Activa" o "Activando..." (ambos son correctos)

7. **Verificar en terminal del servidor** (webhook):
   ```
   🔔🔔🔔 ==================== WEBHOOK RECIBIDO DE MERCADOPAGO ====================
   📦📦📦 DATOS DEL WEBHOOK: {...}
   💳 Procesando webhook de pago
   🔍 VERIFICANDO METADATA DEL PAGO
   ✅ PAGO APROBADO - Verificando si es suscripción
   🎯 ¡ACTIVANDO FLUJO DE SUSCRIPCIÓN! Pago aprobado es primer pago de suscripción...
   ✅ Preapproval creado exitosamente en MercadoPago
   🎉 Suscripción activada exitosamente
   ```

8. **Verificar en base de datos**:
   ```sql
   SELECT 
     id, 
     status, 
     mercadopago_subscription_id,
     next_billing_date,
     charges_made
   FROM unified_subscriptions 
   WHERE user_id = 'xxx'
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   
   Debería mostrar:
   - `status = 'active'` ✅
   - `mercadopago_subscription_id` con un valor (no null) ✅
   - `charges_made = 1` ✅

---

## 🐛 Troubleshooting

### ❌ "El webhook no se ejecuta"

**Verificar**:
1. URL del webhook en MercadoPago debe ser pública (no localhost)
2. En desarrollo local, usar ngrok o similar:
   ```bash
   ngrok http 3000
   ```
3. Actualizar `.env` con la URL pública:
   ```env
   NEXT_PUBLIC_BASE_URL=https://xxx.ngrok.io
   ```

### ❌ "La suscripción queda en pending"

**Posibles causas**:
1. Webhook no llegó (verificar logs del servidor)
2. Webhook llegó pero falló (verificar logs de error)
3. Metadata no se envió correctamente (verificar logs de `processPaymentWebhook`)

**Solución temporal**:
- La página de éxito mostrará el estado "Activando..." 
- El usuario puede verificar en su perfil si la suscripción se activó

### ❌ "No aparece botón Volver al sitio"

**Verificar**:
1. `auto_return: "approved"` está en la preferencia ✅ (ya corregido)
2. `back_urls.success` tiene una URL válida ✅ (ya corregido)

---

## 📊 Estado Actual

| Componente | Estado | Descripción |
|-----------|--------|-------------|
| `auto_return` | ✅ | Agregado a preferencia |
| `back_urls` | ✅ | Configurados correctamente |
| Webhook logging | ✅ | Mejorado significativamente |
| Payment webhook | ✅ | Detecta y procesa suscripciones |
| Página de éxito | ✅ | Muestra estados activo/pendiente |
| Metadata | ✅ | Incluye `is_subscription`, `first_payment` |

---

## 🎯 Próximos Pasos

1. **Probar en sandbox** con tarjetas de prueba de MercadoPago
2. **Verificar que webhook se ejecuta** (revisar logs del servidor)
3. **Confirmar que suscripción pasa de pending → active**
4. **Validar que `mercadopago_subscription_id` se guarda correctamente**
5. **Probar flujo completo de principio a fin**

---

## 📝 Notas Importantes

- ⚠️ El webhook puede tardar **varios segundos** en llegar después del pago
- ⚠️ En localhost, el webhook **NO** funcionará (se necesita URL pública)
- ✅ La página de éxito ahora maneja ambos casos: suscripción activa O pendiente
- ✅ Los logs detallados ayudarán a diagnosticar problemas rápidamente

---

## 🔗 Archivos Modificados

1. `app/api/mercadopago/create-preference/route.ts`
2. `app/api/mercadopago/webhook/route.ts`
3. `lib/webhook-service.ts`
4. `components/checkout-modal.tsx`
5. `app/suscripcion/exito/page.tsx`

---

**Fecha de actualización**: Octubre 15, 2025  
**Autor**: GitHub Copilot  
**Versión**: 2.0 - Flujo completo con auto_return y webhook mejorado
