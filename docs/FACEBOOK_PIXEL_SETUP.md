# 📘 Facebook Pixel (Meta Pixel) - Configuración Completa

## ✅ Configuración Implementada

### **Datos de la Cuenta Meta:**
- **Identificador del Conjunto de Datos**: 840370127164134
- **Pixel ID**: 840370127164134
- **Creador**: Gourmet Gómez
- **Propietario**: Bakery & boutique para mascotas (797156104995402)

### **Datos Vinculados:**
- **Página Facebook**: Pet Gourmet Mx (101255416061066)
- **Instagram**: Pet Gourmet México 🎂 Pastelería para mascotas (17841454813270642)

## 🔧 Archivos Implementados

### **1. Componentes Principales**
- `components/facebook-pixel.tsx` - Componente para cargar Facebook Pixel
- `hooks/use-facebook-pixel.ts` - Hook personalizado para tracking

### **2. Variables de Entorno**
```bash
# .env.local
NEXT_PUBLIC_FB_PIXEL_ID=840370127164134
NEXT_PUBLIC_FB_PIXEL_ENABLED=true  # Opcional, para controlar en desarrollo
```

### **3. Integración en Layout**
- `app/layout.tsx` - Facebook Pixel cargado globalmente
- `components/cart-context.tsx` - Tracking de ecommerce

## 🎯 Eventos Estándar Configurados

### **Eventos de Ecommerce:**
- ✅ `PageView` - Vista de páginas (automático)
- ✅ `ViewContent` - Vista de productos
- ✅ `AddToCart` - Agregar al carrito
- ✅ `InitiateCheckout` - Iniciar checkout
- ✅ `Purchase` - Compra completada

### **Eventos de Marketing:**
- ✅ `Lead` - Leads y suscripciones
- ✅ `CompleteRegistration` - Registros completos
- ✅ `Search` - Búsquedas en el sitio
- ✅ `Subscribe` - Suscripciones

## 📋 Parámetros de Eventos

### **Configuración Estándar:**
```javascript
{
  content_ids: ["producto-123"],
  content_name: "Nombre del Producto",
  content_type: "product",
  currency: "MXN",
  value: 299.99,
  quantity: 1
}
```

### **Eventos de Compra:**
```javascript
{
  content_ids: ["producto-123", "producto-456"],
  content_type: "product", 
  currency: "MXN",
  value: 598.99,
  order_id: "order-123",
  num_items: 2
}
```

## 🧪 Testing y Verificación

### **Página de Pruebas:**
- Accede a `/test-facebook-pixel` para probar todos los eventos
- Incluye botones para cada tipo de evento estándar
- Instrucciones para verificar en Meta Events Manager

### **Verificación con Facebook Pixel Helper:**
1. Instala la extensión "Facebook Pixel Helper" en Chrome
2. Navega por el sitio web
3. La extensión mostrará los eventos que se disparan
4. Verificar que aparezca el Pixel ID: 840370127164134

### **Verificación en Meta Events Manager:**
1. Ve a Meta Business Manager
2. Navega a **Events Manager**
3. Selecciona tu pixel (840370127164134)
4. Ve a **Test Events** para ver eventos en tiempo real
5. Ejecuta acciones en el sitio y observa los eventos

### **Verificación con DevTools:**
1. Abre DevTools (F12)
2. Ve a la pestaña **Network**
3. Filtra por "facebook" o "fbevents"
4. Ejecuta acciones y observa las requests

## 🎨 Integración con Carrito de Compras

### **Eventos Automáticos:**
- **AddToCart**: Se dispara al agregar productos al carrito
- **InitiateCheckout**: Se dispara al iniciar el proceso de checkout
- **Purchase**: Se dispara al completar una compra

### **Parámetros Incluidos:**
- IDs de productos
- Nombres de productos
- Valores en MXN
- Cantidades
- Categorías (subscription/one-time)

## 🔒 Privacidad y Cumplimiento

### **Configuraciones de Privacidad:**
- Carga solo en producción por defecto
- Control mediante variables de entorno
- Cumple con políticas de Meta
- Incluye noscript fallback

### **GDPR y Regulaciones:**
- Compatible con consentimiento de cookies
- Datos procesados según políticas de Meta
- Configuración para diferentes regiones

## 🚀 Configuración para Producción

### **1. Variables de Entorno en Producción:**
```bash
NEXT_PUBLIC_FB_PIXEL_ID=840370127164134
NEXT_PUBLIC_FB_PIXEL_ENABLED=true
NODE_ENV=production
```

### **2. Configuración en Meta Business:**
- Verificar dominio `https://petgourmet.mx` en Business Manager
- Configurar audiencias personalizadas
- Crear eventos personalizados según necesidades
- Configurar conversiones para optimización de anuncios

### **3. Configuraciones Adicionales:**
- **Custom Audiences**: Crear audiencias basadas en comportamiento
- **Lookalike Audiences**: Audiencias similares para prospección
- **Conversion Tracking**: Seguimiento de conversiones para anuncios

## 📈 Métricas y Optimización

### **Eventos Clave a Monitorear:**
- **Page Views**: Tráfico general del sitio
- **View Content**: Interés en productos
- **Add to Cart**: Intención de compra
- **Initiate Checkout**: Proceso de conversión
- **Purchase**: Conversiones completadas

### **Audiencias Recomendadas:**
- Visitantes del sitio web (30, 60, 90 días)
- Usuarios que vieron productos
- Usuarios que agregaron al carrito
- Compradores
- Suscriptores a newsletter

### **Optimización de Anuncios:**
- Usar eventos de conversión para optimización
- Crear campañas de remarketing
- Segmentar por comportamiento de compra
- A/B testing basado en audiencias

## 🛠️ Uso en Componentes

### **Importar el Hook:**
```tsx
import { useFacebookPixel } from "@/hooks/use-facebook-pixel"

const { trackViewContent, trackAddToCart, trackPurchase } = useFacebookPixel()
```

### **Tracking de Eventos:**
```tsx
// Ver contenido
trackViewContent("123", "Producto Premium", "product", 299.99)

// Agregar al carrito
trackAddToCart("123", "Producto Premium", 299.99, 1)

// Compra
trackPurchase(599.98, "order-123", ["123", "456"], 2)

// Lead
trackLead(0, "Newsletter Subscription")
```

## 🔍 Troubleshooting

### **Si no aparecen eventos:**
1. Verifica que `NEXT_PUBLIC_FB_PIXEL_ID` esté configurado
2. Comprueba que estés en producción o `NEXT_PUBLIC_FB_PIXEL_ENABLED=true`
3. Revisa la consola del navegador para errores
4. Usa Facebook Pixel Helper para debugging

### **Si las conversiones no se registran:**
1. Verifica que los valores sean números válidos
2. Comprueba que currency esté configurado como "MXN"
3. Asegúrate de que los content_ids sean strings válidos
4. Verifica la configuración en Meta Events Manager

### **Problemas de Audiencias:**
1. Verificar que el dominio esté validado en Business Manager
2. Asegurar que se disparen suficientes eventos (mínimo 100 para audiencias)
3. Comprobar configuración de retención de audiencias

## 📞 Soporte

Para problemas con Facebook Pixel:
1. Verificar la configuración en la página `/test-facebook-pixel`
2. Usar Facebook Pixel Helper para debugging
3. Revisar Meta Events Manager para eventos en tiempo real
4. Consultar Meta Business Help Center

---

**✨ Facebook Pixel está completamente configurado y listo para optimizar tus campañas publicitarias!**
