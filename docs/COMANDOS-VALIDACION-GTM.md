# 🚀 Comandos Rápidos para Validar GTM

## ⚡ COPIAR Y PEGAR EN LA CONSOLA

Abre la consola (F12) y pega estos comandos:

---

### 1️⃣ Verificación Rápida Completa

```javascript
console.clear();
console.log('%c🔍 VALIDACIÓN GTM - PET GOURMET', 'font-size: 20px; font-weight: bold; color: #7BBDC5');
console.log('\n%c1. Google Tag Manager:', 'font-weight: bold; font-size: 14px');
console.log(window.google_tag_manager?.['GTM-WMCL7Z6H'] ? '✅ GTM cargado correctamente' : '❌ GTM no detectado');
console.log('\n%c2. Data Layer:', 'font-weight: bold; font-size: 14px');
console.log(window.dataLayer ? `✅ Data Layer existe (${window.dataLayer.length} eventos)` : '❌ Data Layer no encontrado');
console.log('\n%c3. Eventos de Producto:', 'font-weight: bold; font-size: 14px');
const productEvents = window.dataLayer?.filter(e => e.productName || e.productNameC) || [];
console.log(productEvents.length > 0 ? `✅ ${productEvents.length} eventos de producto encontrados` : '⚠️ No hay eventos de producto');
console.log('\n%c4. Data Layer Completo:', 'font-weight: bold; font-size: 14px');
console.table(window.dataLayer);
if (productEvents.length > 0) {
  console.log('\n%c5. Último Producto:', 'font-weight: bold; font-size: 14px');
  console.log(productEvents[productEvents.length - 1]);
}
console.log('\n%c✅ Validación completa', 'font-size: 16px; color: green; font-weight: bold');
```

---

### 2️⃣ Ver Solo Eventos de Producto

```javascript
dataLayer.filter(e => e.productName || e.productNameC)
```

---

### 3️⃣ Ver Último Evento

```javascript
dataLayer[dataLayer.length - 1]
```

---

### 4️⃣ Ver Todo el Data Layer

```javascript
dataLayer
```

---

### 5️⃣ Verificar GTM Específico

```javascript
window.google_tag_manager?.['GTM-WMCL7Z6H']
```

---

### 6️⃣ Ver Structured Data (JSON-LD)

```javascript
const scripts = document.querySelectorAll('script[type="application/ld+json"]');
console.log(`Encontrados ${scripts.length} scripts de Structured Data`);
scripts.forEach((script, i) => {
  console.log(`\nScript ${i + 1}:`, JSON.parse(script.textContent));
});
```

---

### 7️⃣ Monitorear Eventos en Tiempo Real

```javascript
// Guardar el Data Layer original
const originalPush = window.dataLayer.push;

// Interceptar nuevos eventos
window.dataLayer.push = function(...args) {
  console.log('%c📊 NUEVO EVENTO:', 'color: green; font-weight: bold', args[0]);
  return originalPush.apply(this, args);
};

console.log('✅ Monitor activado. Todos los nuevos eventos se mostrarán aquí.');
```

---

### 8️⃣ Enviar Evento de Prueba

```javascript
window.dataLayer.push({
  event: 'test_product',
  productName: 'Producto de Prueba',
  productPrice: 299.99,
  productCategory: 'Test',
  productSKU: 'TEST-123'
});
console.log('✅ Evento de prueba enviado');
```

---

## 🎯 VALIDACIÓN COMPLETA CON PANEL VISUAL

Si quieres un panel visual completo, copia y pega este código:

```javascript
(function(){const e=document.getElementById("gtm-validator-styles")||(()=>{const e=document.createElement("style");return e.id="gtm-validator-styles",e.textContent="\n    #gtm-validator-panel {\n      position: fixed; top: 20px; right: 20px; width: 450px;\n      max-height: 80vh; background: white; border: 2px solid #7BBDC5;\n      border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);\n      z-index: 999999; font-family: -apple-system, sans-serif;\n      overflow: hidden; animation: slideIn 0.3s ease-out;\n    }\n    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }\n    #gtm-validator-header { background: #7BBDC5; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; }\n    #gtm-validator-header h3 { margin: 0; font-size: 18px; font-weight: 600; }\n    #gtm-validator-close { background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 18px; font-weight: bold; }\n    #gtm-validator-close:hover { background: rgba(255,255,255,0.3); }\n    #gtm-validator-content { padding: 20px; max-height: calc(80vh - 60px); overflow-y: auto; }\n    .gtm-section { margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee; }\n    .gtm-section:last-child { border-bottom: none; }\n    .gtm-section h4 { margin: 0 0 10px 0; font-size: 14px; color: #333; font-weight: 600; }\n    .gtm-status { display: flex; align-items: center; padding: 8px 12px; border-radius: 6px; margin: 5px 0; font-size: 13px; }\n    .gtm-status.success { background: #d4edda; color: #155724; }\n    .gtm-status.error { background: #f8d7da; color: #721c24; }\n    .gtm-status.warning { background: #fff3cd; color: #856404; }\n    .gtm-status-icon { margin-right: 8px; font-size: 16px; }\n    .gtm-code { background: #f5f5f5; padding: 10px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 12px; overflow-x: auto; max-height: 200px; overflow-y: auto; }\n    .gtm-button { background: #7BBDC5; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; margin: 5px 5px 5px 0; }\n    .gtm-button:hover { background: #6aacb4; }\n    .gtm-count { display: inline-block; background: #7BBDC5; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-left: 5px; }\n  ",document.head.appendChild(e),e})(),t=!!(window.google_tag_manager&&window.google_tag_manager["GTM-WMCL7Z6H"]),n=!!(window.dataLayer&&Array.isArray(window.dataLayer)),a=window.dataLayer?window.dataLayer.length:0,o=window.dataLayer?window.dataLayer.filter((e=>e.productName||e.productNameC)):[],d=window.dataLayer&&window.dataLayer.length>0?window.dataLayer[window.dataLayer.length-1]:null;let l=document.getElementById("gtm-validator-panel");l&&l.remove(),(l=document.createElement("div")).id="gtm-validator-panel",l.innerHTML=`\n    <div id="gtm-validator-header">\n      <h3>🔍 Validador GTM</h3>\n      <button id="gtm-validator-close">×</button>\n    </div>\n    <div id="gtm-validator-content">\n      <div class="gtm-section">\n        <h4>Estado de Google Tag Manager</h4>\n        <div class="gtm-status ${t?"success":"error"}">\n          <span class="gtm-status-icon">${t?"✅":"❌"}</span>\n          <span>${t?"GTM cargado correctamente (GTM-WMCL7Z6H)":"GTM no detectado"}</span>\n        </div>\n        ${t?'<button class="gtm-button" onclick="console.log(\'GTM Container:\', window.google_tag_manager[\'GTM-WMCL7Z6H\']); alert(\'Revisa la consola\')">Ver en Consola</button>':""}\n      </div>\n      <div class="gtm-section">\n        <h4>Data Layer <span class="gtm-count">${a} eventos</span></h4>\n        <div class="gtm-status ${n?"success":"error"}">\n          <span class="gtm-status-icon">${n?"✅":"❌"}</span>\n          <span>${n?"Data Layer inicializado":"Data Layer no encontrado"}</span>\n        </div>\n        ${n?'<button class="gtm-button" onclick="console.table(window.dataLayer); alert(\'Revisa la consola\')">Ver Todos</button><button class="gtm-button" onclick="console.log(\'Último Evento:\', window.dataLayer[window.dataLayer.length - 1]); alert(\'Revisa la consola\')">Ver Último</button>':""}\n      </div>\n      <div class="gtm-section">\n        <h4>Eventos de Producto <span class="gtm-count">${o.length}</span></h4>\n        <div class="gtm-status ${o.length>0?"success":"warning"}">\n          <span class="gtm-status-icon">${o.length>0?"✅":"⚠️"}</span>\n          <span>${o.length>0?"Eventos de producto detectados":"No hay eventos de producto (visita un producto)"}</span>\n        </div>\n        ${o.length>0?`<button class="gtm-button" onclick="console.table(window.dataLayer.filter(e => e.productName || e.productNameC)); alert('Revisa la consola')">Ver Productos</button><div class="gtm-code" style="margin-top: 10px;"><strong>Último producto:</strong><br>${JSON.stringify(o[o.length-1],null,2)}</div>`:""}\n      </div>\n      ${d?`<div class="gtm-section"><h4>Último Evento Registrado</h4><div class="gtm-code">${JSON.stringify(d,null,2)}</div></div>`:""}\n      <div class="gtm-section">\n        <h4>Acciones Rápidas</h4>\n        <button class="gtm-button" onclick="window.dataLayer.push({event: 'test_product', productName: 'Producto de Prueba', productPrice: 299.99, productCategory: 'Test'}); alert('✅ Evento de prueba enviado. Recarga este panel.')">Enviar Evento de Prueba</button>\n        <button class="gtm-button" onclick="const scripts = document.querySelectorAll('script[type=\\'application/ld+json\\']'); console.log('Structured Data:', scripts.length); scripts.forEach((s, i) => console.log('Script ' + (i+1) + ':', JSON.parse(s.textContent))); alert('Revisa la consola')">Ver Structured Data</button>\n      </div>\n    </div>\n  `,document.body.appendChild(l),document.getElementById("gtm-validator-close").addEventListener("click",(()=>{l.remove()})),console.log("🔍 GTM Validator Panel abierto"),console.log("📊 Data Layer actual:",window.dataLayer)})();
```

---

## 📝 Cómo Habilitar "Allow Pasting"

Si Chrome no te deja pegar código:

1. **Abre la Consola** (F12 → Console)
2. **Escribe manualmente:** `allow pasting`
3. **Presiona Enter**
4. **Ahora puedes pegar** cualquier código ✅

---

## 🎯 Flujo Recomendado

### Paso 1: Habilitar consola
```
1. F12 → Console
2. Escribe: allow pasting
3. Enter
```

### Paso 2: Validación rápida
```javascript
// Copia y pega esto:
console.log('GTM:', !!window.google_tag_manager?.['GTM-WMCL7Z6H']);
console.log('Data Layer:', dataLayer?.length, 'eventos');
console.log('Productos:', dataLayer?.filter(e => e.productName).length);
```

### Paso 3: Ver productos
```javascript
// Si hay productos, velos así:
console.table(dataLayer.filter(e => e.productName));
```

---

## 💡 Tips

- **No cierres DevTools**: Mantén la consola abierta mientras navegas
- **Recarga la página**: Después de pegar el monitor de eventos
- **Navega a productos**: Para ver eventos de producto
- **Usa el panel visual**: Es más fácil que leer código

---

## ⚠️ Si No Funciona

### Problema: "Cannot read property 'GTM-WMCL7Z6H' of undefined"
**Solución:** GTM no está cargado. Verifica que el script esté en el `<head>`

### Problema: "dataLayer is not defined"
**Solución:** Data Layer no inicializado. Verifica `components/data-layer-init.tsx`

### Problema: "No puedo pegar código"
**Solución:** Escribe `allow pasting` en la consola y presiona Enter

---

## 🚀 Siguiente Paso

Una vez validado localmente:
1. Sube a producción
2. Valida en producción con el mismo código
3. Conecta Tag Assistant en producción
4. Configura eventos en GTM Dashboard

¡Listo! 🎉
