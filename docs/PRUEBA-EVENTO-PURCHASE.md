# 🧪 Guía de Prueba - Evento Purchase (Compra)

## ✅ Verificación Actual

Has confirmado que:
- ✅ GTM está cargado en el sitio
- ✅ Los eventos de visualización de producto funcionan
- ✅ El Data Layer recibe información correctamente

## 🎯 Objetivo: Verificar el Evento Purchase

El evento `purchase` se dispara cuando un usuario **completa una compra exitosamente** y llega a la página de confirmación (`/gracias-por-tu-compra`).

---

## 📋 Pasos para Probar el Evento Purchase

### **1. Inicia Tag Assistant**
1. Ve a: https://tagassistant.google.com/
2. Conecta tu dominio: `http://localhost:3000`
3. Mantén la ventana de Tag Assistant abierta

### **2. Realiza una Compra de Prueba**

**Flujo completo:**

1. **Navega a Productos**
   - Ve a: `http://localhost:3000/productos`
   - O categorías: `/celebrar`, `/premiar`, `/complementar`

2. **Ver Detalle de Producto**
   - Haz clic en "Ver detalles" de cualquier producto
   - Verifica que la URL cambie a `/producto/[slug]`
   - Tag Assistant debería mostrar: **view_item** o variables de producto

3. **Añadir al Carrito**
   - Selecciona tamaño (si aplica)
   - Haz clic en "Agregar al Carrito"
   - Verifica que el carrito se actualice
   - Tag Assistant debería mostrar: **add_to_cart** (si está implementado)

4. **Ir al Checkout**
   - Abre el carrito
   - Haz clic en "Proceder al Pago"
   - Debería llevarte a: `/checkout`
   - Tag Assistant debería mostrar: **begin_checkout** (si está implementado)

5. **Completar el Pago**
   - Llena el formulario con datos de prueba
   - Usa tarjeta de prueba de Stripe:
     - **Número**: `4242 4242 4242 4242`
     - **Vencimiento**: Cualquier fecha futura (ej: `12/25`)
     - **CVC**: Cualquier 3 dígitos (ej: `123`)
     - **ZIP**: Cualquier código (ej: `12345`)
   - Haz clic en "Confirmar Compra"

6. **Página de Confirmación**
   - Deberías ser redirigido a: `/gracias-por-tu-compra?orderID=XXX`
   - **AQUÍ SE DISPARA EL EVENTO PURCHASE** 🎯

### **3. Verificar en Tag Assistant**

En la página de confirmación, Tag Assistant debería mostrar:

✅ **Evento: `purchase`**
- Con los siguientes datos:
  - `transaction_id`: ID de la orden
  - `value`: Total de la compra
  - `currency`: "MXN"
  - `items`: Array de productos comprados
  - `shipping`: Costo de envío
  - `tax`: Impuestos (si aplica)

### **4. Verificar en Consola del Navegador**

Abre la consola (F12) y busca estos mensajes:

```
✅ [GTM] Purchase event pushed to Data Layer
📊 [GTM] Transaction ID: ord_xxxxx
💰 [GTM] Total: 319.00
🛒 [GTM] Items count: 1
📦 [GTM] Full ecommerce data: {...}
✅ [GTM] Google Tag Manager detectado y activo
```

### **5. Verificar Data Layer Manualmente**

En la consola de la página de confirmación, ejecuta:

```javascript
// Ver todos los eventos de compra
console.table(dataLayer.filter(e => e.event === 'purchase'))

// Ver el último evento de compra completo
const lastPurchase = dataLayer.filter(e => e.event === 'purchase').slice(-1)[0]
console.log('📦 Evento Purchase:', JSON.stringify(lastPurchase, null, 2))

// Verificar que GTM esté cargado
console.log('✅ GTM cargado:', typeof google_tag_manager !== 'undefined')
```

---

## 🔍 Qué Verificar en el Evento

El evento `purchase` debe contener:

### **Campos Obligatorios:**
- ✅ `event`: "purchase"
- ✅ `ecommerce.transaction_id`: ID único de la orden
- ✅ `ecommerce.value`: Total de la compra
- ✅ `ecommerce.currency`: "MXN"
- ✅ `ecommerce.items`: Array con los productos

### **Estructura de Items:**
Cada producto en `items` debe tener:
- ✅ `item_name`: Nombre del producto
- ✅ `item_id`: SKU o ID del producto
- ✅ `price`: Precio unitario
- ✅ `item_brand`: "PET GOURMET"
- ✅ `item_category`: Categoría del producto
- ✅ `quantity`: Cantidad comprada

### **Campos Opcionales:**
- `ecommerce.shipping`: Costo de envío
- `ecommerce.tax`: Impuestos
- `ecommerce.coupon`: Código de cupón (si se usó)

---

## 📊 Ejemplo de Evento Purchase Correcto

```json
{
  "event": "purchase",
  "ecommerce": {
    "transaction_id": "ord_1234567890",
    "value": "319.00",
    "currency": "MXN",
    "shipping": "0.00",
    "items": [
      {
        "item_name": "Pastel de cumpleaños Clásico Carne",
        "item_id": "91",
        "price": "319.00",
        "item_brand": "PET GOURMET",
        "item_category": "Para Celebrar",
        "quantity": 1
      }
    ]
  }
}
```

---

## ❌ Problemas Comunes y Soluciones

### **Problema 1: No se dispara el evento**
**Causa**: No llegas a la página de confirmación
**Solución**: 
- Verifica que el pago se complete correctamente
- Usa tarjeta de prueba de Stripe: `4242 4242 4242 4242`
- Revisa la consola en busca de errores

### **Problema 2: Evento sin datos**
**Causa**: `orderID` no está en la URL o no hay datos en localStorage
**Solución**:
- Verifica la URL: debe ser `/gracias-por-tu-compra?orderID=XXX`
- Revisa que el checkout guarde los datos correctamente

### **Problema 3: GTM no detectado**
**Causa**: El contenedor GTM no está cargado
**Solución**:
- Verifica que el GTM ID sea correcto: `GTM-WMCL7Z6H`
- Revisa el código en `app/layout.tsx`
- Asegúrate de que no haya bloqueadores de ads

### **Problema 4: Tag Assistant no muestra el evento**
**Causa**: El evento se disparó pero Tag Assistant no lo capturó
**Solución**:
- Reconecta Tag Assistant antes de hacer la compra
- Mantén la ventana de Tag Assistant abierta durante todo el proceso
- Refresca Tag Assistant después de llegar a la página de confirmación

---

## 🎯 Checklist de Verificación

Antes de considerar la prueba exitosa, verifica:

- [ ] El evento `purchase` aparece en Tag Assistant
- [ ] El `transaction_id` está presente y es único
- [ ] El `value` corresponde al total de la compra
- [ ] Los `items` contienen todos los productos comprados
- [ ] Los logs aparecen en la consola del navegador
- [ ] No hay errores en la consola
- [ ] GTM está marcado como "cargado" en Tag Assistant
- [ ] Los tags de GA4/Analytics se disparan correctamente

---

## 📞 Siguiente Paso

Una vez que confirmes que el evento `purchase` funciona correctamente:

1. **Prueba en producción** con transacciones reales
2. **Configura conversiones en Google Ads** (si usas publicidad)
3. **Configura objetivos en GA4** para medir conversiones
4. **Verifica que Facebook Pixel también reciba el evento** (si lo usas)

---

## 🆘 ¿Necesitas Ayuda?

Si el evento no se dispara o hay problemas:
1. Copia el contenido completo de `dataLayer` desde la consola
2. Copia los logs de la consola
3. Toma captura de pantalla de Tag Assistant
4. Comparte la información para diagnóstico

