# 🔗 Configurar Webhooks de Stripe en Desarrollo Local

## ❌ Problema Actual

Las órdenes NO aparecen en `/admin/orders` después de completar una compra en desarrollo local.

**Causa**: El webhook de Stripe (`/api/stripe/webhook`) no se ejecuta porque Stripe no puede enviar webhooks a `localhost` directamente.

**Flujo actual:**
```
Checkout ✅ → Stripe Payment ✅ → Webhook ❌ → Orden en DB ❌ → Admin Orders ❌
```

**Flujo correcto:**
```
Checkout ✅ → Stripe Payment ✅ → Webhook ✅ → Orden en DB ✅ → Admin Orders ✅
```

---

## ✅ Solución: Usar Stripe CLI

Stripe CLI es una herramienta que escucha eventos de Stripe y los reenvía a tu servidor local.

---

## 📥 Paso 1: Instalar Stripe CLI

### **Windows (con Chocolatey):**
```powershell
# Si no tienes Chocolatey, instálalo desde: https://chocolatey.org/install

# Instalar Stripe CLI
choco install stripe-cli
```

### **Windows (con Scoop):**
```powershell
# Si no tienes Scoop, instálalo desde: https://scoop.sh

# Instalar Stripe CLI
scoop install stripe
```

### **Windows (descarga directa):**
1. Descarga el instalador: https://github.com/stripe/stripe-cli/releases/latest
2. Busca el archivo: `stripe_X.X.X_windows_x86_64.zip`
3. Extrae el archivo `stripe.exe`
4. Muévelo a una carpeta en tu PATH o a `C:\Program Files\Stripe\`
5. Agrega esa carpeta al PATH del sistema

### **Verificar instalación:**
```powershell
stripe --version
```

Deberías ver algo como: `stripe version 1.x.x`

---

## 🔐 Paso 2: Autenticar con Stripe

```powershell
stripe login
```

1. Se abrirá tu navegador
2. Inicia sesión con tu cuenta de Stripe (PetGourmet)
3. Autoriza el acceso desde la CLI
4. Verás un mensaje: "Done! You're authenticated."

---

## 🎧 Paso 3: Escuchar Webhooks Localmente

### **Terminal 1: Servidor Next.js**
```powershell
# Terminal 1 - Mantén corriendo el servidor de desarrollo
pnpm run dev
```

### **Terminal 2: Stripe CLI**
```powershell
# Terminal 2 - Escuchar webhooks y reenviarlos a tu API local
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

**Salida esperada:**
```
> Ready! You are using Stripe API Version [2024-12-18]. Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

---

## 🔑 Paso 4: Actualizar Webhook Secret

Copia el `webhook signing secret` que te dio el comando anterior.

**Actualiza `.env.local`:**
```env
# Reemplaza con el secret que te dio stripe listen
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**⚠️ IMPORTANTE: Reinicia el servidor después de cambiar .env.local**
```powershell
# En la Terminal 1, presiona Ctrl+C y luego:
Remove-Item -Recurse -Force .next
pnpm run dev
```

---

## 🧪 Paso 5: Probar el Flujo Completo

Con ambas terminales corriendo:

1. **Ve a tu aplicación**: `http://localhost:3000`
2. **Haz una compra de prueba completa**:
   - Agrega un producto al carrito
   - Ve a checkout
   - Completa el pago con tarjeta de prueba: `4242 4242 4242 4242`
3. **Observa la Terminal 2 (Stripe CLI)**:
   ```
   [200] POST /api/stripe/webhook [evt_xxxxx]
   ```
4. **Verifica en `/admin/orders`**:
   - La orden debería aparecer ahora ✅

---

## 📊 Eventos de Webhook Importantes

En la Terminal 2, deberías ver estos eventos:

```
checkout.session.completed     ✅ Pago completado
payment_intent.succeeded       ✅ Intento de pago exitoso
customer.created              ✅ Cliente creado
charge.succeeded              ✅ Cargo exitoso
```

---

## 🔍 Verificar Webhooks en la Base de Datos

Después de completar una compra, verifica:

### **1. Orden creada:**
```sql
SELECT * FROM orders 
WHERE stripe_session_id LIKE 'cs_%' 
ORDER BY created_at DESC 
LIMIT 5;
```

### **2. Items de la orden:**
```sql
SELECT oi.*, o.customer_name, o.total 
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
ORDER BY oi.created_at DESC 
LIMIT 10;
```

---

## 📝 Script de Desarrollo Recomendado

Para facilitar el desarrollo, crea un script que inicie ambos procesos:

**`package.json`** (agregar script):
```json
{
  "scripts": {
    "dev": "next dev",
    "dev:stripe": "stripe listen --forward-to http://localhost:3000/api/stripe/webhook",
    "dev:full": "concurrently \"pnpm dev\" \"pnpm dev:stripe\""
  }
}
```

**Instalar concurrently:**
```powershell
pnpm add -D concurrently
```

**Usar el script completo:**
```powershell
pnpm run dev:full
```

Esto iniciará ambos procesos en paralelo.

---

## ❌ Problemas Comunes

### **Problema: "command not found: stripe"**
**Solución**: 
- Reinicia la terminal después de instalar
- Verifica que esté en el PATH
- Usa la ruta completa: `C:\Program Files\Stripe\stripe.exe`

### **Problema: "Failed to authenticate"**
**Solución**:
```powershell
stripe login
```

### **Problema: "[401] POST /api/stripe/webhook"**
**Causa**: El `STRIPE_WEBHOOK_SECRET` no coincide
**Solución**:
1. Copia el secret de `stripe listen` (empieza con `whsec_`)
2. Actualízalo en `.env.local`
3. Reinicia el servidor con: `Remove-Item -Recurse -Force .next; pnpm run dev`

### **Problema: "Connection refused"**
**Causa**: El servidor de Next.js no está corriendo
**Solución**: Inicia `pnpm run dev` primero, luego `stripe listen`

### **Problema: La orden se crea pero sin items**
**Causa**: Los line_items no tienen metadata de product_id
**Solución**: Verifica que el checkout session incluya metadata con product_id

---

## 🚀 Configuración para Producción

En producción, los webhooks funcionan automáticamente:

### **1. Crear webhook en Stripe Dashboard:**
1. Ve a: https://dashboard.stripe.com/webhooks
2. Haz clic en "Add endpoint"
3. URL: `https://petgourmet.mx/api/stripe/webhook`
4. Eventos a escuchar:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copia el **Signing secret** (empieza con `whsec_`)

### **2. Configurar en Vercel:**
Variables de entorno en Vercel:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx_de_produccion
```

---

## 📋 Checklist de Configuración

Antes de probar, verifica:

- [ ] ✅ Stripe CLI instalado (`stripe --version`)
- [ ] ✅ Autenticado con Stripe (`stripe login`)
- [ ] ✅ Servidor Next.js corriendo (`pnpm run dev`)
- [ ] ✅ Stripe CLI escuchando (`stripe listen --forward-to ...`)
- [ ] ✅ `STRIPE_WEBHOOK_SECRET` actualizado en `.env.local`
- [ ] ✅ Servidor reiniciado después de cambiar `.env.local`
- [ ] ✅ Carpeta `.next` borrada antes de reiniciar

---

## 🆘 Logs para Debugging

### **Ver logs del webhook en tu código:**
Agrega esto temporalmente en `app/api/stripe/webhook/route.ts`:

```typescript
export async function POST(request: NextRequest) {
  console.log('🔵 [WEBHOOK] Recibiendo evento de Stripe...')
  
  try {
    // ... código existente
    console.log('🟢 [WEBHOOK] Evento procesado:', event.type)
  } catch (error) {
    console.error('🔴 [WEBHOOK] Error:', error)
  }
}
```

### **Ver eventos recibidos por Stripe CLI:**
```powershell
stripe listen --forward-to http://localhost:3000/api/stripe/webhook --print-json
```

---

## 📞 Siguiente Paso

Después de configurar Stripe CLI:

1. **Prueba el flujo completo** con una compra de prueba
2. **Verifica en `/admin/orders`** que aparezca la orden
3. **Revisa los logs** en ambas terminales para debugging

**¿Ya instalaste Stripe CLI? ¿Necesitas ayuda con algún paso específico?**
