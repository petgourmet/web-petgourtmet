# Data Layer - Ejemplo de Implementación

## 🎯 Implementación Completada

El Data Layer ahora está completamente funcional en la página de confirmación de compra.

## 📊 Estructura del Data Layer

### 1. Inicialización en Thank You Page

```javascript
// Se ejecuta PRIMERO al cargar la página
dataLayer = [{
  'orderID': 'T_12345'
}];
```

### 2. Evento de Purchase

```javascript
dataLayer.push({
  'event': 'purchase',
  'ecommerce': {
    'transaction_id': 'T_12345',
    'affiliation': 'PetGourmet Online Store',
    'value': '519.00',
    'tax': '0.00',              // Opcional - solo si existe
    'shipping': '100.00',       // Opcional - solo si existe
    'currency': 'MXN',
    'coupon': 'MASCOTA',        // Opcional - solo si existe
    'items': [
      {
        'item_name': 'Pastel de cumpleaños Clásico Carne',
        'item_id': 'SKU_12345',
        'price': '319.00',
        'item_brand': 'PET GOURMET',
        'item_category': 'Pasteles',
        'item_category2': 'Celebración',  // Opcional
        'item_variant': 'Grande',          // Opcional
        'quantity': 1
      },
      {
        'item_name': 'Snacks Naturales para Perro',
        'item_id': 'SKU_67890',
        'price': '200.00',
        'item_brand': 'PET GOURMET',
        'item_category': 'Snacks',
        'quantity': 1
      }
    ]
  }
});
```

## 🔧 Campos Implementados

### Obligatorios ✅
- `event`: 'purchase'
- `transaction_id`: ID único de la orden
- `value`: Valor total de la compra
- `currency`: 'MXN'
- `items[]`: Array de productos
  - `item_name`: Nombre del producto
  - `item_id`: SKU/ID del producto
  - `price`: Precio unitario
  - `quantity`: Cantidad
  - `item_brand`: Marca (default: 'PET GOURMET')
  - `item_category`: Categoría principal

### Opcionales (solo si existen) ⚡
- `affiliation`: Tienda/canal de venta
- `tax`: Impuestos
- `shipping`: Costo de envío
- `coupon`: Código de cupón aplicado
- `item_category2`: Subcategoría
- `item_variant`: Variante (tamaño, color, etc.)

## 📝 Ejemplo Real de Tu Sitio

```javascript
// Inicialización
dataLayer = [{
  'orderID': 'ORDER_2025110601234'
}];

// Después del pago exitoso
dataLayer.push({
  'event': 'purchase',
  'ecommerce': {
    'transaction_id': 'ORDER_2025110601234',
    'affiliation': 'PetGourmet Online Store',
    'value': '419.00',
    'shipping': '100.00',
    'currency': 'MXN',
    'items': [
      {
        'item_name': 'Pastel de Cumpleaños Clásico Carne',
        'item_id': 'PROD_123',
        'price': '319.00',
        'item_brand': 'PET GOURMET',
        'item_category': 'Pasteles',
        'item_category2': 'Celebración',
        'quantity': 1
      }
    ]
  }
});
```

## 🚀 ¿Cómo Funciona?

1. **Usuario completa el pago** en Stripe/MercadoPago
2. **Redirección** a `/gracias-por-tu-compra?session_id=...`
3. **Página carga** y obtiene detalles de la orden
4. **Primero** se ejecuta `initializeDataLayer(orderID)`
5. **Luego** se ejecuta `trackPurchase(orderData)` que:
   - Push al Data Layer con formato GA4
   - Push a Google Analytics (gtag)
   - Push a Facebook Pixel

## 🔍 Verificación en el Navegador

### Consola del Navegador
```javascript
// Ver el dataLayer completo
console.log(window.dataLayer)

// Ver último evento
console.log(window.dataLayer[window.dataLayer.length - 1])
```

### Google Tag Manager Preview
1. Activar modo Preview en GTM
2. Ir a la página de confirmación
3. Ver en el panel:
   - Variables → `orderID`
   - Tags → evento `purchase`
   - Data Layer → ver estructura completa

## 📌 Notas Importantes

- ✅ **Campos opcionales se omiten si no tienen valor** (no se envía vacío)
- ✅ **Precios siempre con 2 decimales** (.toFixed(2))
- ✅ **Currency siempre 'MXN'** para México
- ✅ **Brand default 'PET GOURMET'** si no se especifica
- ✅ **Console logs** para debugging (se pueden remover en producción)

## 🎯 Configuración en Google Tag Manager

### Trigger
- **Tipo**: Custom Event
- **Event name**: `purchase`
- **This trigger fires on**: All Custom Events

### Variables a Crear
1. **DL - Order ID**
   - Type: Data Layer Variable
   - Data Layer Variable Name: `orderID`

2. **DL - Transaction ID**
   - Type: Data Layer Variable
   - Data Layer Variable Name: `ecommerce.transaction_id`

3. **DL - Transaction Value**
   - Type: Data Layer Variable
   - Data Layer Variable Name: `ecommerce.value`

4. **DL - Items**
   - Type: Data Layer Variable
   - Data Layer Variable Name: `ecommerce.items`

### Tag GA4 - Purchase
- **Tag Type**: GA4 Event
- **Event Name**: `purchase`
- **Parameters**:
  - `transaction_id`: {{DL - Transaction ID}}
  - `value`: {{DL - Transaction Value}}
  - `currency`: MXN
  - `items`: {{DL - Items}}
- **Trigger**: purchase event

## ✅ Checklist de Implementación

- [x] Data Layer inicializado con orderID
- [x] Evento purchase con formato GA4
- [x] Campos obligatorios incluidos
- [x] Campos opcionales solo si existen
- [x] Integración con Facebook Pixel
- [x] Integración con Google Analytics
- [x] Console logs para debugging
- [x] Type safety con TypeScript
- [x] Documentación completa

---

**Status**: ✅ IMPLEMENTADO Y FUNCIONAL
**Última actualización**: Noviembre 11, 2025
