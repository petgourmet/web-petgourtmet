# 🔄 Solución: Suscripciones Duplicadas

## 🐛 Problema

Las suscripciones aparecían duplicadas en el perfil del usuario porque:

1. **Stripe envía múltiples eventos** para cada pago de suscripción:
   - `checkout.session.completed` (creación inicial)
   - `invoice.created`
   - `invoice.finalized`
   - `invoice.paid`
   - `invoice.payment_succeeded`

2. **El webhook procesaba todos los eventos** sin verificar si la suscripción ya existía

3. **Cada renovación de pago** disparaba eventos adicionales

## ✅ Solución Implementada

### 1. **Prevenir Duplicados en el Webhook**

**Archivo:** `app/api/stripe/webhook/route.ts`

```typescript
} else if (session.mode === 'subscription') {
  const subscriptionId = session.subscription as string
  
  // ✅ NUEVO: Verificar si ya existe
  const { data: existingSubscription } = await supabaseAdmin
    .from('unified_subscriptions')
    .select('id, status')
    .eq('stripe_subscription_id', subscriptionId)
    .single()
  
  if (existingSubscription) {
    console.log('⚠️ Suscripción ya existe:', subscriptionId, '- Saltando creación')
    return // Ya fue procesada, no crear duplicado
  }
  
  // Continuar con la creación...
}
```

**Beneficios:**
- ✅ Evita crear suscripciones duplicadas
- ✅ Procesa solo el primer evento `checkout.session.completed`
- ✅ Ignora eventos posteriores de la misma suscripción

### 2. **Filtrar Duplicados en el Frontend**

**Archivo:** `app/perfil/page.tsx`

```typescript
const fetchSubscriptions = async () => {
  // Obtener todas las suscripciones
  const { data: subscriptionsData } = await supabase
    .from('unified_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // ✅ NUEVO: Eliminar duplicados (mantener solo la más reciente)
  const uniqueSubscriptions = (subscriptionsData || []).reduce((acc: any[], current: any) => {
    const existingIndex = acc.findIndex(
      (sub: any) => sub.stripe_subscription_id === current.stripe_subscription_id
    )
    
    if (existingIndex === -1) {
      acc.push(current) // Primera vez que vemos este stripe_subscription_id
    } else {
      // Ya existe, mantener la más reciente
      const existing = acc[existingIndex]
      const currentDate = new Date(current.created_at).getTime()
      const existingDate = new Date(existing.created_at).getTime()
      
      if (currentDate > existingDate) {
        acc[existingIndex] = current
      }
    }
    
    return acc
  }, [])

  setSubscriptions(uniqueSubscriptions)
}
```

**Beneficios:**
- ✅ Muestra solo una suscripción por cada `stripe_subscription_id`
- ✅ Mantiene siempre la más reciente
- ✅ Funciona incluso si ya hay duplicados en la DB

### 3. **Mejorar Manejo de Eventos**

**Archivo:** `app/api/stripe/webhook/route.ts`

```typescript
try {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object)
      break

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object)
      break

    // ✅ NUEVO: Ignorar eventos que no requieren acción
    case 'invoice.created':
    case 'invoice.finalized':
    case 'invoice.paid':
    case 'payment_intent.succeeded':
    case 'payment_intent.created':
    case 'charge.succeeded':
      console.log(`✅ Evento ${event.type} recibido (no requiere acción)`)
      break

    default:
      console.log(`ℹ️ Evento no manejado: ${event.type}`)
  }
} catch (handlerError) {
  console.error(`❌ Error manejando evento ${event.type}:`, handlerError)
  // No lanzar error para evitar reintentos de Stripe
}
```

**Beneficios:**
- ✅ Procesa solo los eventos necesarios
- ✅ Ignora silenciosamente eventos informativos
- ✅ Mejor logging para debugging

---

## 🗑️ Limpiar Datos Existentes

Si ya tienes suscripciones duplicadas en la base de datos:

### Opción 1: **Script SQL Automático**

Ejecuta el script: `docs/LIMPIAR-SUSCRIPCIONES-DUPLICADAS.sql`

```sql
-- Eliminar duplicados (mantener el más reciente)
WITH ranked_subscriptions AS (
  SELECT 
    id,
    stripe_subscription_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY stripe_subscription_id 
      ORDER BY created_at DESC
    ) as row_num
  FROM unified_subscriptions
  WHERE stripe_subscription_id IS NOT NULL
)
DELETE FROM unified_subscriptions
WHERE id IN (
  SELECT id 
  FROM ranked_subscriptions 
  WHERE row_num > 1
);
```

### Opción 2: **Supabase Dashboard**

1. Ve a Supabase Dashboard → SQL Editor
2. Copia y pega el script de `LIMPIAR-SUSCRIPCIONES-DUPLICADAS.sql`
3. Ejecuta cada sección paso a paso:
   - **PASO 1:** Ver duplicados actuales
   - **PASO 2:** Eliminar duplicados
   - **PASO 3:** Verificar resultados

---

## 🔍 Verificación

### En el Terminal (Stripe CLI):

```bash
# Deberías ver esto en los logs:
✅ Evento invoice.created recibido (no requiere acción)
✅ Evento invoice.finalized recibido (no requiere acción)
⚠️ Suscripción ya existe: sub_xxxxx - Saltando creación
```

### En el Perfil del Usuario:

1. Ve a `/perfil`
2. Click en "Suscripciones"
3. Deberías ver **solo 1 suscripción** por cada compra

### En Supabase:

```sql
-- Verificar que no hay duplicados
SELECT 
  stripe_subscription_id,
  COUNT(*) as total
FROM unified_subscriptions
WHERE stripe_subscription_id IS NOT NULL
GROUP BY stripe_subscription_id
HAVING COUNT(*) > 1;

-- Resultado esperado: 0 filas (sin duplicados)
```

---

## 📊 Flujo de Eventos de Stripe

### **Suscripción Nueva:**

```
1. checkout.session.completed  → ✅ Crea suscripción en DB
2. invoice.created             → ⏭️ Ignora (no requiere acción)
3. invoice.finalized           → ⏭️ Ignora (no requiere acción)
4. invoice.paid                → ⏭️ Ignora (no requiere acción)
5. invoice.payment_succeeded   → ✅ Actualiza last_payment_date
```

### **Renovación Mensual/Trimestral:**

```
1. invoice.created             → ⏭️ Ignora
2. invoice.finalized           → ⏭️ Ignora
3. invoice.paid                → ⏭️ Ignora
4. invoice.payment_succeeded   → ✅ Actualiza last_payment_date
```

**Resultado:** Solo 1 registro en `unified_subscriptions` por suscripción

---

## 🛡️ Prevención Futura (Opcional)

Para garantizar que nunca se creen duplicados, puedes agregar un índice único:

```sql
-- SOLO ejecutar después de limpiar duplicados existentes
CREATE UNIQUE INDEX unique_stripe_subscription_id 
ON unified_subscriptions(stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;
```

**⚠️ ADVERTENCIA:** Solo ejecuta esto después de eliminar todos los duplicados existentes, o fallará.

---

## 📝 Resumen de Cambios

| Archivo | Cambio | Propósito |
|---------|--------|-----------|
| `app/api/stripe/webhook/route.ts` | Verificar suscripción existente antes de crear | Prevenir duplicados en origen |
| `app/api/stripe/webhook/route.ts` | Ignorar eventos informativos | Reducir procesamiento innecesario |
| `app/perfil/page.tsx` | Filtrar duplicados en frontend | Mostrar solo suscripciones únicas |
| `docs/LIMPIAR-SUSCRIPCIONES-DUPLICADAS.sql` | Script de limpieza | Eliminar duplicados existentes |

---

## ✅ Checklist de Validación

- [ ] Webhook verifica suscripción existente antes de crear
- [ ] Eventos informativos se ignoran correctamente
- [ ] Frontend filtra duplicados
- [ ] Base de datos limpiada (sin duplicados)
- [ ] Perfil muestra solo 1 suscripción por stripe_subscription_id
- [ ] Logs del webhook muestran eventos ignorados
- [ ] Nueva compra crea solo 1 registro

---

## 🆘 Troubleshooting

### Problema: Aún veo duplicados en el perfil

**Solución:**
1. Ejecuta el script SQL de limpieza
2. Refresca la página del perfil
3. Verifica en Supabase que no hay duplicados

### Problema: El webhook sigue creando duplicados

**Solución:**
1. Verifica que el código actualizado esté desplegado
2. Revisa los logs del webhook en la consola
3. Busca el mensaje: "⚠️ Suscripción ya existe"

### Problema: Error en el webhook después del cambio

**Solución:**
1. Revisa los logs completos en la terminal
2. Verifica que `SUPABASE_SERVICE_ROLE_KEY` esté configurada
3. Verifica permisos de la tabla `unified_subscriptions`

---

## 📞 Soporte

Si encuentras problemas:

1. **Revisa los logs del webhook:**
   ```bash
   # En la terminal donde corre Stripe CLI
   # Busca mensajes de error o advertencia
   ```

2. **Verifica la base de datos:**
   ```sql
   SELECT * FROM unified_subscriptions 
   WHERE user_id = 'TU_USER_ID'
   ORDER BY created_at DESC;
   ```

3. **Comparte información:**
   - Logs del webhook
   - Captura de pantalla del perfil
   - ID de la suscripción de Stripe
