# 🔄 Sistema de Sincronización Automática - Suscripciones y MercadoPago

## 📋 Descripción General

Hemos implementado un **sistema bidireccional de sincronización** entre nuestra base de datos y MercadoPago para mantener siempre actualizado el estado de suscripciones y pagos.

## 🎯 Estrategia de Sincronización

### 1. **Webhooks (Push) - MercadoPago → Nuestra DB**
Cuando MercadoPago detecta un cambio (pago aprobado, suscripción cancelada, etc.), nos envía un webhook y actualizamos automáticamente la base de datos.

**Ventajas**:
- ✅ Inmediato (segundos después del evento)
- ✅ Eficiente (solo cuando hay cambios)
- ✅ No requiere polling constante

**Limitaciones**:
- ⚠️ Puede fallar si el webhook no llega
- ⚠️ Requiere URL pública (no funciona en localhost sin ngrok)
- ⚠️ Puede haber delay de segundos/minutos

### 2. **Sincronización Activa (Pull) - Nuestra DB → MercadoPago**
Cuando un usuario consulta sus suscripciones, verificamos activamente el estado en MercadoPago y actualizamos si hay diferencias.

**Ventajas**:
- ✅ Garantiza datos actualizados al momento de consultar
- ✅ Funciona incluso si fallan los webhooks
- ✅ El usuario siempre ve información correcta

**Limitaciones**:
- ⚠️ Requiere llamadas a API de MercadoPago
- ⚠️ Solo actualiza cuando el usuario consulta

## 🛠️ Componentes Implementados

### 1. API Endpoint de Sincronización

**Archivo**: `app/api/subscriptions/sync/route.ts`

**Endpoints**:
- `GET /api/subscriptions/sync?user_id=xxx` - Sincroniza todas las suscripciones de un usuario
- `POST /api/subscriptions/sync` - Sincroniza una suscripción específica

**Funcionamiento**:
1. Obtiene todas las suscripciones activas del usuario
2. Para cada suscripción con `mercadopago_subscription_id`:
   - Consulta el estado actual en MercadoPago
   - Compara con el estado local
   - Actualiza si hay diferencias

**Ejemplo de uso**:
```javascript
const response = await fetch(`/api/subscriptions/sync?user_id=${userId}`)
const result = await response.json()
// {
//   success: true,
//   synced: 2,
//   total: 3,
//   errors: []
// }
```

---

### 2. Hook de React para Sincronización Automática

**Archivo**: `hooks/use-subscription-sync.ts`

**Uso**:
```typescript
import { useSubscriptionSync } from '@/hooks/use-subscription-sync'

function MyComponent() {
  const { syncing, lastSync, syncNow } = useSubscriptionSync(userId, true)
  
  // syncing: boolean - true mientras se sincroniza
  // lastSync: Date | null - última vez que se sincronizó
  // syncNow: () => Promise<void> - función para sincronizar manualmente
}
```

**Características**:
- ✅ Sincronización automática al montar el componente
- ✅ Sincronización periódica cada 5 minutos
- ✅ Función para sincronizar manualmente (`syncNow()`)
- ✅ Estados de carga y error

---

### 3. Integración en Página de Perfil

**Archivo**: `app/perfil/page.tsx`

**Cambios**:
```typescript
// Importar el hook
import { useSubscriptionSync } from '@/hooks/use-subscription-sync'

// En el componente
const { syncing: syncingSubscriptions, lastSync, syncNow } = useSubscriptionSync(user?.id, true)
```

**Resultado**:
- ✅ Cuando un usuario entra a su perfil, se sincronizan automáticamente sus suscripciones
- ✅ Cada 5 minutos se vuelve a sincronizar mientras esté en la página
- ✅ El usuario siempre ve el estado real de sus suscripciones

---

### 4. Servicio de Sincronización (Ya existía)

**Archivo**: `lib/mercadopago-sync-service.ts`

**Métodos utilizados**:
- `syncSubscription(subscription)` - Sincroniza una suscripción individual
- `getSubscriptionFromMercadoPago(subscriptionId)` - Obtiene datos de MercadoPago
- `syncAllPendingSubscriptions()` - Sincroniza todas las suscripciones pendientes
- `syncStaleSubscriptions()` - Sincroniza suscripciones desactualizadas

---

## 🔄 Flujo Completo de Sincronización

### Escenario 1: Usuario realiza un pago de suscripción

1. **Usuario completa pago** en MercadoPago
2. **Webhook recibido** (si configurado correctamente):
   - `🔔 WEBHOOK RECIBIDO DE MERCADOPAGO`
   - `💳 Procesando webhook de pago`
   - `🎯 ACTIVANDO FLUJO DE SUSCRIPCIÓN`
   - `✅ Suscripción activada exitosamente`
3. **Si webhook falla o tarda**:
   - Usuario entra a `/perfil`
   - Hook `useSubscriptionSync` ejecuta sincronización
   - Sistema detecta que el pago fue aprobado en MercadoPago
   - Actualiza `status = 'active'` en la base de datos

### Escenario 2: Usuario cancela suscripción en MercadoPago

1. **Usuario cancela** en el panel de MercadoPago
2. **Webhook recibido**:
   - MercadoPago envía `subscription_preapproval` con `action: 'cancelled'`
   - Sistema actualiza `status = 'cancelled'` en DB
3. **Si webhook falla**:
   - Usuario entra a `/perfil`
   - Sistema consulta estado en MercadoPago
   - Detecta `status: 'cancelled'`
   - Actualiza DB automáticamente

### Escenario 3: Usuario consulta sus suscripciones

1. **Usuario abre** `/perfil`
2. **Hook se ejecuta**:
   ```
   🔄 Sincronizando suscripciones para usuario: xxx
   🔍 Sincronizando suscripción 265 (MP: 2718057813-xxx)
   📊 Estado en MercadoPago: authorized vs Local: pending
   🔄 Cambio de estado detectado: pending → active
   ✅ Suscripción 265 actualizada: pending → active
   ✅ Sincronización completada: 1 actualizadas, 0 errores
   ```
3. **Usuario ve** datos actualizados inmediatamente

---

## 🎯 Páginas que Sincronizan Automáticamente

### ✅ Ya Implementado:
1. **`/perfil`** - Sincroniza al cargar y cada 5 minutos

### 📝 Pendientes de Implementar (Recomendado):
2. **`/suscripcion/exito`** - Página de éxito después del pago
3. **`/admin`** - Panel de administración (para ver todas las suscripciones)
4. **Componente `SubscriptionCard`** - Card individual de suscripción

### Cómo agregar sincronización a otras páginas:

```typescript
// En cualquier componente o página
import { useSubscriptionSync } from '@/hooks/use-subscription-sync'

function MiComponente() {
  const { user } = useClientAuth()
  
  // Sincronizar automáticamente
  const { syncing, lastSync, syncNow } = useSubscriptionSync(user?.id, true)
  
  return (
    <div>
      {syncing && <span>Sincronizando...</span>}
      {lastSync && <span>Última sincronización: {lastSync.toLocaleString()}</span>}
      <button onClick={syncNow}>Sincronizar ahora</button>
    </div>
  )
}
```

---

## 📊 Campos de Sincronización

Al sincronizar, actualizamos estos campos:

```typescript
{
  status: 'active' | 'pending' | 'paused' | 'cancelled' | 'expired',
  updated_at: timestamp,
  last_sync_at: timestamp,
  next_payment_date: fecha,
  cancelled_at: timestamp (si fue cancelada),
  paused_at: timestamp (si fue pausada)
}
```

---

## 🔍 Monitoreo y Debugging

### Logs de Sincronización:

```bash
# Inicio de sincronización
🔄 Solicitud de sincronización para usuario: xxx

# Por cada suscripción
🔍 Sincronizando suscripción 265 (MP: xxx)
📊 Estado en MercadoPago: authorized vs Local: pending

# Cambios detectados
🔄 Cambio de estado detectado: pending → active
✅ Suscripción 265 actualizada: pending → active

# Resultado final
✅ Sincronización completada: 2 actualizadas, 0 errores
```

### Verificar sincronización en DB:

```sql
SELECT 
  id,
  status,
  mercadopago_subscription_id,
  last_sync_at,
  updated_at
FROM unified_subscriptions
WHERE user_id = 'xxx'
ORDER BY last_sync_at DESC;
```

---

## ⚙️ Configuración

### Variables de entorno requeridas:

```env
# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx
MERCADOPAGO_ACCESS_TOKEN_TEST=APP_USR-xxx (para sandbox)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Frecuencia de sincronización:

Configurable en `hooks/use-subscription-sync.ts`:

```typescript
// Cambiar de 5 minutos a otro intervalo
syncIntervalRef.current = setInterval(() => {
  syncNow()
}, 5 * 60 * 1000) // 5 minutos en milisegundos
```

---

## 🚀 Próximos Pasos

1. **Implementar sincronización en `/suscripcion/exito`**:
   - Así el usuario ve el estado actualizado inmediatamente después del pago
   
2. **Agregar indicador visual de sincronización**:
   - Mostrar spinner o badge cuando esté sincronizando
   - Mostrar timestamp de última sincronización
   
3. **Implementar botón de sincronización manual**:
   - Permitir al usuario forzar sincronización si lo necesita
   
4. **Job periódico de sincronización** (opcional):
   - Cron job que sincronice todas las suscripciones activas cada hora
   - Útil para detectar cambios que no llegaron por webhook

---

## 🎯 Resumen

| Aspecto | Implementación |
|---------|----------------|
| **Webhooks** | ✅ Configurados y funcionando |
| **API Endpoint** | ✅ `/api/subscriptions/sync` |
| **Hook de React** | ✅ `useSubscriptionSync` |
| **Página de Perfil** | ✅ Integrado |
| **Sincronización automática** | ✅ Al cargar y cada 5 min |
| **Sincronización manual** | ✅ Función `syncNow()` |
| **Logging** | ✅ Detallado para debugging |

---

**Fecha**: Octubre 15, 2025  
**Estado**: ✅ Implementado y funcional  
**Pendiente**: Agregar a más páginas según necesidad
