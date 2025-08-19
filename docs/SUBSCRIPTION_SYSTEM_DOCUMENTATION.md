# 📋 Documentación del Sistema de Suscripciones - PetGourmet

## 🎯 Propósito de este Documento

Este documento detalla el funcionamiento completo del sistema de suscripciones para evitar validaciones erróneas y facilitar el debugging futuro.

---

## 🏗️ Arquitectura del Sistema

### 📊 Tablas de Base de Datos

#### 1. `pending_subscriptions`
**Propósito:** Almacena suscripciones recién creadas que esperan procesamiento de MercadoPago

```sql
CREATE TABLE pending_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_type VARCHAR(50) NOT NULL, -- 'weekly', 'monthly', etc.
  status VARCHAR(50) DEFAULT 'pending',
  external_reference VARCHAR(255),
  customer_data JSONB,
  cart_items JSONB, -- Array de productos
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP NULL,
  mercadopago_subscription_id VARCHAR(255) NULL,
  notes TEXT NULL
);
```

#### 2. `user_subscriptions`
**Propósito:** Almacena suscripciones activas procesadas por MercadoPago

```sql
CREATE TABLE user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'active', 'cancelled', 'paused'
  subscription_type VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  size VARCHAR(50),
  next_billing_date TIMESTAMP,
  last_billing_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  cancelled_at TIMESTAMP NULL,
  mercadopago_subscription_id VARCHAR(255),
  external_reference VARCHAR(255),
  is_active BOOLEAN DEFAULT true -- ⚠️ CRÍTICO: Esta columna debe existir
);
```

**🚨 IMPORTANTE:** La columna `is_active` es CRÍTICA para el funcionamiento. Si no existe, las consultas fallarán.

---

## 🔄 Flujo de Estados de Suscripción

### 📈 Ciclo de Vida Completo

```
1. CREACIÓN
   ├── Usuario crea suscripción en /suscripcion
   ├── Se guarda en pending_subscriptions (status: 'pending')
   └── Se redirige a MercadoPago

2. PROCESAMIENTO
   ├── MercadoPago procesa la suscripción
   ├── Envía webhook subscription_preapproval
   ├── Sistema mueve de pending_subscriptions → user_subscriptions
   └── Estado cambia a 'active'

3. PAGOS RECURRENTES
   ├── MercadoPago cobra automáticamente
   ├── Envía webhook subscription_authorized_payment
   ├── Se registra en subscription_billing_history
   └── Se actualiza next_billing_date

4. FINALIZACIÓN
   ├── Usuario cancela o sistema pausa
   ├── Estado cambia a 'cancelled' o 'paused'
   └── is_active = false
```

### 🏷️ Estados Válidos

| Estado | Tabla | Descripción | is_active |
|--------|-------|-------------|----------|
| `pending` | pending_subscriptions | Esperando procesamiento | N/A |
| `active` | user_subscriptions | Suscripción funcionando | `true` |
| `cancelled` | user_subscriptions | Cancelada por usuario/sistema | `false` |
| `paused` | user_subscriptions | Pausada temporalmente | `false` |
| `inactive` | user_subscriptions | Inactiva por falta de pago | `false` |

---

## 🔍 Función fetchOptimizedSubscriptions

### 📋 Propósito
Obtiene y combina suscripciones de ambas tablas para mostrar un estado completo al usuario.

### 🔧 Lógica de Funcionamiento

```typescript
// 1. CONSULTAS PARALELAS
const [userSubscriptionsResult, pendingSubscriptionsResult] = await Promise.all([
  // Suscripciones activas
  supabase.from('user_subscriptions')
    .select('*, products(*)')
    .eq('user_id', userId) // Si userId es null, obtiene todas
    .not('mercadopago_subscription_id', 'is', null)
    .eq('is_active', true), // ⚠️ REQUIERE columna is_active
  
  // Suscripciones pendientes
  supabase.from('pending_subscriptions')
    .select('*')
    .eq('user_id', userId) // Si userId es null, obtiene todas
    .eq('status', 'pending')
]);

// 2. FILTRADO DE PENDIENTES VÁLIDAS
// Solo suscripciones creadas en los últimos 30 minutos
const validPendingSubscriptions = pendingSubscriptions.filter(sub => {
  const createdAt = new Date(sub.created_at);
  const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
  return diffMinutes <= 30;
});

// 3. PARSING DE CART_ITEMS
// Maneja múltiples formatos: string JSON, array, objeto
const processedPendingSubscriptions = validPendingSubscriptions.map(sub => {
  let cartItems = [];
  if (typeof sub.cart_items === 'string') {
    cartItems = JSON.parse(sub.cart_items);
  } else if (Array.isArray(sub.cart_items)) {
    cartItems = sub.cart_items;
  } else if (sub.cart_items && typeof sub.cart_items === 'object') {
    cartItems = [sub.cart_items];
  }
  
  return {
    id: `pending_${sub.id}`,
    status: 'pending',
    source: 'pending_subscriptions',
    // ... otros campos
  };
});

// 4. COMBINACIÓN FINAL
return [...processedActiveSubscriptions, ...processedPendingSubscriptions];
```

---

## 🔔 Sistema de Webhooks

### 📡 Endpoint Principal
**URL:** `/api/mercadopago/webhook`
**Método:** `POST`

### 🎯 Tipos de Webhook Manejados

#### 1. `subscription_preapproval`
**Propósito:** Activar suscripción pendiente

```javascript
// Flujo:
1. Buscar en pending_subscriptions por external_reference
2. Crear registro en user_subscriptions
3. Marcar pending_subscription como 'completed'
4. Activar tiempo real para actualizar UI
```

#### 2. `subscription_authorized_payment`
**Propósito:** Registrar pago recurrente

```javascript
// Flujo:
1. Registrar en subscription_billing_history
2. Actualizar next_billing_date en user_subscriptions
3. Enviar notificación de pago exitoso
```

### 🔐 Validación de Webhooks

```javascript
// En desarrollo: Validación omitida
if (process.env.NODE_ENV === 'development') {
  console.log('⚠️ Modo desarrollo - omitiendo validación de firma');
}

// En producción: Validación requerida
if (process.env.NODE_ENV === 'production') {
  const isValidSignature = webhookService.validateWebhookSignature(rawBody, signature);
  if (!isValidSignature) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  }
}
```

---

## ⚡ Sistema de Tiempo Real

### 🔄 Canales de Supabase

#### Para Usuarios (`/perfil`)
```javascript
// Canal de suscripciones de usuario
supabase.channel('user_subscriptions_realtime')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'user_subscriptions',
    filter: `user_id=eq.${user.id}`
  }, (payload) => {
    fetchSubscriptions(); // Recargar automáticamente
  })
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'pending_subscriptions',
    filter: `user_id=eq.${user.id}`
  }, (payload) => {
    fetchSubscriptions(); // Recargar automáticamente
  });
```

#### Para Administradores (`/admin/subscription-orders`)
```javascript
// Canal global de suscripciones
supabase.channel('admin_subscriptions_realtime')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'user_subscriptions'
  }, (payload) => {
    invalidateSubscriptionsCache();
    fetchAllSubscriptions();
  });
```

---

## 🎨 Interfaz de Usuario

### 📱 Páginas Principales

#### 1. `/perfil` - Vista de Usuario
- **Muestra:** Suscripciones del usuario actual
- **Incluye:** Pendientes + Activas + Canceladas
- **Tiempo Real:** Sí
- **Validador:** Modo usuario

#### 2. `/admin/subscription-orders` - Vista Administrativa
- **Muestra:** Todas las suscripciones del sistema
- **Incluye:** Pendientes + Activas + Canceladas (todos los usuarios)
- **Tiempo Real:** Sí
- **Validador:** Modo administrador

### 🏷️ Estados Visuales

| Estado | Color | Icono | Descripción |
|--------|-------|-------|-------------|
| `pending` | 🟡 Amarillo | ⏳ Clock | Esperando procesamiento |
| `active` | 🟢 Verde | ✅ CheckCircle | Funcionando correctamente |
| `cancelled` | 🔴 Rojo | ❌ XCircle | Cancelada |
| `paused` | 🟠 Naranja | ⏸️ Pause | Pausada temporalmente |
| `inactive` | ⚫ Gris | 💤 Sleep | Inactiva |

---

## 🛠️ Troubleshooting

### ❌ Problemas Comunes

#### 1. "Las suscripciones pendientes no aparecen"

**Posibles Causas:**
- ✅ Suscripciones más antiguas de 30 minutos
- ✅ Error en parsing de cart_items
- ✅ Problemas de caché
- ✅ Canales de tiempo real desconectados

**Solución:**
```javascript
// Verificar en consola del navegador:
console.log('🔍 Debug suscripciones pendientes');

// 1. Verificar datos en base
const { data } = await supabase
  .from('pending_subscriptions')
  .select('*')
  .eq('status', 'pending');
console.log('Pendientes en DB:', data);

// 2. Verificar edad de suscripciones
data.forEach(sub => {
  const age = (Date.now() - new Date(sub.created_at).getTime()) / (1000 * 60);
  console.log(`Suscripción ${sub.id}: ${age.toFixed(1)} minutos`);
});

// 3. Invalidar caché
invalidateSubscriptionsCache();
```

#### 2. "Error: column is_active does not exist"

**Causa:** Falta columna `is_active` en `user_subscriptions`

**Solución:** Ejecutar migración SQL:
```sql
-- Agregar columna is_active
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Actualizar valores existentes
UPDATE user_subscriptions 
SET is_active = CASE 
  WHEN status = 'active' THEN true
  WHEN status = 'cancelled' THEN false
  WHEN status = 'paused' THEN false
  WHEN status = 'inactive' THEN false
  ELSE true
END;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_is_active 
ON user_subscriptions(is_active);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_active 
ON user_subscriptions(user_id, is_active);
```

#### 3. "Webhooks no están funcionando"

**Verificaciones:**
```javascript
// 1. Verificar endpoint
GET /api/mercadopago/webhook
// Debe responder: {"status":"active",...}

// 2. Verificar variables de entorno
console.log({
  hasToken: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
  hasSecret: !!process.env.MERCADOPAGO_WEBHOOK_SECRET,
  environment: process.env.NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT
});

// 3. Verificar logs del servidor
// Buscar: "🔔 Webhook recibido de MercadoPago"
```

#### 4. "Tiempo real no funciona"

**Verificaciones:**
```javascript
// En consola del navegador:
// 1. Verificar estado de conexión
console.log('Realtime status:', realtimeStatus);

// 2. Verificar canales activos
console.log('Channels:', {
  orders: window.userOrdersRealtimeChannel?.state,
  subscriptions: window.userSubscriptionsRealtimeChannel?.state,
  profile: window.userProfileRealtimeChannel?.state
});

// 3. Forzar reconexión
cleanupRealtimeSubscriptions();
setupRealtimeSubscriptions();
```

---

## 🔧 Configuración de Entorno

### 📋 Variables Requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx (producción) / TEST-xxx (sandbox)
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-xxx (producción) / TEST-xxx (sandbox)
NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT=production / sandbox
MERCADOPAGO_WEBHOOK_SECRET=tu_secreto_personalizado
```

### 🔍 Validación de Configuración

```javascript
// Script de validación
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'MERCADOPAGO_ACCESS_TOKEN',
  'NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY'
];

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Variable faltante: ${varName}`);
  } else {
    console.log(`✅ ${varName}: Configurada`);
  }
});
```

---

## 📊 Monitoreo y Métricas

### 🔍 Consultas de Diagnóstico

```sql
-- 1. Estado general de suscripciones
SELECT 
  'pending_subscriptions' as tabla,
  status,
  COUNT(*) as cantidad
FROM pending_subscriptions 
GROUP BY status
UNION ALL
SELECT 
  'user_subscriptions' as tabla,
  status,
  COUNT(*) as cantidad
FROM user_subscriptions 
GROUP BY status;

-- 2. Suscripciones pendientes por antigüedad
SELECT 
  id,
  user_id,
  subscription_type,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutos_antiguedad,
  CASE 
    WHEN EXTRACT(EPOCH FROM (NOW() - created_at))/60 <= 30 THEN 'VÁLIDA'
    ELSE 'EXPIRADA'
  END as estado_validez
FROM pending_subscriptions 
WHERE status = 'pending'
ORDER BY created_at DESC;

-- 3. Suscripciones sin is_active (problema común)
SELECT 
  COUNT(*) as total_subscriptions,
  COUNT(is_active) as with_is_active,
  COUNT(*) - COUNT(is_active) as missing_is_active
FROM user_subscriptions;
```

### 📈 KPIs Importantes

| Métrica | Consulta | Valor Esperado |
|---------|----------|----------------|
| Pendientes válidas | `pending_subscriptions` < 30 min | < 10 |
| Tasa de conversión | `pending → active` | > 80% |
| Webhooks fallidos | Logs de error | < 5% |
| Tiempo real activo | Estado de canales | 100% |

---

## 🚀 Deployment y Producción

### ✅ Checklist Pre-Deploy

- [ ] Todas las variables de entorno configuradas
- [ ] Columna `is_active` existe en `user_subscriptions`
- [ ] Webhooks de MercadoPago configurados
- [ ] RLS (Row Level Security) habilitado
- [ ] Índices de base de datos creados
- [ ] Build de Next.js exitoso
- [ ] Tests de integración pasando

### 🔄 Proceso de Deploy

1. **Backup de Base de Datos**
2. **Ejecutar Migraciones**
3. **Deploy de Aplicación**
4. **Verificar Webhooks**
5. **Monitorear Logs**
6. **Validar Funcionalidad**

---

## 📞 Contacto y Soporte

### 🆘 En Caso de Problemas

1. **Revisar este documento**
2. **Verificar logs del servidor**
3. **Ejecutar scripts de diagnóstico**
4. **Revisar configuración de entorno**
5. **Contactar al equipo de desarrollo**

### 📚 Recursos Adicionales

- [Documentación de MercadoPago](https://www.mercadopago.com.mx/developers/)
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Next.js](https://nextjs.org/docs)

---

## 📝 Historial de Cambios

| Fecha | Versión | Cambios |
|-------|---------|----------|
| 2025-08-19 | 1.0 | Documentación inicial completa |

---

**🎯 Objetivo:** Este documento debe ser la fuente única de verdad para el sistema de suscripciones. Mantenerlo actualizado es crucial para evitar validaciones erróneas y facilitar el mantenimiento futuro.