# 🚚 FIX: Costo de Envío en Suscripciones

**Fecha**: 6 de octubre de 2025  
**Prioridad**: ALTA  
**Tipo**: Bug Fix - Cálculo de Precios

---

## 🐛 PROBLEMA IDENTIFICADO

### Descripción
Las suscripciones se estaban creando **sin incluir el costo de envío** en el `transaction_amount`, lo que causaba:

- ❌ Cobro incorrecto al cliente (menor al esperado)
- ❌ Pérdida de ingresos por envío no facturado
- ❌ Inconsistencia entre precio mostrado y precio cobrado

### Ejemplo del Problema

**Caso 1: Pedido < $1000 (debe incluir envío)**
```typescript
// ❌ ANTES (INCORRECTO)
basePrice: $40.50
discount: 10%
discountedPrice: $36.45
quantity: 1
transaction_amount: $36.45  // ⚠️ FALTA ENVÍO DE $100

// ✅ CORRECTO
subtotal: $36.45
shipping: $100.00
transaction_amount: $136.45  // ✅ Incluye envío
```

**Caso 2: Pedido >= $1000 (envío gratis)**
```typescript
// ✅ CORRECTO (ya funcionaba)
subtotal: $1,200.00
shipping: $0.00  // Gratis
transaction_amount: $1,200.00
```

---

## 🎯 REGLA DE NEGOCIO

### Política de Envío
```
SI subtotal >= $1000 MXN
  ENTONCES shipping = $0 (ENVÍO GRATIS)
SINO
  shipping = $100 MXN
```

### Aplicación
- ✅ **Compras únicas**: Ya aplicaba correctamente
- ❌ **Suscripciones**: NO aplicaba → **CORREGIDO**

---

## ✅ SOLUCIÓN IMPLEMENTADA

### Cambios en `components/checkout-modal.tsx`

#### 1. Cálculo de Transaction Amount (Línea ~760)

**ANTES**:
```typescript
const discount = getProductSubscriptionDiscount(subscriptionItem, subscriptionType)
const basePrice = subscriptionItem.price
const discountPercentage = discount * 100
const discountedPrice = basePrice * (1 - discount)
const transactionAmount = discountedPrice * subscriptionItem.quantity  // ❌ Sin envío
```

**DESPUÉS**:
```typescript
const discount = getProductSubscriptionDiscount(subscriptionItem, subscriptionType)
const basePrice = subscriptionItem.price
const discountPercentage = discount * 100
const discountedPrice = basePrice * (1 - discount)
const subtotal = discountedPrice * subscriptionItem.quantity

// 🚚 IMPORTANTE: Calcular costo de envío (gratis si subtotal >= $1000)
const shippingCost = subtotal >= 1000 ? 0 : 100
const transactionAmount = subtotal + shippingCost  // ✅ Incluye envío

logger.info(LogCategory.SUBSCRIPTION, 'Cálculo de precio de suscripción', {
  basePrice,
  discount: discountPercentage,
  discountedPrice,
  quantity: subscriptionItem.quantity,
  subtotal,
  shippingCost,
  transactionAmount,
  freeShipping: shippingCost === 0
})
```

#### 2. Metadata con Información de Envío (Línea ~860)

**AÑADIDO**:
```typescript
metadata: {
  // ... campos existentes ...
  subtotal: subtotal,
  shipping_cost: shippingCost,
  free_shipping: shippingCost === 0,
  total_amount: transactionAmount,
  // ... resto de campos ...
}
```

---

## 📊 IMPACTO

### Escenarios Afectados

| Escenario | Subtotal | Envío Antes | Envío Ahora | Diferencia |
|-----------|----------|-------------|-------------|------------|
| Suscripción < $1000 | $36.45 | $0 ❌ | $100 ✅ | +$100 |
| Suscripción < $1000 | $500.00 | $0 ❌ | $100 ✅ | +$100 |
| Suscripción >= $1000 | $1,200 | $0 ✅ | $0 ✅ | $0 |

### Suscripciones Existentes

**Suscripciones creadas ANTES de este fix**:
- ❌ NO incluyen costo de envío
- ⚠️ Se pueden identificar en metadata: `"shipping_cost"` ausente
- 📋 Acción recomendada: Revisar y ajustar manualmente si es necesario

**Suscripciones creadas DESPUÉS de este fix**:
- ✅ Incluyen costo de envío correctamente
- ✅ Metadata completo con desglose de costos
- ✅ Logs detallados del cálculo

---

## 🔍 VALIDACIÓN

### Query para Identificar Suscripciones Sin Envío

```sql
-- Buscar suscripciones creadas sin incluir envío
SELECT 
  id,
  external_reference,
  transaction_amount,
  metadata->>'subtotal' as subtotal,
  metadata->>'shipping_cost' as shipping_cost,
  metadata->>'free_shipping' as free_shipping,
  created_at,
  status
FROM unified_subscriptions
WHERE 
  status IN ('active', 'pending')
  AND (
    metadata->>'shipping_cost' IS NULL  -- Suscripciones sin info de envío
    OR (
      CAST(metadata->>'subtotal' AS NUMERIC) < 1000  -- Subtotal < $1000
      AND CAST(metadata->>'shipping_cost' AS NUMERIC) = 0  -- Pero envío = $0
    )
  )
ORDER BY created_at DESC;
```

### Pruebas Recomendadas

1. **Caso 1: Producto de $40.50 con 10% descuento**
   ```
   Precio base: $40.50
   Descuento: 10%
   Precio con descuento: $36.45
   Cantidad: 1
   Subtotal: $36.45
   Envío: $100.00 (< $1000)
   Total esperado: $136.45 ✅
   ```

2. **Caso 2: Producto de $300 con 15% descuento x4 unidades**
   ```
   Precio base: $300
   Descuento: 15%
   Precio con descuento: $255
   Cantidad: 4
   Subtotal: $1,020
   Envío: $0.00 (>= $1000)
   Total esperado: $1,020 ✅
   ```

3. **Caso 3: Producto de $200 con 5% descuento x4 unidades**
   ```
   Precio base: $200
   Descuento: 5%
   Precio con descuento: $190
   Cantidad: 4
   Subtotal: $760
   Envío: $100.00 (< $1000)
   Total esperado: $860 ✅
   ```

---

## 🎨 EJEMPLO DE LOG

### Antes (Sin Envío)
```json
{
  "basePrice": 40.5,
  "discount": 10,
  "discountedPrice": 36.45,
  "quantity": 1,
  "transactionAmount": 36.45  // ❌ Falta envío
}
```

### Después (Con Envío)
```json
{
  "basePrice": 40.5,
  "discount": 10,
  "discountedPrice": 36.45,
  "quantity": 1,
  "subtotal": 36.45,
  "shippingCost": 100,
  "transactionAmount": 136.45,  // ✅ Incluye envío
  "freeShipping": false
}
```

---

## 📝 METADATA EJEMPLO

### Suscripción Con Envío Incluido
```json
{
  "subscription_type": "weekly",
  "original_price": 40.5,
  "final_price": 36.45,
  "subtotal": 36.45,
  "shipping_cost": 100,
  "free_shipping": false,
  "total_amount": 136.45,
  "product_details": {
    "id": 73,
    "name": "Flan de Pollo",
    "image": "..."
  }
}
```

### Suscripción Con Envío Gratis
```json
{
  "subscription_type": "monthly",
  "original_price": 1500,
  "final_price": 1350,
  "subtotal": 1350,
  "shipping_cost": 0,
  "free_shipping": true,
  "total_amount": 1350,
  "product_details": {
    "id": 45,
    "name": "Pack Grande",
    "image": "..."
  }
}
```

---

## 🚨 ACCIÓN REQUERIDA

### Suscripciones Activas Sin Envío

Si existen suscripciones activas creadas antes de este fix:

1. **Identificar** usando el query SQL proporcionado
2. **Evaluar** si es necesario ajustar el precio
3. **Opciones**:
   - Mantener precio actual (absorber costo de envío)
   - Ajustar precio en próximo ciclo de facturación
   - Contactar al cliente para notificar ajuste

### Comunicación con Clientes

Si se decide ajustar precios de suscripciones existentes:

**Template de Email**:
```
Asunto: Actualización en tu Suscripción Pet Gourmet

Hola [Nombre],

Te informamos que hemos detectado un ajuste necesario en el costo de tu 
suscripción. El precio original no incluía el costo de envío correctamente.

Precio anterior: $36.45
Costo de envío: $100.00
Nuevo precio: $136.45

Este cambio aplicará a partir de tu próximo cobro programado el [fecha].

Si tienes dudas, contáctanos a soporte@petgourmet.mx

Gracias por tu preferencia,
Equipo Pet Gourmet
```

---

## ✅ CHECKLIST

- [x] Código actualizado con cálculo de envío
- [x] Metadata incluye desglose completo
- [x] Logs detallados del cálculo
- [x] Documentación creada
- [ ] Query ejecutado para identificar suscripciones afectadas
- [ ] Decisión tomada sobre suscripciones existentes
- [ ] Clientes notificados (si aplica)
- [ ] Pruebas ejecutadas en ambiente de producción
- [ ] Monitoreo de nuevas suscripciones (24h)

---

## 📚 REFERENCIAS

- **Archivo modificado**: `/components/checkout-modal.tsx`
- **Líneas afectadas**: ~760 (cálculo) y ~860 (metadata)
- **Política de envío**: Gratis >= $1000, $100 si < $1000
- **Log category**: `SUBSCRIPTION`

---

## 💡 MEJORAS FUTURAS

1. **Configuración dinámica de costo de envío**
   - Mover $100 y $1000 a variables de entorno
   - Permitir ajuste sin modificar código

2. **Zonas de envío**
   - Diferentes costos según ubicación
   - Integración con API de paquetería

3. **Promociones de envío**
   - Envío gratis por tiempo limitado
   - Envío gratis para suscripciones anuales

---

**Documento creado por**: GitHub Copilot  
**Validado por**: Análisis de código y reglas de negocio  
**Versión**: 1.0  
**Estado**: ✅ IMPLEMENTADO
