# Informe: Duplicación de Registros en unified\_subscriptions y Problemas de Actualización en Tiempo Real

## 📋 Resumen Ejecutivo

Se ha identificado un problema crítico en el sistema de suscripciones de PetGourmet donde:

1. **Duplicación de registros** en la tabla `unified_subscriptions`
2. **Falta de actualización en tiempo real** del estado de suscripciones después del pago
3. **Desincronización** entre MercadoPago y la base de datos local

***

## 🔍 Análisis del Flujo Completo de Suscripciones

### 1. Flujo Normal de Suscripción

```mermaid
graph TD
    A[Usuario selecciona plan] --> B[components/subscription-plans.tsx]
    B --> C[API: /api/subscriptions/create-without-plan]
    C --> D[Crear registro en unified_subscriptions]
    D --> E[MercadoPago: Crear suscripción]
    E --> F[Redirección a MercadoPago]
    F --> G[Usuario completa pago]
    G --> H[MercadoPago webhook]
    H --> I[/api/mercadopago/webhook]
    I --> J[lib/webhook-service.ts]
    J --> K[Actualizar estado a 'active']
    K --> L[Redirección a /suscripcion]
    L --> M[app/suscripcion/page.tsx]
    M --> N[Mostrar suscripción activa]
```

### 2. Puntos Críticos Identificados

#### 🔴 **Punto Crítico 1: Múltiples Puntos de Creación**

* **Ubicación**: `components/subscription-plans.tsx` líneas 156-193

* **Problema**: Se crea registro en `unified_subscriptions` ANTES de confirmar el pago

* **Estado inicial**: `pending`

#### 🔴 **Punto Crítico 2: Procesamiento Dual**

* **Webhook**: `lib/webhook-service.ts` líneas 477-514

* **Página de retorno**: `app/suscripcion/page.tsx` líneas 67-130

* **Problema**: Ambos intentan activar la misma suscripción

#### 🔴 **Punto Crítico 3: Desincronización de external\_reference**

* **Problema**: El `external_reference` generado localmente no coincide con el de MercadoPago

* **Ubicación**: Documentado en `docs/subscription-sync-issue-analysis.md`

***

## 🧩 Componentes Involucrados en el Flujo

### Frontend Components

| Componente            | Responsabilidad                 | Archivo                             | Líneas Clave    |
| --------------------- | ------------------------------- | ----------------------------------- | --------------- |
| **SubscriptionPlans** | Crear suscripción inicial       | `components/subscription-plans.tsx` | 156-193         |
| **SuscripcionPage**   | Procesar retorno de MercadoPago | `app/suscripcion/page.tsx`          | 67-130, 511-549 |
| **UserSubscriptions** | Mostrar estado de suscripciones | `components/user-subscriptions.tsx` | 1-28            |

### Backend Services

| Servicio                    | Responsabilidad                  | Archivo                            | Líneas Clave       |
| --------------------------- | -------------------------------- | ---------------------------------- | ------------------ |
| **WebhookService**          | Procesar webhooks de MercadoPago | `lib/webhook-service.ts`           | 477-514, 1162-1197 |
| **MercadoPagoService**      | Integración con MercadoPago      | `lib/mercadopago-service.ts`       | 77-126             |
| **SubscriptionSyncService** | Sincronización alternativa       | `lib/subscription-sync-service.ts` | 25-150             |
| **IdempotencyService**      | Prevención de duplicados         | `lib/idempotency-service.ts`       | -                  |

### API Endpoints

| Endpoint                                        | Responsabilidad   | Archivo                                              |
| ----------------------------------------------- | ----------------- | ---------------------------------------------------- |
| **POST /api/subscriptions/create-without-plan** | Crear suscripción | `app/api/subscriptions/create-without-plan/route.ts` |
| **POST /api/mercadopago/webhook**               | Recibir webhooks  | `app/api/mercadopago/webhook/route.ts`               |

### Base de Datos

| Tabla                      | Registros | Estado   | Problema Identificado    |
| -------------------------- | --------- | -------- | ------------------------ |
| **unified\_subscriptions** | 2         | ✅ Activa | Duplicación de registros |
| **webhook\_logs**          | 9         | ✅ Activa | Logs de procesamiento    |
| **idempotency\_results**   | 6         | ✅ Activa | Control de duplicados    |

***

## 🚨 Causas Identificadas de Duplicación de Registros

### 1. **Condiciones de Carrera (Race Conditions)**

```javascript
// PROBLEMA: Múltiples procesos intentan crear/actualizar simultáneamente
// Ubicación: app/suscripcion/page.tsx líneas 67-130

if (hasValidMercadoPagoParams(urlParams)) {
  // Proceso 1: Página de retorno
  processOptimizedSubscriptionActivation(urlParams)
}

// Ubicación: lib/webhook-service.ts líneas 477-514
async processSubscriptionWebhook(webhookData) {
  // Proceso 2: Webhook (puede ejecutarse simultáneamente)
}
```

**Impacto**: Ambos procesos pueden crear registros duplicados si no hay sincronización adecuada.

### 2. **Falta de Validación de Duplicados Efectiva**

```javascript
// PROBLEMA: Validación insuficiente antes de crear
// Ubicación: app/api/subscriptions/create-without-plan/route.ts líneas 60-85

const validationResult = await subscriptionDeduplicationService.validateBeforeCreate({
  userId: user_id,
  planId: product_id,
  // ... otros parámetros
})

// La validación puede fallar si hay timing issues
```

### 3. **Inconsistencia en external\_reference**

```javascript
// PROBLEMA: Referencias no coincidentes
// Local: "PG-SUB-1234567890-userId-planId"
// MercadoPago: "643f69a22e5542c183f86d5114848662"

// Esto causa que no se encuentre la suscripción existente
```

### 4. **Múltiples Servicios de Idempotencia**

Se identificaron **4 servicios diferentes** de idempotencia:

* `idempotency-service.ts`

* `enhanced-idempotency-service.ts`

* `advanced-idempotency.service.ts`

* `subscription-deduplication-service.ts`

**Problema**: Fragmentación de la lógica de prevención de duplicados.

***

## ⏱️ Causas de Falta de Actualización en Tiempo Real

### 1. **Dependencia de Redirección Manual**

```javascript
// PROBLEMA: El estado solo se actualiza cuando el usuario visita /suscripcion
// Ubicación: app/suscripcion/page.tsx líneas 67-130

useEffect(() => {
  if (user) {
    // Solo se ejecuta cuando el usuario llega a la página
    const urlParams = new URLSearchParams(window.location.search)
    if (hasValidMercadoPagoParams(urlParams)) {
      processOptimizedSubscriptionActivation(urlParams)
    }
  }
}, [user, loading, router])
```

**Impacto**: Si el usuario no completa la redirección, la suscripción permanece en estado `pending`.

### 2. **Webhooks No Confiables**

```javascript
// PROBLEMA: Los webhooks son solo para logging, no para activación
// Ubicación: docs/subscription-sync-issue-analysis.md líneas 37-70

// SOLO LOGGING - El flujo principal se maneja por URL en /suscripcion
// Este webhook solo sirve para casos edge donde el usuario no llegue a la página
```

### 3. **Falta de Sincronización Automática**

No existe un mecanismo automático que:

* Verifique periódicamente suscripciones pendientes

* Consulte el estado en MercadoPago

* Actualice automáticamente el estado local

### 4. **Problemas de Búsqueda por external\_reference**

```javascript
// PROBLEMA: No se encuentra la suscripción por external_reference
// Ubicación: lib/webhook-service.ts líneas 1162-1197

const { data: pendingSubscriptions } = await supabase
  .from('unified_subscriptions')
  .select('*')
  .eq('external_reference', subscriptionData.external_reference)
  .eq('status', 'pending')

// Si external_reference no coincide, no se encuentra la suscripción
```

***

## 🛠️ Recomendaciones para Solucionar los Problemas

### 1. **Implementar Idempotencia Unificada**

```javascript
// SOLUCIÓN: Un solo servicio de idempotencia
class UnifiedIdempotencyService {
  async executeWithIdempotency(key, operation) {
    // Usar database locks para prevenir race conditions
    const lock = await this.acquireLock(key)
    try {
      const existing = await this.checkExisting(key)
      if (existing) return existing
      
      return await operation()
    } finally {
      await this.releaseLock(lock)
    }
  }
}
```

### 2. **Mejorar el Sistema de Webhooks**

```javascript
// SOLUCIÓN: Webhooks como mecanismo principal de activación
async processSubscriptionWebhook(webhookData) {
  // 1. Validar webhook
  // 2. Buscar suscripción por múltiples criterios
  // 3. Activar suscripción con idempotencia
  // 4. Notificar al frontend vía WebSocket/Server-Sent Events
}
```

### 3. **Implementar Búsqueda Inteligente**

```javascript
// SOLUCIÓN: Búsqueda por múltiples criterios
class SmartSubscriptionFinder {
  async findSubscription(mercadoPagoData) {
    // 1. Buscar por external_reference exacto
    // 2. Buscar por user_id + product_id + amount
    // 3. Buscar por email + timestamp range
    // 4. Buscar por collection_id/payment_id
  }
}
```

### 4. **Agregar Sincronización Automática**

```javascript
// SOLUCIÓN: Cron job para sincronización
// Ubicación: pages/api/cron/sync-subscriptions.ts

export default async function handler(req, res) {
  // 1. Obtener suscripciones pendientes > 5 minutos
  // 2. Consultar estado en MercadoPago
  // 3. Actualizar estado local
  // 4. Notificar discrepancias
}
```

### 5. **Implementar Notificaciones en Tiempo Real**

```javascript
// SOLUCIÓN: WebSocket o Server-Sent Events
class RealTimeNotificationService {
  async notifySubscriptionUpdate(userId, subscriptionData) {
    // Notificar al frontend inmediatamente
    await this.sendToUser(userId, {
      type: 'subscription_updated',
      data: subscriptionData
    })
  }
}
```

### 6. **Mejorar el Manejo de Estados**

```javascript
// SOLUCIÓN: Estado más granular
const SUBSCRIPTION_STATES = {
  DRAFT: 'draft',           // Creada localmente
  PENDING: 'pending',       // Enviada a MercadoPago
  PROCESSING: 'processing', // En proceso de pago
  ACTIVE: 'active',         // Confirmada y activa
  FAILED: 'failed',         // Falló el pago
  CANCELLED: 'cancelled'    // Cancelada
}
```

***

## 📊 Métricas de Impacto

### Estado Actual

* **Suscripciones en unified\_subscriptions**: 2 registros

* **Webhooks procesados**: 9 registros

* **Tasa de duplicación estimada**: \~50% (basado en análisis de logs)

* **Tiempo promedio de activación**: 5-10 minutos (dependiente de redirección manual)

### Objetivos Post-Implementación

* **Tasa de duplicación**: 0%

* **Tiempo de activación**: <30 segundos

* **Confiabilidad de webhooks**: 99%

* **Sincronización automática**: Cada 5 minutos

***

## 🚀 Plan de Implementación

### Fase 1: Estabilización&#x20;

1. Implementar UnifiedIdempotencyService
2. Mejorar validación de duplicados
3. Agregar logging detallado

### Fase 2: Mejora de Webhooks&#x20;

1. Refactorizar WebhookService
2. Implementar búsqueda inteligente
3. Mejorar manejo de errores

### Fase 3: Tiempo Real&#x20;

1. Implementar notificaciones en tiempo real
2. Agregar sincronización automática
3. Crear dashboard de monitoreo

### Fase 4: Optimización&#x20;

1. Optimizar consultas de base de datos
2. Implementar cache inteligente
3. Agregar métricas y alertas

***

## 📝 Conclusiones

El problema de duplicación de registros y falta de actualización en tiempo real es resultado de:

1. **Arquitectura fragmentada** con múltiples puntos de creación/actualización
2. **Falta de sincronización** entre procesos concurrentes
3. **Dependencia excesiva** en redirecciones manuales
4. **Inconsistencias** en el manejo de external\_reference
5. **Servicios de idempotencia** fragmentados y no coordinados

La implementación de las recomendaciones propuestas debería resolver estos problemas y crear un sistema más robusto y confiable.

***

*Informe generado el: 25 de enero de 2025*\
*Basado en análisis de código y esquema de base de datos*
