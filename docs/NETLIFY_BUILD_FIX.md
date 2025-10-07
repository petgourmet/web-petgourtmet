# 🚨 FIX: Error de Build en Netlify

## Fecha: 7 de octubre de 2025

## ❌ Problema

El build de Netlify estaba fallando con dos errores:

1. **NODE_ENV no estándar:**
   ```
   ⚠ You are using a non-standard "NODE_ENV" value in your environment.
   ```

2. **Error de prerendering:**
   ```
   Error: <Html> should not be imported outside of pages/_document.
   Export encountered an error on /_error: /404
   ```

---

## ✅ Solución Aplicada

### 1. Separación de Configuraciones de Entorno

**Antes:** Un solo archivo `.env` para desarrollo y producción (❌ Conflicto)

**Después:** Configuraciones separadas

#### `.env` (Para Producción - Netlify)
```env
NODE_ENV=production
NEXT_PUBLIC_VERCEL_ENV=production
NEXT_PUBLIC_APP_URL=https://petgourmet.mx
# ... otras variables de producción
```

#### `.env.local` (Para Desarrollo Local - NO se sube a Git)
```env
NODE_ENV=development
NEXT_PUBLIC_VERCEL_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
# ... configuración local con VPN
```

### 2. Configuración de Netlify

Creado `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_ENV = "production"
  NEXT_PUBLIC_VERCEL_ENV = "production"
```

### 3. Fix de Redirección 404

**Archivo:** `/components/checkout-modal.tsx`

**Cambio:**
```typescript
// ❌ ANTES (causaba 404)
router.push('/perfil/suscripciones')

// ✅ DESPUÉS
router.push('/perfil?tab=subscriptions')
```

---

## 📋 Archivos Modificados

1. `.env` - NODE_ENV cambiado a production
2. `.env.local` - Creado para desarrollo local
3. `netlify.toml` - Configuración explícita de Netlify
4. `components/checkout-modal.tsx` - Fix de redirección

---

## 🔄 Próximos Pasos para Deploy

### 1. Commit y Push
```bash
git add .env netlify.toml
git commit -m "fix: configuración de producción para Netlify"
git push origin main
```

### 2. Variables de Entorno en Netlify

Ve al dashboard de Netlify y configura estas variables:

**Environment Variables → Production:**

```
# Mercadopago Producción
MERCADOPAGO_ACCESS_TOKEN=APP_USR-1329434229865091-...
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-78b50431-...
MERCADOPAGO_WEBHOOK_SECRET=a0415e8553f3af7ce77fdcb6944e556aff7e2ee938d73731f5977dba2640ed5
CLIENT_ID=1329434229865091
CLIENT_SECRET=lwnfaQor6VAgPnTB5Q9NzXVsWBTCJjwX

# URLs Producción
NEXT_PUBLIC_APP_URL=https://petgourmet.mx
NEXT_PUBLIC_BASE_URL=https://petgourmet.mx
NEXT_PUBLIC_SITE_URL=https://petgourmet.mx
NEXTAUTH_URL=https://petgourmet.mx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://kwhubfkvpvrlawpylopc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=petgourmet
NEXT_PUBLIC_CLOUDINARY_API_KEY=334592494758718
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ml_default
CLOUDINARY_API_SECRET=RFWBnhTH0bLNZJKtmGg4PZQ8exA

# Email SMTP
EMAIL_FROM=Pet Gourmet <contacto@petgourmet.mx>
SMTP_FROM=contacto@petgourmet.mx
SMTP_HOST=smtpout.secureserver.net
SMTP_USER=contacto@petgourmet.mx
SMTP_PASS=PGMexico1$
SMTP_PORT=465
SMTP_SECURE=true

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-W4V4C0VK09
NEXT_PUBLIC_FB_PIXEL_ENABLED=true
NEXT_PUBLIC_FB_PIXEL_ID=840370127164134

# Seguridad
NEXTAUTH_SECRET=K8mN2pQ7vX9zB4cF6hJ8kL1mN5pR7tY9uW2eR5tY8uI1oP4sD6fG9hJ2kL5nQ8r
CRON_SECRET=cron-secret-super-seguro-petgourmet-2025

# Configuración
NEXT_PUBLIC_PAYMENT_TEST_MODE=false
NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT=production
NEXT_PUBLIC_MERCADOPAGO_LOCALE=es-MX
USE_MERCADOPAGO_MOCK=false
ENABLE_DETAILED_LOGGING=true
LOG_LEVEL=info
```

### 3. Trigger Manual Deployment

En Netlify dashboard:
1. Ve a "Deploys"
2. Clic en "Trigger deploy"
3. Selecciona "Deploy site"

---

## 🧪 Testing Local Después del Fix

Para desarrollo local, ahora usas `.env.local`:

```bash
# Detener servidor
Stop-Process -Name node -Force

# Reiniciar (usará .env.local automáticamente)
pnpm run dev
```

---

## ⚠️ Importante: Separación de Entornos

### Desarrollo Local (con `.env.local`)
- `NODE_ENV=development`
- URLs de localhost
- Logging detallado
- Puede usar credenciales de producción con VPN

### Producción Netlify (con variables de entorno)
- `NODE_ENV=production`
- URLs de producción (petgourmet.mx)
- Logging moderado
- Credenciales de producción

---

## 🔍 Verificación del Build

Después del deploy, verifica:

1. **Build logs en Netlify** - No debe haber warnings de NODE_ENV
2. **Página 404** - Debe funcionar correctamente
3. **Rutas dinámicas** - Todas deben prerenderse sin error
4. **Productos** - Deben cargar desde Supabase
5. **Checkout** - Debe redirigir correctamente

---

## 📚 Referencias

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Next.js on Netlify](https://docs.netlify.com/integrations/frameworks/next-js/)

---

**Estado:** ✅ Fix aplicado, listo para commit y deploy  
**Próximo paso:** Commit, push y configurar variables en Netlify
