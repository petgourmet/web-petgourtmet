# Corrección de Error en Precios del Carrito de Compras

## 1. Problema Identificado

### 1.1 Descripción del Error
El carrito de compras está aplicando **doble descuento** a los productos de suscripción, causando que se muestren precios incorrectos (más bajos de lo esperado). Esto ocurre porque:

1. **Primera aplicación**: En `product-detail-modal.tsx`, la función `calculatePrice()` ya aplica el descuento de suscripción al precio antes de enviarlo al carrito
2. **Segunda aplicación**: En múltiples componentes del carrito se vuelve a aplicar el descuento del 10% sobre un precio que ya tiene descuento aplicado

### 1.2 Archivos Afectados
- `components/cart-modal.tsx` (línea 84)
- `components/checkout-modal.tsx` (línea 762)
- `components/cart-context.tsx` (línea 147)

## 2. Análisis Técnico

### 2.1 Flujo Actual (Incorrecto)
```
Precio Base: $100.00
↓
product-detail-modal.tsx: calculatePrice() aplica 10% descuento
Precio enviado al carrito: $90.00
↓
cart-modal.tsx: Aplica nuevamente 10% descuento
Precio mostrado: $81.00 (INCORRECTO)
```

### 2.2 Flujo Esperado (Correcto)
```
Precio Base: $100.00
↓
product-detail-modal.tsx: calculatePrice() aplica 10% descuento
Precio enviado al carrito: $90.00
↓
cart-modal.tsx: Muestra el precio tal como viene
Precio mostrado: $90.00 (CORRECTO)
```

## 3. Solución Técnica

### 3.1 Cambios Requeridos

#### Archivo: `components/cart-modal.tsx`
**Línea 84 - Cambio en visualización de precio:**
```typescript
// ANTES (Incorrecto - doble descuento)
${(item.isSubscription ? item.price * 0.9 : item.price).toFixed(2)} MXN

// DESPUÉS (Correcto - precio ya calculado)
${item.price.toFixed(2)} MXN
```

#### Archivo: `components/checkout-modal.tsx`
**Línea 762 - Cambio en cálculo de precio por item:**
```typescript
// ANTES (Incorrecto - doble descuento)
${((item.isSubscription ? item.price * 0.9 : item.price) * item.quantity).toFixed(2)} MXN

// DESPUÉS (Correcto - precio ya calculado)
${(item.price * item.quantity).toFixed(2)} MXN
```

#### Archivo: `components/cart-context.tsx`
**Línea 147 - Cambio en función calculateCartTotal:**
```typescript
// ANTES (Incorrecto - doble descuento)
const calculateCartTotal = () => {
  return cart.reduce((total, item) => {
    const itemPrice = item.isSubscription
      ? item.price * 0.9 // 10% de descuento para suscripciones
      : item.price
    return total + itemPrice * item.quantity
  }, 0)
}

// DESPUÉS (Correcto - precio ya calculado)
const calculateCartTotal = () => {
  return cart.reduce((total, item) => {
    return total + item.price * item.quantity
  }, 0)
}
```

### 3.2 Verificación del Flujo Correcto

El precio correcto ya se calcula en `product-detail-modal.tsx`:
```typescript
const calculatePrice = () => {
  const basePrice = selectedSize ? selectedSize.price : product.price || 0
  if (purchaseType === 'subscription' && selectedSubscriptionType) {
    const discount = getSubscriptionDiscount(selectedSubscriptionType)
    return basePrice * (1 - discount / 100)
  }
  return basePrice
}

// Este precio calculado se envía al carrito
onAddToCart({
  // ...
  price: calculatePrice(), // ← Precio ya con descuento aplicado
  // ...
})
```

## 4. Casos de Prueba

### 4.1 Producto de Compra Única
- **Precio base**: $100.00 MXN
- **Precio esperado en carrito**: $100.00 MXN
- **Verificar**: No se aplica descuento adicional

### 4.2 Producto de Suscripción (10% descuento)
- **Precio base**: $100.00 MXN
- **Precio esperado en carrito**: $90.00 MXN
- **Verificar**: Solo se aplica el descuento una vez

### 4.3 Múltiples Productos
- **Producto A (único)**: $50.00 MXN
- **Producto B (suscripción)**: $100.00 → $90.00 MXN
- **Total esperado**: $140.00 MXN

## 5. Impacto y Riesgos

### 5.1 Impacto Financiero
- **Riesgo**: Pérdida de ingresos por precios incorrectamente bajos
- **Beneficio**: Precios correctos según política de descuentos

### 5.2 Experiencia del Usuario
- **Problema actual**: Confusión por precios inconsistentes
- **Solución**: Precios claros y consistentes en toda la aplicación

## 6. Implementación

### 6.1 Orden de Cambios
1. Modificar `cart-context.tsx` (función calculateCartTotal)
2. Modificar `cart-modal.tsx` (visualización de precios)
3. Modificar `checkout-modal.tsx` (cálculo de totales)
4. Probar con productos de suscripción y compra única

### 6.2 Validación
- Verificar que los precios mostrados coincidan con los esperados
- Confirmar que el total del carrito sea correcto
- Probar flujo completo de compra

## 7. Recomendaciones Adicionales

### 7.1 Centralización de Lógica
Considerar crear una función utilitaria para el manejo consistente de precios:
```typescript
// utils/pricing.ts
export const formatPrice = (price: number): string => {
  return `$${price.toFixed(2)} MXN`
}

export const calculateItemTotal = (item: CartItem): number => {
  return item.price * item.quantity // Precio ya viene calculado
}
```

### 7.2 Documentación
- Documentar claramente que `item.price` ya incluye descuentos aplicados
- Agregar comentarios en el código para evitar futuros errores

### 7.3 Testing
- Implementar pruebas unitarias para cálculos de precios
- Agregar pruebas de integración para el flujo completo del carrito