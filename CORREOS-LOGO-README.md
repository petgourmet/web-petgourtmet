# 📧 Sistema de Correos con Logo Pet Gourmet

## 🎨 Cambios Implementados

### ✅ Logo en Encabezado de Correos

Se ha actualizado **todos los correos electrónicos** del Centro de Logística para incluir el logo de Pet Gourmet (`petgourmet-logo.png`) en el encabezado.

### 📦 Estados del Centro de Logística

Los correos se envían automáticamente para cada estado del pedido:

#### 1. **Pendiente** 🟡
- **Asunto:** 🛍️ Completar tu compra - Pet Gourmet
- **Mensaje:** Informar al cliente que su pedido está registrado y pendiente de pago
- **Contenido:** Logo + Resumen del pedido + Información de pago

#### 2. **Procesando** 🔵  
- **Asunto:** 🎉 ¡Gracias por tu compra! - Pet Gourmet
- **Mensaje:** Pedido confirmado y en preparación
- **Contenido:** Logo + Progreso del pedido (paso 2/4) + Productos + Dirección de envío

#### 3. **En Camino** 🚚
- **Asunto:** 🚚 Tu pedido está en camino - Pet Gourmet
- **Mensaje:** El pedido ha sido enviado y está en tránsito
- **Contenido:** Logo + Progreso del pedido (paso 3/4) + Información de envío

#### 4. **Entregado** ✅
- **Asunto:** ✅ Tu pedido ha sido entregado - Pet Gourmet
- **Mensaje:** Confirmación de entrega exitosa
- **Contenido:** Logo + Progreso completo (4/4) + Agradecimiento

#### 5. **Cancelado** ❌
- **Asunto:** ❌ Tu pedido ha sido cancelado - Pet Gourmet
- **Mensaje:** Información sobre la cancelación
- **Contenido:** Logo + Motivo + Información de reembolso

#### 6. **Reembolsado** 💸
- **Asunto:** 💸 Reembolso procesado - Pet Gourmet
- **Mensaje:** Confirmación del reembolso
- **Contenido:** Logo + Monto reembolsado + Tiempo estimado

---

## 🎨 Diseño del Encabezado

### Encabezado con Logo
```html
<!-- Header Profesional con Gradiente -->
<table style="background: linear-gradient(135deg, #7AB8BF 0%, #5a9aa0 100%);">
  <tr>
    <td>
      <!-- Logo PNG -->
      <img src="https://petgourmet.mx/petgourmet-logo.png" 
           alt="Pet Gourmet" 
           style="max-width: 180px; height: auto;" />
    </td>
    <td style="text-align: right;">
      <!-- Número de Pedido -->
      <div style="background: rgba(255,255,255,0.2); padding: 8px 15px;">
        <p>Pedido</p>
        <p>#PG-12345</p>
      </div>
    </td>
  </tr>
</table>
```

### Características del Diseño:
- ✅ **Fondo degradado** (#7AB8BF → #5a9aa0) - Colores de marca
- ✅ **Logo PNG** en alta calidad
- ✅ **Número de pedido** destacado en badge translúcido
- ✅ **Responsive** - Se adapta a móviles
- ✅ **Compatible** con todos los clientes de correo (Gmail, Outlook, Apple Mail, etc.)

---

## 📂 Formato de Imagen Soportado

### ✅ PNG - Formato Utilizado
**¿Por qué PNG?**
- ✅ Soportado por **todos** los clientes de correo
- ✅ Transparencia de fondo (se ve bien en modo oscuro)
- ✅ Alta calidad sin pérdida de compresión
- ✅ Perfecto para logos con texto y detalles finos

### Otros formatos soportados:
- ✅ **JPG/JPEG** - Bueno para fotos (sin transparencia)
- ✅ **GIF** - Animaciones simples
- ⚠️ **SVG** - NO soportado en correos (problemas de seguridad)
- ⚠️ **WebP** - Soporte limitado en clientes de correo

---

## 🔧 Configuración Técnica

### URLs del Logo

El sistema usa URLs dinámicas según el entorno:

```typescript
const logoUrl = process.env.NEXT_PUBLIC_BASE_URL 
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/petgourmet-logo.png` 
  : 'https://petgourmet.mx/petgourmet-logo.png';
```

**Entornos:**
- 🌐 **Producción:** `https://petgourmet.mx/petgourmet-logo.png`
- 🔧 **Desarrollo:** `http://localhost:3000/petgourmet-logo.png`
- 🧪 **Staging:** Variable según `NEXT_PUBLIC_BASE_URL`

---

## 🧪 Probar el Diseño

### Opción 1: Script de Prueba Visual

```bash
# Generar archivos HTML de prueba
npx tsx scripts/test-email-design.ts

# Se crean archivos en: test-emails/
# - email-pending.html
# - email-processing.html
# - email-shipped.html
# - email-completed.html

# Abre cualquier archivo en tu navegador
open test-emails/email-processing.html
```

### Opción 2: Enviar Email de Prueba Real

```bash
# Editar el archivo con tu email
nano scripts/test-webhook-email.ts

# Cambiar la línea:
const testEmail = 'tu-email@ejemplo.com'

# Ejecutar
npm run test:email
```

---

## 🎯 Ejemplo de Correo Completo

### Vista Previa (Procesando)

```
┌────────────────────────────────────────────┐
│  [LOGO PET GOURMET]          Pedido #12345 │
│  (Fondo degradado azul-verde)              │
└────────────────────────────────────────────┘

¡Gracias por tu compra!

Hola Juan Pérez, estamos preparando tu pedido.

┌────────────────────────────────────────────┐
│         Progreso del Pedido                │
│  ● ──── ● ──── ○ ──── ○                    │
│  1      2      3      4                     │
│  Confirmado  Preparando  Enviado  Entregado│
└────────────────────────────────────────────┘

Resumen del pedido:
• Comida Premium × 2      $800.00
• Snacks Naturales × 1    $150.00

Subtotal:                 $950.00
Envío:                    $100.00
Total:                   $1,050.00 MXN

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dirección de envío:
Juan Pérez
Av. Principal #123
Ciudad de México, CDMX 01234

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

contacto@petgourmet.mx
```

---

## 📊 Tipos de Correo Actualizados

### 1. Correos de Órdenes
- ✅ Confirmación de compra
- ✅ Cambios de estado (6 estados)
- ✅ Notificaciones al admin

### 2. Correos de Suscripciones  
- ✅ Bienvenida a suscripción
- ✅ Renovación automática
- ✅ Cambios de plan
- ✅ Cancelaciones
- ✅ Recordatorios de pago

### 3. Correos Administrativos
- ✅ Nuevos pedidos
- ✅ Alertas de pago
- ✅ Reportes diarios

---

## 🎨 Paleta de Colores

```css
/* Colores Principales */
--primary-color: #7AB8BF;      /* Verde-azul Pet Gourmet */
--primary-dark: #5a9aa0;       /* Variante oscura */
--secondary: #10b981;          /* Verde éxito */
--text-primary: #374151;       /* Texto principal */
--text-secondary: #6b7280;     /* Texto secundario */
--border: #E5E7EB;             /* Bordes sutiles */
--background: #EAECEF;         /* Fondo del email */
```

---

## ✅ Compatibilidad

### Clientes de Correo Probados:
- ✅ **Gmail** (Web + App)
- ✅ **Outlook** (Windows, Mac, Web)
- ✅ **Apple Mail** (iOS, macOS)
- ✅ **Yahoo Mail**
- ✅ **Thunderbird**
- ✅ **Correo Samsung/Android**

### Dispositivos:
- ✅ Desktop (Windows, Mac, Linux)
- ✅ Móvil (iOS, Android)
- ✅ Tablet
- ✅ Webmail

---

## 🔒 Seguridad

### Buenas Prácticas Implementadas:
- ✅ URLs absolutas para imágenes (no relativas)
- ✅ Alt text en todas las imágenes
- ✅ Inline CSS (evita CSS externo bloqueado)
- ✅ Sin JavaScript (no permitido en correos)
- ✅ Imágenes alojadas en dominio propio (no CDN externo)

---

## 📝 Archivos Modificados

```
lib/email-service.ts
└── getOrderStatusTemplate()     ← Logo + Header mejorado
└── getSubscriptionTemplate()    ← Logo + Header mejorado
└── Logo URL dinámico

scripts/test-email-design.ts     ← Nuevo - Para pruebas visuales
```

---

## 🚀 Próximos Pasos

### Mejoras Sugeridas:
1. ⭐ **Agregar tracking de apertura** (píxel transparente)
2. ⭐ **A/B testing** de subject lines
3. ⭐ **Plantillas estacionales** (navidad, etc.)
4. ⭐ **Emails transaccionales** adicionales
5. ⭐ **Newsletter mensual** con logo

---

## 📞 Soporte

Si tienes problemas con los correos:

1. **Verifica SMTP:**
   ```bash
   echo $SMTP_HOST
   echo $SMTP_USER
   ```

2. **Prueba el logo:**
   ```bash
   curl -I https://petgourmet.mx/petgourmet-logo.png
   ```

3. **Revisa logs:**
   ```bash
   tail -f logs/email-service.log
   ```

---

## 📄 Licencia

© 2025 Pet Gourmet - Todos los derechos reservados
