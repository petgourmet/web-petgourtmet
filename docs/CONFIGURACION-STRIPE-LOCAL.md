# 🔧 Configuración de Stripe para Desarrollo Local

## ❌ Error Actual

```
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
POST http://localhost:3000/api/stripe/create-checkout 500 (Internal Server Error)
```

**Causa**: Faltan las variables de entorno de Stripe en tu entorno de desarrollo local.

---

## ✅ Solución: Configurar Variables de Entorno

### **Paso 1: Obtener Claves de Stripe**

1. **Inicia sesión en Stripe Dashboard**
   - Ve a: https://dashboard.stripe.com/
   - Inicia sesión con tu cuenta de PetGourmet

2. **Accede a la sección de API Keys**
   - Dashboard → Developers → API keys
   - O directo: https://dashboard.stripe.com/apikeys

3. **Copia las siguientes claves:**

   **Para Testing (Desarrollo):**
   - ✅ **Publishable key** (empieza con `pk_test_...`)
   - ✅ **Secret key** (empieza con `sk_test_...`)
   
   **Para Producción:**
   - ⚠️ **Publishable key** (empieza con `pk_live_...`)
   - ⚠️ **Secret key** (empieza con `sk_live_...`)

---

### **Paso 2: Crear archivo .env.local**

1. **Crea el archivo en la raíz del proyecto:**
   ```bash
   # En PowerShell
   New-Item -Path ".env.local" -ItemType File
   ```

2. **Copia el contenido de `.env.example`:**
   ```bash
   Copy-Item .env.example .env.local
   ```

3. **Edita `.env.local` con tus claves:**

```env
# ==============================================
# STRIPE - Configuración de Pagos
# ==============================================

# CLAVES DE PRUEBA (Testing) - Usar en desarrollo local
STRIPE_SECRET_KEY=sk_test_51ABC123...tu_clave_secreta_de_prueba
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...tu_clave_publica_de_prueba

# Webhook Secret (opcional para desarrollo local)
STRIPE_WEBHOOK_SECRET=whsec_...tu_webhook_secret

# Moneda
NEXT_PUBLIC_STRIPE_CURRENCY=mxn

# ==============================================
# URLS
# ==============================================
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# ==============================================
# SUPABASE (Ya deberías tenerlas configuradas)
# ==============================================
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...tu_anon_key
```

---

### **Paso 3: Reiniciar el Servidor de Desarrollo**

1. **Detén el servidor** (Ctrl+C en la terminal)

2. **Reinicia el servidor:**
   ```bash
   pnpm run dev
   ```

3. **Verifica que las variables se cargaron:**
   - El servidor debe arrancar sin errores
   - No debería aparecer el error: `STRIPE_SECRET_KEY no está configurada`

---

## 🧪 Verificar Configuración

### **Método 1: Desde la Terminal**

```bash
# Verificar que las variables están cargadas
node -e "require('dotenv').config({path:'.env.local'}); console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Configurada' : '❌ No encontrada')"
```

### **Método 2: En el Código (Temporal)**

Agrega esto temporalmente en `app/checkout/page.tsx`:

```typescript
useEffect(() => {
  console.log('🔍 Verificando Stripe:', {
    hasPublicKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    publicKeyPrefix: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 10)
  })
}, [])
```

---

## 🧪 Probar el Checkout

Una vez configurado, prueba el flujo de compra con **tarjetas de prueba de Stripe**:

### **Tarjetas de Prueba:**

| Escenario | Número de Tarjeta | Fecha | CVC | ZIP |
|-----------|-------------------|-------|-----|-----|
| ✅ Pago exitoso | `4242 4242 4242 4242` | Cualquier futura | Cualquier 3 dígitos | Cualquier |
| ❌ Pago rechazado | `4000 0000 0000 0002` | Cualquier futura | Cualquier 3 dígitos | Cualquier |
| ⚠️ Requiere autenticación | `4000 0025 0000 3155` | Cualquier futura | Cualquier 3 dígitos | Cualquier |

Más tarjetas de prueba: https://docs.stripe.com/testing#cards

---

## 🔐 Seguridad Importante

### **NUNCA subas el archivo .env.local a Git:**

1. **Verifica que `.env.local` esté en `.gitignore`:**
   ```bash
   # Debería mostrar .env.local
   cat .gitignore | grep .env
   ```

2. **Si no está, agrégalo:**
   ```bash
   echo ".env.local" >> .gitignore
   ```

3. **Verifica que no esté en staging:**
   ```bash
   git status
   # No debería aparecer .env.local
   ```

---

## 🚀 Configuración para Producción

Cuando despliegues a producción (Vercel, etc.):

### **1. En Vercel Dashboard:**
   - Project Settings → Environment Variables
   - Agrega las mismas variables pero con las claves **LIVE** (`pk_live_...`, `sk_live_...`)

### **2. Variables de Producción:**
```env
STRIPE_SECRET_KEY=sk_live_...tu_clave_secreta_REAL
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...tu_clave_publica_REAL
STRIPE_WEBHOOK_SECRET=whsec_...tu_webhook_REAL
NEXT_PUBLIC_SITE_URL=https://petgourmet.com.mx
```

---

## 📞 Troubleshooting

### **Error: "STRIPE_SECRET_KEY no está configurada"**
✅ **Solución**: Crea `.env.local` con tus claves de Stripe

### **Error: "Invalid API Key provided"**
✅ **Solución**: Verifica que copiaste la clave completa (empieza con `sk_test_` o `sk_live_`)

### **Error: "No such customer"**
✅ **Solución**: Estás usando claves de test pero datos de producción (o viceversa)

### **El checkout se abre pero falla al procesar**
✅ **Solución**: 
1. Verifica que `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` esté configurada
2. Reinicia el servidor después de agregar variables
3. Usa tarjetas de prueba de Stripe

---

## 📚 Referencias

- [Stripe API Keys](https://dashboard.stripe.com/apikeys)
- [Stripe Testing](https://docs.stripe.com/testing)
- [Stripe Checkout Docs](https://docs.stripe.com/checkout/quickstart)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

