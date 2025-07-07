# 📊 Google Analytics - Configuración Completa

## ✅ Configuración Implementada

### **Datos de la Cuenta:**
- **Nombre del Flujo**: petgourmet.mx
- **URL del Flujo**: https://petgourmet.mx
- **ID del Flujo**: 4170066584
- **ID de Medición**: G-W4V4C0VK09

## 🔧 Archivos Implementados

### **1. Componente Principal**
- `components/google-analytics.tsx` - Componente para cargar Google Analytics
- `hooks/use-google-analytics.ts` - Hook personalizado para tracking

### **2. Variables de Entorno**
```bash
# .env.local
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-W4V4C0VK09
NEXT_PUBLIC_GA_ENABLED=true  # Opcional, para controlar en desarrollo
```

### **3. Integración en Layout**
- `app/layout.tsx` - Google Analytics cargado globalmente
- `components/cart-context.tsx` - Tracking de ecommerce

## 🎯 Eventos Configurados

### **Eventos de Ecommerce:**
- ✅ `view_item` - Vista de productos
- ✅ `add_to_cart` - Agregar al carrito
- ✅ `begin_checkout` - Iniciar checkout
- ✅ `purchase` - Compra completada

### **Eventos Personalizados:**
- ✅ `search` - Búsquedas en el sitio
- ✅ Eventos personalizados con categoría y etiquetas

## 📋 Enhanced Ecommerce

### **Configuración de Items:**
```javascript
{
  item_id: "producto-123",
  item_name: "Nombre del Producto",
  category: "subscription|one-time",
  price: 299.99,
  quantity: 1,
  currency: "MXN"
}
```

### **Tracking de Conversiones:**
- Conversiones automáticas para compras
- Valor de conversión en MXN
- IDs de transacción únicos

## 🧪 Testing

### **Página de Pruebas:**
- Accede a `/test-google-analytics` para probar todos los eventos
- Incluye botones para cada tipo de evento
- Instrucciones para verificar en GA

### **Verificación en Tiempo Real:**
1. Ve a Google Analytics
2. Navega a **Informes** → **Tiempo real** → **Eventos**
3. Ejecuta acciones en el sitio
4. Los eventos aparecen inmediatamente

### **Verificación con Herramientas de Desarrollador:**
1. Abre DevTools (F12)
2. Ve a la pestaña **Network**
3. Filtra por "google-analytics" o "gtag"
4. Ejecuta acciones y observa las requests

## 🔒 Privacidad y GDPR

### **Configuraciones de Privacidad:**
- Cookie flags configuradas: `SameSite=None;Secure`
- Solo carga en producción por defecto
- Control mediante variables de entorno

### **Anonimización de IP:**
- Google Analytics 4 anonimiza IPs automáticamente
- Cumple con regulaciones de privacidad

## 🚀 Configuración para Producción

### **1. Variables de Entorno en Producción:**
```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-W4V4C0VK09
NEXT_PUBLIC_GA_ENABLED=true
NODE_ENV=production
```

### **2. Verificación del Dominio:**
- Asegúrate de que `https://petgourmet.mx` esté configurado en GA
- Configura goals y conversiones según tus KPIs

### **3. Configuraciones Adicionales:**
- **Audiencias**: Configura audiencias personalizadas
- **Goals**: Define objetivos de conversión
- **Funnels**: Configura embudos de conversión

## 📈 Métricas Importantes a Monitorear

### **Ecommerce:**
- Revenue total
- Conversion rate
- Average order value
- Products performance
- Cart abandonment rate

### **Engagement:**
- Page views
- Session duration
- Bounce rate
- User flow
- Search queries

### **Custom Events:**
- Product views
- Add to cart rate
- Checkout starts
- Form submissions

## 🛠️ Uso en Componentes

### **Importar el Hook:**
```tsx
import { useGoogleAnalytics } from "@/hooks/use-google-analytics"

const { trackEvent, trackAddToCart, trackPurchase } = useGoogleAnalytics()
```

### **Tracking de Eventos:**
```tsx
// Evento personalizado
trackEvent("button_click", "engagement", "Subscribe Newsletter")

// Agregar al carrito
trackAddToCart("123", "Producto Premium", "subscription", 299.99, 1)

// Compra
trackPurchase("txn-123", 599.98, [items])
```

## 🔍 Troubleshooting

### **Si no aparecen eventos:**
1. Verifica que `NEXT_PUBLIC_GA_MEASUREMENT_ID` esté configurado
2. Comprueba que estés en producción o `NEXT_PUBLIC_GA_ENABLED=true`
3. Revisa la consola del navegador para errores
4. Usa la extensión "Google Analytics Debugger"

### **Si las conversiones no se registran:**
1. Verifica que los IDs de transacción sean únicos
2. Comprueba que el valor sea un número válido
3. Asegúrate de que la moneda esté configurada como "MXN"

## 📞 Soporte

Para problemas con Google Analytics:
1. Verifica la configuración en la página `/test-google-analytics`
2. Revisa las herramientas de desarrollador
3. Consulta Google Analytics DebugView
4. Verifica la configuración de variables de entorno

---

**✨ Google Analytics está completamente configurado y listo para production!**
