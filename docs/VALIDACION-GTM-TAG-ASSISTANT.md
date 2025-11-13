# 🔍 Validación de Google Tag Manager con Tag Assistant

Esta guía te ayudará a validar que el tracking de productos y eventos esté funcionando correctamente usando Google Tag Assistant.

## 📋 Requisitos Previos

1. **Google Chrome** instalado
2. **Google Tag Assistant** (viene integrado en Chrome DevTools)
3. Tu servidor de desarrollo corriendo: `pnpm run dev`

---

## 🚀 Método 1: Usar Tag Assistant en DevTools (Recomendado)

### Paso 1: Abre tu sitio local
```
http://localhost:3000
```

### Paso 2: Abre Chrome DevTools
- **Windows/Linux**: `F12` o `Ctrl + Shift + I`
- **Mac**: `Cmd + Option + I`

### Paso 3: Ve a la pestaña "Tag Assistant"
1. Busca la pestaña **"Tag Assistant"** en DevTools
2. Si no la ves, haz clic en el menú `>>` (más opciones)
3. Selecciona **"Tag Assistant"**

### Paso 4: Conecta Tag Assistant
1. Haz clic en el botón **"Connect"**
2. La página se recargará automáticamente
3. Tag Assistant comenzará a grabar eventos

### Paso 5: Navega a una página de producto
1. Ve a: `http://localhost:3000/productos`
2. Haz clic en cualquier producto para ver su detalle
3. Espera a que cargue completamente

### Paso 6: Verifica los resultados en Tag Assistant

Deberías ver:

✅ **Google Tag Manager** detectado
- **Container ID**: GTM-WMCL7Z6H
- **Status**: Working

✅ **Data Layer Events** (varios eventos detectados):
- `page_data_ready` - Página lista
- `gtm.js` - GTM inicializado
- `gtm.dom` - DOM cargado
- Eventos personalizados con datos de producto

✅ **Structured Data** (JSON-LD detectado):
- Type: `Product`
- Datos del producto (nombre, precio, stock, etc.)

---

## 🔬 Método 2: Verificación Manual en la Consola

### Opción A: Ver el Data Layer completo

Abre la **Consola** (F12 → Console) y ejecuta:

```javascript
// Ver todo el Data Layer
dataLayer

// Ver cuántos eventos hay
dataLayer.length

// Ver el último evento
dataLayer[dataLayer.length - 1]
```

### Opción B: Buscar eventos de producto

```javascript
// Filtrar eventos que tengan información de productos
dataLayer.filter(event => event.productName || event.productNameC)

// Ver el primer evento de producto
dataLayer.filter(event => event.productName)[0]
```

### Opción C: Verificar GTM está cargado

```javascript
// Verificar que GTM está cargado
window.google_tag_manager

// Verificar el contenedor específico
window.google_tag_manager['GTM-WMCL7Z6H']
```

---

## 📊 Datos que Deberías Ver en el Data Layer

Cuando visites una página de producto, el Data Layer debería contener:

```javascript
{
  event: "page_data_ready",
  productCategory: "Celebrar",        // Categoría del producto
  productCategoryC: "Celebrar",
  productName: "Galletas Premium",    // Nombre del producto
  productNameC: "Galletas Premium",
  productPrice: 299.99,               // Precio actual
  productPriceC: 299.99,
  productQuantityC: 1,                // Cantidad inicial
  productSKUC: "123",                 // ID del producto
  productos: 1,                       // Contador de productos
  pageCategory: "productos",          // Categoría de página
  pagePath: "/producto/galletas-premium",
  pageURL: "http://localhost:3000/producto/galletas-premium",
  random: 123456789                   // Número aleatorio para evitar cache
}
```

---

## 🛠️ Método 3: Usar la Herramienta de Testing

He creado una herramienta HTML para facilitar las pruebas:

### Paso 1: Abre el archivo de testing
```
d:\Clients\Petgourmet\web-petgourtmet\scripts\test-gtm-tracking.html
```

### Paso 2: Abre el archivo en tu navegador
- Haz doble clic en el archivo
- O arrastra el archivo a Chrome

### Paso 3: Usa los botones de prueba
La herramienta te permite:
- ✅ Verificar si GTM está cargado
- ✅ Simular vista de producto
- ✅ Simular agregar al carrito
- ✅ Simular compra
- ✅ Ver eventos del Data Layer en tiempo real

---

## 🐛 Solución de Problemas

### Problema 1: "No se ha encontrado ninguna etiqueta de Google"

**Causas posibles:**

1. **GTM no está cargado correctamente**
   - Verifica en la consola: `window.google_tag_manager`
   - Debería mostrar un objeto, no `undefined`

2. **Bloqueador de anuncios activo**
   - Desactiva extensiones como uBlock Origin, AdBlock
   - Recarga la página

3. **El contenedor GTM está vacío**
   - Verifica en Google Tag Manager que el contenedor `GTM-WMCL7Z6H` tenga etiquetas configuradas
   - Publica una versión del contenedor si no lo has hecho

**Solución:**
```javascript
// Verificar en la consola si GTM está presente
console.log('GTM cargado:', !!window.google_tag_manager)
console.log('Contenedor existe:', !!window.google_tag_manager?.['GTM-WMCL7Z6H'])
```

### Problema 2: "Data Layer vacío o sin eventos de producto"

**Causas posibles:**

1. **No estás en una página de producto**
   - El tracking de producto solo funciona en `/producto/[slug]`
   - Ve a `http://localhost:3000/productos` y haz clic en un producto

2. **El producto no cargó correctamente**
   - Verifica en la consola si hay errores de Supabase
   - Verifica que el producto exista en la base de datos

3. **El componente no está enviando datos**
   - Busca en la consola: `"📊 Product data pushed to Data Layer"`
   - Si no aparece, hay un problema con `pushProductDataLayer()`

**Solución:**
```javascript
// Verificar que el Data Layer tenga eventos
console.log('Eventos en Data Layer:', dataLayer.length)

// Buscar eventos de producto
const productEvents = dataLayer.filter(e => e.productName)
console.log('Eventos de producto:', productEvents)
```

### Problema 3: "Structured Data no detectado"

**Causas posibles:**

1. **El JSON-LD no se está renderizando**
   - Inspecciona el HTML de la página
   - Busca `<script type="application/ld+json">`

2. **Error en el formato JSON**
   - Verifica la consola por errores de sintaxis
   - El JSON debe ser válido

**Solución:**
```javascript
// Buscar scripts de structured data en la página
const structuredData = document.querySelectorAll('script[type="application/ld+json"]')
console.log('Structured Data encontrados:', structuredData.length)

// Ver el contenido
structuredData.forEach((script, i) => {
  console.log(`Script ${i + 1}:`, JSON.parse(script.textContent))
})
```

### Problema 4: "Los eventos se envían pero no aparecen en Tag Assistant"

**Causas posibles:**

1. **Tag Assistant no está conectado**
   - Haz clic en "Connect" en Tag Assistant
   - La página debe recargarse

2. **Eventos se envían antes de conectar Tag Assistant**
   - Conéctate ANTES de navegar
   - Recarga la página después de conectar

3. **No tienes etiquetas configuradas en GTM**
   - Ve a Google Tag Manager
   - Crea etiquetas para escuchar los eventos del Data Layer
   - Publica el contenedor

**Solución:**
- Desconecta y vuelve a conectar Tag Assistant
- Recarga la página
- Navega de nuevo a la página de producto

---

## ✅ Checklist de Validación

Usa esta lista para verificar que todo funciona:

### Configuración Básica
- [ ] Servidor de desarrollo corriendo en `http://localhost:3000`
- [ ] Chrome DevTools abierto
- [ ] Tag Assistant conectado

### GTM Cargado
- [ ] `window.google_tag_manager` existe
- [ ] Contenedor `GTM-WMCL7Z6H` presente
- [ ] Tag Assistant detecta GTM

### Data Layer
- [ ] `window.dataLayer` es un array
- [ ] Tiene más de 1 evento
- [ ] Evento `page_data_ready` presente

### Tracking de Producto
- [ ] Estás en una página de producto (`/producto/[slug]`)
- [ ] Evento con `productName` en Data Layer
- [ ] Datos completos: precio, categoría, SKU, cantidad
- [ ] Consola muestra: "📊 Product data pushed to Data Layer"

### Structured Data
- [ ] Script `application/ld+json` en el HTML
- [ ] Type: "Product"
- [ ] Datos válidos: name, price, availability

### Tag Assistant
- [ ] GTM aparece en "Tags Found"
- [ ] Data Layer Events listados
- [ ] Structured Data detectado

---

## 📈 Eventos Esperados por Página

### Homepage (`/`)
```javascript
{
  event: "page_data_ready",
  pageCategory: "general",
  pagePath: "/",
  pageURL: "http://localhost:3000/",
  random: 123456789
}
```

### Página de Productos (`/productos`)
```javascript
{
  event: "page_data_ready",
  pageCategory: "productos",
  pagePath: "/productos",
  pageURL: "http://localhost:3000/productos",
  random: 123456789
}
```

### Detalle de Producto (`/producto/[slug]`)
```javascript
{
  event: "page_data_ready",
  productCategory: "Celebrar",
  productCategoryC: "Celebrar",
  productName: "Nombre del Producto",
  productNameC: "Nombre del Producto",
  productPrice: 299.99,
  productPriceC: 299.99,
  productQuantityC: 1,
  productSKUC: "123",
  productos: 1,
  pageCategory: "general",
  pagePath: "/producto/slug-del-producto",
  pageURL: "http://localhost:3000/producto/slug-del-producto",
  random: 123456789
}
```

---

## 🎯 Validación en Google Tag Manager

Si quieres ver los eventos en Google Tag Manager:

### Paso 1: Abre GTM
```
https://tagmanager.google.com/
```

### Paso 2: Selecciona tu contenedor
- Container ID: `GTM-WMCL7Z6H`

### Paso 3: Modo Preview
1. Haz clic en **"Preview"** (Vista previa)
2. Ingresa tu URL: `http://localhost:3000`
3. Haz clic en **"Connect"**

### Paso 4: Navega en tu sitio
1. Ve a una página de producto
2. En la ventana de GTM verás:
   - **Tags Fired**: Etiquetas que se dispararon
   - **Data Layer**: Todos los eventos
   - **Variables**: Valores de variables

---

## 🔗 Enlaces Útiles

- **Google Tag Manager**: https://tagmanager.google.com/
- **Tag Assistant**: https://tagassistant.google.com/
- **GTM Help**: https://support.google.com/tagmanager
- **Structured Data Testing**: https://search.google.com/test/rich-results

---

## 📞 Soporte

Si sigues teniendo problemas:

1. **Verifica la consola del navegador** por errores
2. **Revisa que Supabase esté funcionando** correctamente
3. **Verifica que los productos tengan datos** completos en la DB
4. **Asegúrate de estar usando Chrome** (Tag Assistant funciona mejor aquí)

---

## 🎉 Éxito

Si ves todos los checkmarks verdes en Tag Assistant:
- ✅ GTM está funcionando
- ✅ Data Layer está enviando eventos
- ✅ Structured Data está presente
- ✅ El tracking está completo

¡Tu implementación está lista para producción! 🚀
