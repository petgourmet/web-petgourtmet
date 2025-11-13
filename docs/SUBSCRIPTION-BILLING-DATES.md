# Sistema de Fechas de Cobro de Suscripciones

## 📋 Descripción

Este sistema maneja automáticamente las fechas de cobro de suscripciones mediante webhooks de MercadoPago. Cada vez que se procesa un pago, se calcula y actualiza la próxima fecha de cobro.

## 🔄 Flujo de Funcionamiento

```
1. Cliente realiza pago → MercadoPago procesa
2. MercadoPago envía webhook → API recibe notificación
3. Sistema valida webhook → Procesa pago
4. Calcula próxima fecha → Actualiza BD
5. Usuario ve fecha actualizada → "Próximo cobro: DD/MM/YYYY"
```

## 📊 Base de Datos

### Tabla `subscription_payments`
Registra cada pago procesado:
- `id`: UUID único del registro
- `subscription_id`: Referencia a `unified_subscriptions`
- `mercadopago_payment_id`: ID del pago en MercadoPago
- `amount`: Monto del pago
- `status`: Estado ('approved', 'pending', 'rejected')
- `payment_date`: Fecha del pago
- `next_billing_date`: Próxima fecha calculada
- `transaction_details`: JSON con datos completos del webhook

### Campos en `unified_subscriptions`
- `next_billing_date`: Próxima fecha de cobro (actualizada con cada pago)
- `last_payment_date`: Fecha del último pago exitoso
- `total_payments_count`: Total de pagos procesados
- `total_amount_paid`: Suma total pagada

## 🔧 Componentes Clave

### 1. Webhook Handler
**Archivo**: `api/subscriptions/webhook/route.ts`

Recibe webhooks de MercadoPago y los procesa:
```typescript
POST /api/subscriptions/webhook
```

### 2. Payment Service
**Archivo**: `lib/services/subscription-payment-service.ts`

Servicio que maneja la lógica de pagos:
- `processPayment()`: Procesa un pago y calcula next_billing_date
- `calculateNextBillingDate()`: Calcula la próxima fecha según frecuencia
- `getPaymentHistory()`: Obtiene historial de pagos
- `isPaymentProcessed()`: Previene duplicados

### 3. UI Components
- `SubscriptionCard.tsx`: Muestra "Próximo cobro"
- `user-subscriptions.tsx`: Lista de suscripciones del usuario

## 📅 Cálculo de Fechas

El sistema calcula la próxima fecha basándose en:

### Opción 1: Frequency + Frequency Type
```typescript
if (frequency && frequency_type) {
  switch (frequency_type) {
    case 'days':    nextDate + frequency días
    case 'weeks':   nextDate + (frequency * 7) días
    case 'months':  nextDate + frequency meses
    case 'years':   nextDate + frequency años
  }
}
```

### Opción 2: Subscription Type (Fallback)
```typescript
switch (subscription_type) {
  case 'weekly':     +7 días
  case 'biweekly':   +14 días
  case 'monthly':    +1 mes
  case 'quarterly':  +3 meses
  case 'annual':     +1 año
}
```

## 🚀 Implementación

### 1. Ejecutar Migración
```bash
# Aplicar la migración a Supabase
psql -U postgres -d petgourmet -f supabase/migrations/20241106_add_subscription_payments.sql
```

O desde Supabase Dashboard:
1. Ir a SQL Editor
2. Copiar contenido de `20241106_add_subscription_payments.sql`
3. Ejecutar

### 2. Configurar Webhook en MercadoPago

1. Ir a https://www.mercadopago.com.mx/developers/panel/app
2. Seleccionar tu aplicación
3. Ir a "Webhooks"
4. Agregar URL: `https://tudominio.com/api/subscriptions/webhook`
5. Eventos a suscribir:
   - `subscription_authorized_payment`
   - `subscription_preapproval`
   - `payment`

### 3. Variables de Entorno

Asegurar que estén configuradas:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
MERCADOPAGO_ACCESS_TOKEN=your_mp_token
```

## 🧪 Pruebas

### Test Manual
1. Crear una suscripción de prueba
2. Simular webhook desde MercadoPago Dashboard
3. Verificar que `next_billing_date` se actualiza
4. Confirmar que aparece en la UI: "Próximo cobro: ..."

### Test con Logs
```bash
# Ver logs del webhook
tail -f logs/webhook.log

# O en terminal de desarrollo
npm run dev
# Enviar webhook test y ver console logs
```

## 📊 Monitoreo

### Verificar Estado
```sql
-- Ver suscripciones con próxima fecha
SELECT 
  id, 
  mercadopago_subscription_id,
  status,
  next_billing_date,
  last_payment_date,
  total_payments_count
FROM unified_subscriptions
WHERE status = 'active'
ORDER BY next_billing_date ASC;

-- Ver historial de pagos
SELECT 
  sp.*,
  us.user_id,
  us.status as subscription_status
FROM subscription_payments sp
JOIN unified_subscriptions us ON us.id = sp.subscription_id
ORDER BY sp.payment_date DESC
LIMIT 20;
```

## 🐛 Troubleshooting

### Problema: "Próximo cobro: No programado"

**Causas posibles:**
1. ❌ Webhook no está llegando
2. ❌ `next_billing_date` es NULL en BD
3. ❌ Fecha inválida en BD
4. ❌ Webhook falló al procesar

**Solución:**
```sql
-- 1. Verificar el campo
SELECT id, next_billing_date, last_payment_date 
FROM unified_subscriptions 
WHERE id = 'subscription_id';

-- 2. Si es NULL, calcular manualmente
UPDATE unified_subscriptions
SET next_billing_date = (
  CASE 
    WHEN subscription_type = 'monthly' THEN NOW() + INTERVAL '1 month'
    WHEN subscription_type = 'weekly' THEN NOW() + INTERVAL '1 week'
    ELSE NOW() + INTERVAL '1 month'
  END
)
WHERE id = 'subscription_id';
```

### Problema: Webhook no procesa

**Verificar:**
1. URL configurada correctamente en MercadoPago
2. Logs del servidor: `console.log` en webhook handler
3. Tabla `webhook_events` en BD para ver intentos
4. Respuesta HTTP del webhook (debe ser 200 OK)

## 📝 Notas Importantes

- ✅ El sistema previene duplicados verificando `mercadopago_payment_id`
- ✅ Todas las fechas usan validación segura (no más "Invalid time value")
- ✅ Los cálculos consideran timezone (ISO 8601)
- ✅ El historial de pagos se mantiene completo
- ✅ La UI muestra fallback amigable si falta la fecha

## 🔐 Seguridad

- Webhook valida firma de MercadoPago
- Solo procesa webhooks autenticados
- Service role key para operaciones de BD
- Logs detallados sin exponer datos sensibles

## 📈 Métricas

El sistema tracking automáticamente:
- Total de pagos procesados (`total_payments_count`)
- Monto total pagado (`total_amount_paid`)
- Historial completo en `subscription_payments`
- Logs de webhooks en `webhook_events`

---

**Última actualización**: Noviembre 6, 2025
**Autor**: Sistema de Suscripciones PetGourmet
