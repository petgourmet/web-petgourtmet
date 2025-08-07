# Plan de Pruebas Completo - Sistema de Órdenes y Suscripciones

## 📋 Objetivo
Verificar que todo el flujo de datos funciona correctamente desde los webhooks de MercadoPago hasta las interfaces de usuario, asegurando que:

1. **Usuarios** ven sus compras y suscripciones en `/perfil`
2. **Administradores** ven todas las órdenes y suscripciones en `/admin`
3. **Webhooks** actualizan estados en tiempo real
4. **Base de datos** guarda información correctamente
5. **Estados** son reactivos a cambios de webhooks

## 🧪 Plan de Pruebas por Módulo

### 1. Pruebas de Webhooks

#### 1.1 Verificar Endpoint de Webhook
```bash
# Verificar que el webhook esté activo
curl http://localhost:3000/api/mercadopago/webhook
```

#### 1.2 Simular Webhook de Pago
```bash
# Crear orden de prueba primero
# Luego simular webhook de pago aprobado
node scripts/test-webhook.js
```

#### 1.3 Verificar Estados de Pago
- ✅ `pending` → `approved`
- ✅ `approved` → `paid`
- ✅ `paid` → `refunded`
- ✅ `cancelled`

### 2. Pruebas de Base de Datos

#### 2.1 Verificar Tablas Principales
```sql
-- Verificar estructura de órdenes
SELECT * FROM orders LIMIT 5;

-- Verificar estructura de suscripciones
SELECT * FROM user_subscriptions LIMIT 5;

-- Verificar historial de facturación
SELECT * FROM subscription_billing_history LIMIT 5;

-- Verificar productos de órdenes
SELECT * FROM order_items LIMIT 5;
```

#### 2.2 Verificar Relaciones
```sql
-- Órdenes con sus productos
SELECT o.id, o.status, o.payment_status, oi.product_name, oi.quantity
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
LIMIT 10;

-- Suscripciones con historial de pagos
SELECT us.id, us.status, us.plan_name, sbh.billing_date, sbh.amount
FROM user_subscriptions us
LEFT JOIN subscription_billing_history sbh ON us.id = sbh.subscription_id
LIMIT 10;
```

### 3. Pruebas de Interfaz de Usuario

#### 3.1 Página de Perfil (`/perfil`)

**Casos de Prueba:**
1. **Login como usuario con compras**
   - Verificar que aparezcan las órdenes del usuario
   - Verificar estados correctos (Pendiente, Procesando, Completado)
   - Verificar información de productos

2. **Login como usuario con suscripciones**
   - Verificar que aparezcan las suscripciones activas
   - Verificar próxima fecha de pago
   - Verificar historial de pagos

3. **Usuario sin compras/suscripciones**
   - Verificar mensaje de "No hay compras"
   - Verificar mensaje de "No hay suscripciones"

#### 3.2 Panel de Administración

**Órdenes (`/admin/orders`):**
1. **Visualización completa**
   - Verificar que aparezcan TODAS las órdenes
   - Verificar filtros por estado
   - Verificar búsqueda por cliente/email

2. **Detalles de orden (`/admin/orders/[id]`)**
   - Verificar información completa de la orden
   - Verificar botón "Verificar Estado" (si tiene MercadoPago ID)
   - Verificar botón "Actualizar" general
   - Verificar actualización de estados

**Suscripciones (`/admin/subscription-orders`):**
1. **Visualización completa**
   - Verificar que aparezcan TODAS las suscripciones
   - Verificar estados (Activa, Pausada, Cancelada)
   - Verificar próximas fechas de pago

2. **Funcionalidades administrativas**
   - Verificar validación de pagos con MercadoPago
   - Verificar actualización de estados
   - Verificar historial de facturación

### 4. Pruebas de Reactividad

#### 4.1 Cambios de Estado en Tiempo Real

**Escenario 1: Pago Aprobado**
1. Crear orden en estado "pending_payment"
2. Simular webhook de pago aprobado
3. Verificar que:
   - Estado en `/admin/orders` cambie a "confirmed"
   - Estado en `/perfil` del usuario cambie
   - Se envíe email de confirmación

**Escenario 2: Pago de Suscripción**
1. Crear suscripción activa
2. Simular webhook de pago de suscripción
3. Verificar que:
   - Se actualice `last_billing_date`
   - Se cree registro en `subscription_billing_history`
   - Se actualice próxima fecha de pago

**Escenario 3: Cancelación**
1. Simular webhook de cancelación
2. Verificar que:
   - Estado cambie a "cancelled"
   - Se actualice en todas las interfaces
   - Se envíe email de cancelación

### 5. Pruebas de Integridad de Datos

#### 5.1 Verificar Consistencia
```sql
-- Órdenes sin productos (no debería haber)
SELECT o.id FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE oi.id IS NULL;

-- Suscripciones sin usuario (no debería haber)
SELECT us.id FROM user_subscriptions us
LEFT JOIN auth.users u ON us.user_id = u.id
WHERE u.id IS NULL;

-- Pagos sin orden/suscripción asociada
SELECT sbh.id FROM subscription_billing_history sbh
LEFT JOIN user_subscriptions us ON sbh.subscription_id = us.id
WHERE us.id IS NULL;
```

#### 5.2 Verificar Campos Requeridos
```sql
-- Órdenes con campos faltantes
SELECT id, customer_email, total_amount, status
FROM orders
WHERE customer_email IS NULL OR total_amount IS NULL OR status IS NULL;

-- Suscripciones con campos faltantes
SELECT id, user_id, plan_name, status
FROM user_subscriptions
WHERE user_id IS NULL OR plan_name IS NULL OR status IS NULL;
```

## 🚀 Script de Pruebas Automatizadas

### Crear Script de Pruebas
```javascript
// scripts/test-complete-flow.js
const { execSync } = require('child_process')
const fetch = require('node-fetch')

async function runCompleteTests() {
  console.log('🚀 Iniciando pruebas completas del sistema')
  
  // 1. Verificar webhook
  console.log('\n1. Verificando webhook...')
  const webhookStatus = await fetch('http://localhost:3000/api/mercadopago/webhook')
  console.log('✅ Webhook status:', webhookStatus.status)
  
  // 2. Verificar páginas principales
  console.log('\n2. Verificando páginas...')
  const pages = [
    'http://localhost:3000/perfil',
    'http://localhost:3000/admin/orders',
    'http://localhost:3000/admin/subscription-orders'
  ]
  
  for (const page of pages) {
    try {
      const response = await fetch(page)
      console.log(`✅ ${page}: ${response.status}`)
    } catch (error) {
      console.log(`❌ ${page}: Error`)
    }
  }
  
  // 3. Simular webhook de prueba
  console.log('\n3. Simulando webhook...')
  // Aquí iría la lógica de simulación
  
  console.log('\n🎉 Pruebas completadas')
}

runCompleteTests()
```

## 📊 Checklist de Verificación

### ✅ Webhooks
- [ ] Endpoint `/api/mercadopago/webhook` responde 200
- [ ] Procesa pagos de órdenes correctamente
- [ ] Procesa pagos de suscripciones correctamente
- [ ] Maneja errores elegantemente (órdenes inexistentes)
- [ ] Actualiza estados en base de datos
- [ ] Envía emails de confirmación

### ✅ Base de Datos
- [ ] Tabla `orders` tiene datos consistentes
- [ ] Tabla `order_items` está relacionada correctamente
- [ ] Tabla `user_subscriptions` tiene datos válidos
- [ ] Tabla `subscription_billing_history` se actualiza
- [ ] Relaciones entre tablas son correctas
- [ ] No hay datos huérfanos

### ✅ Interfaz de Usuario
- [ ] `/perfil` muestra compras del usuario logueado
- [ ] `/perfil` muestra suscripciones del usuario logueado
- [ ] `/admin/orders` muestra TODAS las órdenes
- [ ] `/admin/orders/[id]` muestra detalles completos
- [ ] `/admin/subscription-orders` muestra TODAS las suscripciones
- [ ] Botones de actualización funcionan
- [ ] Estados se actualizan en tiempo real

### ✅ Reactividad
- [ ] Cambios de webhook se reflejan en admin
- [ ] Cambios de webhook se reflejan en perfil de usuario
- [ ] Estados son consistentes entre interfaces
- [ ] Actualizaciones son inmediatas

### ✅ Integridad
- [ ] Productos están asociados a órdenes
- [ ] Suscripciones están asociadas a usuarios
- [ ] Pagos están asociados a órdenes/suscripciones
- [ ] No hay inconsistencias en estados
- [ ] Emails se envían correctamente

## 🔧 Comandos de Verificación Rápida

```bash
# Verificar servidor corriendo
curl http://localhost:3000/api/health

# Verificar webhook
curl http://localhost:3000/api/mercadopago/webhook

# Verificar páginas principales
curl -I http://localhost:3000/perfil
curl -I http://localhost:3000/admin/orders
curl -I http://localhost:3000/admin/subscription-orders

# Ejecutar pruebas de webhook
node scripts/test-webhook.js

# Verificar logs del servidor
# (revisar terminal donde corre npm run dev)
```

## 📝 Notas Importantes

1. **Autenticación**: Asegurarse de estar logueado como usuario y como admin
2. **Datos de Prueba**: Crear órdenes y suscripciones de prueba si es necesario
3. **Estados**: Verificar todos los estados posibles (pending, approved, cancelled, etc.)
4. **Emails**: Verificar que se envíen a las direcciones correctas
5. **Logs**: Revisar logs del servidor para errores

---

**Fecha de creación**: $(date)
**Estado**: 📋 Pendiente de ejecución
**Responsable**: Equipo de desarrollo