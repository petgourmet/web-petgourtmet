# ✅ Validación Completa de GTM - Compras y Suscripciones

## 📊 Resumen de Implementación

Ambas páginas de éxito (compras y suscripciones) ahora tienen tracking completo de Google Tag Manager:

### **1. Página de Gracias por tu Compra** (`/gracias-por-tu-compra`)
- ✅ Evento `purchase` implementado
- ✅ Data Layer inicializado con `orderID`
- ✅ Variables de producto agregadas
- ✅ Tracking de items con categoría, precio, cantidad
- ✅ Google Analytics tracking
- ✅ Facebook Pixel tracking

### **2. Página de Éxito de Suscripción** (`/suscripcion/exito`)
- ✅ Evento `purchase` implementado (suscripción = compra recurrente)
- ✅ Data Layer inicializado con `session_id`
- ✅ Variables de producto agregadas
- ✅ Tracking con categoría "Suscripción"
- ✅ Cálculo correcto de precios con descuentos
- ✅ Google Analytics tracking
- ✅ Facebook Pixel tracking

---

## 🧪 Validación en Tag Assistant

### **Preparación**
1. Abre Tag Assistant: https://tagassistant.google.com/
2. Conecta a tu dominio: `http://localhost:3000` o `https://petgourmet.mx`
3. Mantén abierta la ventana de Tag Assistant

---

## 📦 Prueba 1: Compra Única

### **Pasos:**

1. **Navega a productos**
   ```
   http://localhost:3000/productos
   ```

2. **Ver detalle de producto**
   - Haz clic en "Ver detalles"
   - Verifica en consola: `📊 Product data pushed to Data Layer`

3. **Agregar al carrito**
   - Selecciona cantidad
   - Haz clic en "Añadir al carrito"

4. **Ir a checkout**
   - Abre carrito
   - Clic en "Proceder al Pago"

5. **Completar pago**
   - Llena el formulario
   - Usa tarjeta de prueba: `4242 4242 4242 4242`
   - Completa el pago

6. **Página de confirmación**
   - URL: `/gracias-por-tu-compra?session_id=XXX`
   - **AQUÍ SE DISPARA EL EVENTO PURCHASE** 🎯

### **Verificar en Tag Assistant:**

✅ **Evento: `purchase`**
```javascript
{
  event: "purchase",
  ecommerce: {
    transaction_id: "123",
    value: "319.00",
    currency: "MXN",
    shipping: "0.00",
    items: [
      {
        item_name: "Pastel de cumpleaños...",
        item_id: "91",
        price: "319.00",
        item_brand: "PET GOURMET",
        item_category: "Para Celebrar",
        quantity: 1
      }
    ]
  }
}
```

### **Verificar en Consola:**

```javascript
// Ver evento purchase
console.table(dataLayer.filter(e => e.event === 'purchase'))

// Ver detalles completos
const purchase = dataLayer.filter(e => e.event === 'purchase').slice(-1)[0]
console.log('📦 Purchase:', JSON.stringify(purchase, null, 2))
```

**Logs esperados:**
```
🔵 [GTM] Iniciando proceso de tracking de compra
🔵 [GTM] Datos de orden recibidos: {...}
🔵 [GTM] Primer item para Data Layer: {...}
🔵 [GTM] Disparando evento purchase con todos los items: 1
✅ [GTM] Purchase event pushed to Data Layer
📊 [GTM] Transaction ID: 123
💰 [GTM] Total: 319.00
🛒 [GTM] Items count: 1
✅ [GTM] Google Tag Manager detectado y activo
```

---

## 🔄 Prueba 2: Suscripción

### **Pasos:**

1. **Navega a productos**
   ```
   http://localhost:3000/productos
   ```

2. **Ver detalle de producto con suscripción**
   - Haz clic en "Ver detalles"
   - Verifica que el producto tenga `subscription_available = true`

3. **Seleccionar "Repetir compra"**
   - Haz clic en "Repetir compra"
   - Selecciona frecuencia (Mensual, Trimestral, etc.)
   - Verás el descuento aplicado

4. **Agregar al carrito**
   - Haz clic en "Añadir al carrito"
   - Verifica que indique "Suscripción"

5. **Ir a checkout y completar**
   - Mismo flujo que compra única
   - Tarjeta de prueba: `4242 4242 4242 4242`

6. **Página de éxito de suscripción**
   - URL: `/suscripcion/exito?session_id=XXX`
   - **AQUÍ SE DISPARA EL EVENTO PURCHASE** 🎯

### **Verificar en Tag Assistant:**

✅ **Evento: `purchase`** (suscripción se trackea como purchase)
```javascript
{
  event: "purchase",
  ecommerce: {
    transaction_id: "cs_test_xxxxx",
    value: "271.15",  // Precio con descuento
    currency: "MXN",
    shipping: "0.00",
    items: [
      {
        item_name: "Pastel de cumpleaños...",
        item_id: "456",
        price: "271.15",
        item_brand: "PET GOURMET",
        item_category: "Suscripción",
        item_category2: "Mensual",  // Tipo de suscripción
        quantity: 1,
        item_variant: "500g"
      }
    ]
  }
}
```

### **Verificar en Consola:**

```javascript
// Ver evento purchase de suscripción
console.table(dataLayer.filter(e => e.event === 'purchase'))

// Ver detalles completos
const purchase = dataLayer.filter(e => e.event === 'purchase').slice(-1)[0]
console.log('📦 Subscription Purchase:', JSON.stringify(purchase, null, 2))

// Verificar categoría
console.log('Categoría:', purchase?.ecommerce?.items[0]?.item_category)  // "Suscripción"
console.log('Subcategoría:', purchase?.ecommerce?.items[0]?.item_category2)  // "Mensual", etc.
```

**Logs esperados:**
```
🔵 [GTM] Iniciando tracking de suscripción
🟢 [GTM] Tracking de suscripción completado
📊 [GTM] Data Layer: [...]
✅ [GTM] Purchase event pushed to Data Layer
```

---

## 🔍 Comandos de Validación Completa

### **Para ejecutar en la consola de ambas páginas:**

```javascript
// ========================================
// VERIFICACIÓN BÁSICA
// ========================================

// 1. Verificar que GTM esté cargado
console.log('GTM Loaded:', typeof google_tag_manager !== 'undefined' ? '✅' : '❌')

// 2. Verificar que dataLayer existe
console.log('dataLayer exists:', typeof dataLayer !== 'undefined' ? '✅' : '❌')

// 3. Ver todos los eventos
console.table(dataLayer)

// ========================================
// VERIFICACIÓN DEL EVENTO PURCHASE
// ========================================

// 4. Filtrar solo eventos purchase
const purchases = dataLayer.filter(e => e.event === 'purchase')
console.log('Total purchases:', purchases.length)
console.table(purchases)

// 5. Ver el último evento purchase
const lastPurchase = purchases.slice(-1)[0]
console.log('Último Purchase:', lastPurchase)

// 6. Ver estructura completa en JSON
console.log(JSON.stringify(lastPurchase, null, 2))

// ========================================
// VERIFICACIÓN DE DATOS
// ========================================

// 7. Verificar transaction_id
console.log('Transaction ID:', lastPurchase?.ecommerce?.transaction_id)

// 8. Verificar total
console.log('Total:', lastPurchase?.ecommerce?.value)

// 9. Verificar items
console.table(lastPurchase?.ecommerce?.items)

// 10. Verificar primer item
const firstItem = lastPurchase?.ecommerce?.items[0]
console.log('Primer Item:', {
  name: firstItem?.item_name,
  id: firstItem?.item_id,
  price: firstItem?.price,
  category: firstItem?.item_category,
  subcategory: firstItem?.item_category2,
  quantity: firstItem?.quantity
})

// ========================================
// VERIFICACIÓN ESPECÍFICA DE SUSCRIPCIONES
// ========================================

// 11. Verificar si es suscripción
const isSubscription = firstItem?.item_category === 'Suscripción'
console.log('Es Suscripción:', isSubscription ? '✅' : '❌')

// 12. Ver tipo de suscripción
if (isSubscription) {
  console.log('Tipo:', firstItem?.item_category2)
}

// ========================================
// VERIFICACIÓN DE VARIABLES DE PRODUCTO
// ========================================

// 13. Ver variables de producto en dataLayer
const productVars = dataLayer.filter(e => e.productName || e.productCategory)
console.log('Variables de Producto:', productVars.length)
console.table(productVars)

// ========================================
// VERIFICACIÓN DE PAGE VIEW
// ========================================

// 14. Ver eventos page_view
const pageViews = dataLayer.filter(e => e.event === 'page_view')
console.log('Page Views:', pageViews.length)
console.table(pageViews)
```

---

## 📊 Resultados Esperados

### **Compra Única:**
```javascript
// Evento Purchase
{
  event: "purchase",
  ecommerce: {
    transaction_id: "123",
    value: "319.00",
    currency: "MXN",
    items: [{
      item_name: "Producto X",
      item_category: "Para Celebrar",  // Categoría del producto
      item_brand: "PET GOURMET",
      price: "319.00",
      quantity: 1
    }]
  }
}
```

### **Suscripción:**
```javascript
// Evento Purchase (Suscripción)
{
  event: "purchase",
  ecommerce: {
    transaction_id: "cs_test_xxxxx",
    value: "271.15",
    currency: "MXN",
    items: [{
      item_name: "Producto X",
      item_category: "Suscripción",     // Identifica como suscripción
      item_category2: "Mensual",        // Tipo de suscripción
      item_brand: "PET GOURMET",
      price: "271.15",
      quantity: 1
    }]
  }
}
```

---

## 📋 Checklist de Validación

### **Para Compras Únicas:**
- [ ] ✅ Evento `purchase` aparece en Tag Assistant
- [ ] ✅ `transaction_id` está presente
- [ ] ✅ `value` corresponde al total
- [ ] ✅ `items` contiene los productos
- [ ] ✅ `item_category` muestra la categoría del producto
- [ ] ✅ No hay errores en consola
- [ ] ✅ Logs de confirmación en consola

### **Para Suscripciones:**
- [ ] ✅ Evento `purchase` aparece en Tag Assistant
- [ ] ✅ `transaction_id` es el `session_id` de Stripe
- [ ] ✅ `value` incluye precio con descuento
- [ ] ✅ `items` contiene la suscripción
- [ ] ✅ `item_category` = "Suscripción"
- [ ] ✅ `item_category2` muestra tipo (Mensual, etc.)
- [ ] ✅ No hay errores en consola
- [ ] ✅ Logs de confirmación en consola

---

## 🎯 Diferencias Clave Entre Compras y Suscripciones

| Campo | Compra Única | Suscripción |
|-------|--------------|-------------|
| `event` | `purchase` | `purchase` |
| `transaction_id` | Order ID de DB | Stripe `session_id` |
| `item_category` | Categoría del producto | "Suscripción" |
| `item_category2` | - | Tipo de suscripción |
| `affiliation` | "PetGourmet Online Store" | "PetGourmet Suscripciones" |
| `value` | Precio normal | Precio con descuento |

---

## 🔗 En Tag Assistant

### **Vista esperada:**

```
📊 Tag Assistant Recording

✅ Container: GTM-WMCL7Z6H (Loaded)

Events Timeline:
├─ page_view (/)
├─ page_view (/productos)  
├─ view_item (/producto/[slug])
│  └─ Variables: productName, productPrice, productCategory
├─ page_view (/checkout)
├─ page_view (/gracias-por-tu-compra)  [COMPRA]
│  └─ purchase ⭐
│     └─ Tags Fired:
│        • Google Analytics: GA4 Event
│        • Data: transaction_id, value, items
└─ page_view (/suscripcion/exito)  [SUSCRIPCIÓN]
   └─ purchase ⭐
      └─ Tags Fired:
         • Google Analytics: GA4 Event
         • Data: transaction_id, value, items (category="Suscripción")
```

---

## 🆘 Troubleshooting

### **Problema: No se dispara el evento purchase**
**Solución:**
1. Verifica que llegaste a la página correcta (`/gracias-por-tu-compra` o `/suscripcion/exito`)
2. Revisa la consola en busca de errores
3. Verifica que haya `session_id` en la URL

### **Problema: Evento sin datos**
**Solución:**
1. Verifica que el webhook de Stripe esté funcionando
2. Revisa que la orden se guardó en la base de datos
3. Verifica los logs de la API `/api/stripe/order-details`

### **Problema: Tag Assistant no muestra el evento**
**Solución:**
1. Reconecta Tag Assistant antes de hacer la compra
2. Mantén abierta la ventana de Tag Assistant
3. Refresca Tag Assistant después de llegar a la página de éxito

---

## 📞 Soporte

Si encuentras problemas:

1. **Copia los logs de la consola**
2. **Copia el contenido del dataLayer:**
   ```javascript
   copy(JSON.stringify(dataLayer, null, 2))
   ```
3. **Toma screenshot de Tag Assistant**
4. **Comparte el `session_id` de la URL**

---

## ✅ Conclusión

Ambas páginas están completamente configuradas para tracking de GTM:

- ✅ **Compras**: Trackea compras únicas con categoría de producto
- ✅ **Suscripciones**: Trackea suscripciones con categoría especial y tipo
- ✅ **Data Layer**: Correctamente inicializado en ambas
- ✅ **Variables**: Todas las variables necesarias están presentes
- ✅ **Eventos**: Formato correcto para GA4 Enhanced Ecommerce

**¡Todo está listo para análisis y remarketing en Google Analytics y Google Ads!** 🎉
