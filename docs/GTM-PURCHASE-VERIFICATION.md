# Verificación de Evento Purchase en GTM

## 🎯 Objetivo
Este documento explica cómo verificar que el evento `purchase` se está disparando correctamente en Google Tag Manager cuando un cliente completa una compra.

---

## 📋 Pre-requisitos

1. **GTM Container ID**: `GTM-WMCL7Z6H`
2. **Acceso al navegador**: Chrome/Firefox con consola de desarrollador
3. **Modo Preview de GTM**: Opcional pero recomendado

---

## 🔍 Método 1: Verificar en Consola del Navegador

### Paso 1: Completar una compra de prueba
1. Agregar productos al carrito
2. Proceder al checkout
3. Completar el pago con Stripe (usar tarjeta de prueba: `4242 4242 4242 4242`)
4. Esperar redirección a `/gracias-por-tu-compra`

### Paso 2: Abrir Consola del Navegador
- **Windows/Linux**: `F12` o `Ctrl + Shift + I`
- **Mac**: `Cmd + Option + I`

### Paso 3: Buscar los logs del evento

Deberías ver estos logs en orden:

```
🔵 [GTM] Iniciando proceso de tracking de compra
🔵 [GTM] Datos de orden recibidos: { orderId: 123, total: 899, items: 2 }
🔵 [GTM] Primer item para Data Layer: { category: "Celebrar", name: "...", price: 899, quantity: 1 }
📊 Product data pushed to Data Layer
🔵 [GTM] Disparando evento purchase con todos los items: 2
✅ [GTM] Purchase event pushed to Data Layer
📊 [GTM] Transaction ID: 123
💰 [GTM] Total: 899
🛒 [GTM] Items count: 2
📦 [GTM] Full ecommerce data: { ... }
✅ [GTM] Google Tag Manager detectado y activo
🟢 [GTM] Data Layer completo: [ ... ]
🟢 [GTM] Último evento purchase: [ { event: 'purchase', ... } ]
```

### Paso 4: Verificar el Data Layer manualmente

En la consola, ejecuta:

```javascript
// Ver todo el Data Layer
console.log(window.dataLayer)

// Ver solo eventos de purchase
console.log(window.dataLayer.filter(item => item.event === 'purchase'))

// Ver último evento de purchase
console.log(window.dataLayer.filter(item => item.event === 'purchase').slice(-1)[0])
```

**Deberías ver algo como:**

```javascript
{
  event: "purchase",
  ecommerce: {
    transaction_id: "123",
    value: "899.00",
    currency: "MXN",
    affiliation: "PetGourmet Online Store",
    shipping: "99.00",
    items: [
      {
        item_name: "Alimento Premium para Perro",
        item_id: "456",
        price: "800.00",
        item_brand: "Royal Canin",
        item_category: "Celebrar",
        quantity: 1,
        item_variant: "3kg"
      }
    ]
  }
}
```

---

## 🔍 Método 2: Usar GTM Preview Mode

### Paso 1: Activar Preview Mode
1. Ir a [Google Tag Manager](https://tagmanager.google.com/)
2. Seleccionar el contenedor `GTM-WMCL7Z6H`
3. Click en **"Preview"** (arriba a la derecha)
4. Ingresar la URL: `https://petgourmet.mx` (o tu dominio de staging)
5. Click en **"Connect"**

### Paso 2: Realizar una compra de prueba
1. En la ventana conectada, completar una compra
2. Al llegar a `/gracias-por-tu-compra`, volver a la ventana de GTM Preview

### Paso 3: Verificar el evento
En el panel de GTM Preview, buscar:
- **Event Name**: `purchase`
- **Variables**: Verificar que todas tengan valores reales:
  - `transaction_id`: Debería tener el ID de la orden
  - `value`: Total de la compra
  - `ecommerce.items`: Array con productos

### Paso 4: Verificar Tags disparados
Verificar que los siguientes tags se hayan disparado:
- **Google Analytics 4 - Purchase**
- **Google Ads - Conversion**
- **Facebook Pixel - Purchase**
- Cualquier otro tag configurado con trigger `purchase`

---

## 🔍 Método 3: Verificar en Google Analytics 4

### Paso 1: Acceder a GA4 en tiempo real
1. Ir a [Google Analytics](https://analytics.google.com/)
2. Seleccionar la propiedad de PetGourmet
3. Ir a **"Informes" > "Tiempo real"**

### Paso 2: Completar una compra de prueba

### Paso 3: Verificar el evento
En la sección de eventos en tiempo real, deberías ver:
- **Evento**: `purchase`
- **Parámetros**:
  - `transaction_id`
  - `value`
  - `currency`: MXN
  - `items`: Productos comprados

---

## 🔍 Método 4: Verificar en Facebook Events Manager

### Paso 1: Acceder a Events Manager
1. Ir a [Facebook Business](https://business.facebook.com/)
2. Seleccionar **"Events Manager"**
3. Seleccionar tu Pixel

### Paso 2: Ver eventos de prueba
1. Click en **"Test Events"**
2. Completar una compra de prueba
3. Verificar que aparezca el evento **"Purchase"** con:
   - `value`: Total de la compra
   - `currency`: MXN
   - `content_ids`: IDs de productos

---

## ❌ Problemas Comunes y Soluciones

### Problema 1: No aparecen los logs en consola

**Causa**: JavaScript no se está cargando

**Solución**:
```javascript
// Verificar que el script se cargó
console.log(window.dataLayer)
// Si retorna "undefined", GTM no se cargó correctamente
```

### Problema 2: Data Layer está vacío

**Causa**: El evento se dispara antes de que GTM se inicialice

**Solución**: El código actual ya incluye `initializeDataLayer()` antes del evento `purchase`

### Problema 3: GTM no detectado

**Causa**: Script de GTM bloqueado por ad-blocker o no cargó

**Solución**:
```javascript
// Verificar GTM
if (window.google_tag_manager) {
  console.log('✅ GTM cargado')
} else {
  console.log('❌ GTM NO cargado - verificar ad-blockers')
}
```

### Problema 4: Items sin categoría o brand

**Causa**: Datos no vienen de la base de datos

**Solución**: Verificar que `/api/stripe/order-details` incluya la relación con `products` y `categories`:

```typescript
// En app/api/stripe/order-details/route.ts
const { data: order } = await supabaseAdmin
  .from('orders')
  .select(`
    *,
    order_items (
      *,
      products (
        *,
        categories (name)
      )
    )
  `)
```

---

## ✅ Checklist de Verificación

Antes de considerar que el tracking está funcionando correctamente, verificar:

- [ ] ✅ GTM script presente en el `<head>` de la página
- [ ] ✅ `window.dataLayer` existe y es un array
- [ ] ✅ Al completar compra, aparecen logs en consola
- [ ] ✅ Evento `purchase` presente en `window.dataLayer`
- [ ] ✅ `transaction_id` tiene valor numérico real (no undefined)
- [ ] ✅ `value` tiene el total correcto de la compra
- [ ] ✅ `items` es un array con al menos 1 producto
- [ ] ✅ Cada item tiene: `item_name`, `item_id`, `price`, `quantity`
- [ ] ✅ Cada item tiene: `item_category`, `item_brand` (desde DB)
- [ ] ✅ En GTM Preview Mode, el evento `purchase` aparece
- [ ] ✅ En GA4 Tiempo Real, aparece el evento `purchase`
- [ ] ✅ En Facebook Events Manager, aparece el evento `Purchase`

---

## 📞 Contacto de Soporte

Si después de seguir estos pasos el tracking no funciona:

1. **Exportar Data Layer**:
```javascript
copy(JSON.stringify(window.dataLayer, null, 2))
```

2. **Tomar screenshot** de:
   - Consola con logs del evento
   - GTM Preview Mode mostrando variables
   - GA4 Tiempo Real

3. **Enviar información** al equipo de desarrollo

---

## 🔗 Referencias

- [Documentación GA4 Enhanced Ecommerce](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)
- [Documentación GTM Data Layer](https://developers.google.com/tag-manager/devguide)
- [Facebook Pixel Purchase Event](https://developers.facebook.com/docs/meta-pixel/reference#purchase)
