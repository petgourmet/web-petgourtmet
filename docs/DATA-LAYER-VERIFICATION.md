# Verificación de Data Layer - Variables GTM

## ✅ Variables Implementadas

Según la imagen proporcionada, estas son las variables que ahora están disponibles en el Data Layer:

### Variables de Página ✅
| Variable GTM | Tipo | Disponible | Valor Ejemplo |
|-------------|------|------------|---------------|
| `_event` | Evento personalizado | ✅ | `page_view`, `page_data_ready` |
| `_random` | Número aleatorio | ✅ | `1589476886` |
| `_triggers` | Variable capa de datos | ✅ | `140` |
| `_url` | URL | ✅ | URL completa de la página |
| `Event` | Evento personalizado | ✅ | `page_view` |
| `Page Hostname` | URL | ✅ | `petgourmet.mx` |
| `Page Path` | URL | ✅ | `/nutricion` |
| `Page URL` | URL | ✅ | URL completa |
| `pageCategory` | JavaScript personalizado | ✅ | `nutricion` |
| `Referrer` | HTTP Referrer | ✅ | URL referrer |

### Variables de Producto ✅
| Variable GTM | Tipo | Ahora Disponible | Valor Ejemplo |
|-------------|------|------------------|---------------|
| `productCategory` | JavaScript personalizado | ✅ | `Pasteles` |
| `productCategoryC` | Variable capa de datos | ✅ | `Pasteles` |
| `productName` | JavaScript personalizado | ✅ | `Pastel de Cumpleaños` |
| `productNameC` | Variable capa de datos | ✅ | `Pastel de Cumpleaños` |
| `productos` | JavaScript personalizado | ✅ | `1` (cantidad de productos) |
| `productPrice` | JavaScript personalizado | ✅ | `319.00` |
| `productPriceC` | Variable capa de datos | ✅ | `319.00` |
| `productQuantityC` | Variable capa de datos | ✅ | `1` |
| `productSKUC` | Variable capa de datos | ✅ | `PROD_123` |

### Variables de Orden (Thank You Page) ✅
| Variable GTM | Tipo | Disponible | Valor Ejemplo |
|-------------|------|------------|---------------|
| `orderID` | Variable capa de datos | ✅ | `ORDER_2025110601234` |

## 🧪 Cómo Verificar en el Navegador

### 1. Abrir Consola del Navegador
Presiona `F12` o `Ctrl + Shift + I` (Windows) / `Cmd + Option + I` (Mac)

### 2. Ver el Data Layer Completo
```javascript
// Ver todo el dataLayer
console.table(window.dataLayer)

// Ver último evento
console.log(window.dataLayer[window.dataLayer.length - 1])

// Buscar variable específica
window.dataLayer.find(item => item.orderID)
```

### 3. Verificar Variables Específicas

#### En Página de Thank You:
```javascript
// Debe mostrar el orderID
window.dataLayer.find(item => item.orderID)?.orderID

// Debe mostrar información de productos
window.dataLayer.find(item => item.productNameC)

// Ejemplo de salida esperada:
{
  orderID: "ORDER_2025110601234",
  pageCategory: "thankyou",
  pagePath: "/gracias-por-tu-compra",
  pageURL: "https://petgourmet.mx/gracias-por-tu-compra?session_id=...",
  productNameC: "Pastel de Cumpleaños Clásico Carne",
  productPriceC: 319,
  productQuantityC: 1,
  productos: 1
}
```

#### En Cualquier Página:
```javascript
// Variables básicas siempre disponibles
window.dataLayer.find(item => item.pageCategory)

// Ejemplo:
{
  event: "page_data_ready",
  pageCategory: "nutricion",
  pagePath: "/nutricion",
  pageURL: "https://petgourmet.mx/nutricion",
  pageHostname: "petgourmet.mx",
  random: 1589476886
}
```

## 🎯 Configuración en Google Tag Manager

### Crear Variables en GTM

#### 1. Variables de Página (Ya funcionan automáticamente)
- ✅ `Page Hostname` - Built-in
- ✅ `Page Path` - Built-in
- ✅ `Page URL` - Built-in
- ✅ `Referrer` - Built-in

#### 2. Variables del Data Layer (Crear manualmente)

**pageCategory**
- Tipo: Variable de capa de datos
- Nombre de la variable: `pageCategory`

**orderID**
- Tipo: Variable de capa de datos
- Nombre de la variable: `orderID`

**productNameC**
- Tipo: Variable de capa de datos
- Nombre de la variable: `productNameC`

**productPriceC**
- Tipo: Variable de capa de datos
- Nombre de la variable: `productPriceC`

**productQuantityC**
- Tipo: Variable de capa de datos
- Nombre de la variable: `productQuantityC`

**productSKUC**
- Tipo: Variable de capa de datos
- Nombre de la variable: `productSKUC`

**productos**
- Tipo: Variable de capa de datos
- Nombre de la variable: `productos`

**productCategory / productCategoryC**
- Tipo: Variable de capa de datos
- Nombre de la variable: `productCategory` o `productCategoryC`

### 3. Activadores (Triggers)

**Page Data Ready**
- Tipo: Evento personalizado
- Nombre del evento: `page_data_ready`
- Se activa en: Todas las páginas después de cargar datos

**Purchase**
- Tipo: Evento personalizado
- Nombre del evento: `purchase`
- Se activa en: Thank You Page

## 📊 Ejemplo de Flujo Completo

### 1. Usuario navega a /nutricion
```javascript
dataLayer.push({
  event: 'page_data_ready',
  pageCategory: 'nutricion',
  pagePath: '/nutricion',
  pageURL: 'https://petgourmet.mx/nutricion',
  random: 1589476886
})
```

### 2. Usuario completa compra
```javascript
// Inicialización
dataLayer.push({
  orderID: 'ORDER_123',
  pageCategory: 'thankyou',
  pagePath: '/gracias-por-tu-compra'
})

// Datos de productos
dataLayer.push({
  productNameC: 'Pastel de Cumpleaños',
  productPriceC: 319,
  productQuantityC: 1,
  productSKUC: 'PROD_123',
  productos: 1
})

// Evento de compra
dataLayer.push({
  event: 'purchase',
  ecommerce: {
    transaction_id: 'ORDER_123',
    value: '519.00',
    currency: 'MXN',
    items: [...]
  }
})
```

## 🐛 Solución de Problemas

### Problema: Variables aparecen como `undefined` en GTM

**Soluciones:**
1. Verificar que la variable existe en el dataLayer:
   ```javascript
   console.log(window.dataLayer)
   ```

2. Revisar el nombre exacto de la variable (case-sensitive):
   - ✅ `productNameC`
   - ❌ `productnamec`
   - ❌ `ProductNameC`

3. Verificar que el evento se disparó antes de intentar leer la variable

4. En GTM Preview, ver el orden de eventos:
   - Debe aparecer primero `page_data_ready`
   - Luego cualquier variable debe estar disponible

### Problema: `random` siempre es `undefined`

**Solución:**
- La variable `random` se genera en cada push al dataLayer
- Verificar en consola:
  ```javascript
  window.dataLayer.find(item => item.random)?.random
  ```

### Problema: Variables de producto vacías

**Solución:**
- Las variables de producto solo se rellenan en la Thank You Page
- En otras páginas estarán `undefined` (es normal)

## ✅ Checklist de Verificación

- [ ] `window.dataLayer` existe y es un array
- [ ] `pageCategory` está disponible en todas las páginas
- [ ] `orderID` aparece en Thank You Page
- [ ] Variables de producto aparecen después de compra
- [ ] Evento `page_data_ready` se dispara en cada página
- [ ] Evento `purchase` se dispara en Thank You Page
- [ ] Console logs muestran confirmación de push
- [ ] GTM Preview muestra las variables correctamente

## 📞 Comandos Útiles

```javascript
// Ver todas las variables actuales
window.dataLayer[window.dataLayer.length - 1]

// Buscar por evento
window.dataLayer.filter(item => item.event === 'purchase')

// Ver variable específica
window.dataLayer.find(item => item.orderID)?.orderID

// Limpiar y ver estructura
console.table(window.dataLayer.map(item => ({
  event: item.event,
  orderID: item.orderID,
  pageCategory: item.pageCategory,
  productName: item.productNameC
})))
```

---

**Status**: ✅ TODAS LAS VARIABLES IMPLEMENTADAS
**Fecha**: Noviembre 11, 2025
