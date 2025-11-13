# 🚨 Solución: Correos No Se Envían en Producción

## Problemas Identificados

### 1. ❌ reCAPTCHA Bloqueando en Localhost
**Error**: "El host local no está en la lista de dominios admitidos"
**Causa**: Google reCAPTCHA no permite localhost por defecto

### 2. ❌ Correos No Se Envían en Producción
**Posibles Causas**:
- Cloudflare bloqueando webhooks de Stripe
- Timeouts en procesamiento de emails
- Variables de entorno no configuradas en producción
- Bloqueo de puerto SMTP (465/587)

---

## ✅ Soluciones Implementadas

### 1. Bypass de reCAPTCHA en Desarrollo

**Archivo Modificado**: `app/api/security/verify-recaptcha/route.ts`

```typescript
// MODO DESARROLLO: Bypass de reCAPTCHA en localhost
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     request.headers.get('host')?.includes('localhost')

if (isDevelopment) {
  console.log('🔧 [DEV] Bypass de reCAPTCHA en desarrollo')
  return NextResponse.json({
    success: true,
    score: 0.9,
    action: action || 'development',
    timestamp: new Date().toISOString(),
    development: true
  })
}
```

**Resultado**: 
- ✅ Formularios funcionan en localhost
- ✅ reCAPTCHA sigue activo en producción
- ✅ No requiere configurar dominios en Google

---

### 2. Configuración de Cloudflare para Webhooks

#### A. Reglas de Página (Page Rules)

En Cloudflare Dashboard → **Reglas de Página**:

**Regla 1: Bypass para Webhooks de Stripe**
```
URL: petgourmet.mx/api/stripe/webhook*
Configuración:
  - Cache Level: Bypass
  - Security Level: Essentially Off
  - Disable Performance
  - Disable Apps
```

**Regla 2: Bypass para Webhooks de MercadoPago**
```
URL: petgourmet.mx/api/subscriptions/webhook*
Configuración:
  - Cache Level: Bypass
  - Security Level: Essentially Off
  - Disable Performance
```

#### B. Reglas WAF (Firewall)

En Cloudflare → **Security** → **WAF**:

**Crear Regla Custom**:
```
Nombre: Allow Stripe Webhooks
Campo: URI Path
Operador: equals
Valor: /api/stripe/webhook
Acción: Skip (All remaining custom rules)
```

**Crear Regla Custom para MercadoPago**:
```
Nombre: Allow MercadoPago Webhooks
Campo: URI Path
Operador: equals
Valor: /api/subscriptions/webhook
Acción: Skip (All remaining custom rules)
```

#### C. SSL/TLS Configuración

En Cloudflare → **SSL/TLS**:
- Modo: **Full (strict)**
- TLS Minimum Version: **TLS 1.2**
- Automatic HTTPS Rewrites: **Activado**

#### D. Network Settings

En Cloudflare → **Network**:
- WebSockets: **Activado**
- HTTP/2: **Activado**
- HTTP/3 (with QUIC): **Activado**

---

### 3. Verificar Variables de Entorno en Producción

En **Vercel Dashboard** o donde esté desplegado:

```bash
# SMTP Configuration
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contacto@petgourmet.mx
SMTP_PASS=tu_password
EMAIL_FROM="Pet Gourmet <contacto@petgourmet.mx>"

# reCAPTCHA
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6LdNrewrAAAAAG7fdbsHUO-hDJ6ygTkJ8gXQ9ib0
RECAPTCHA_SECRET_KEY=6LdNrewrAAAAAPYTx7ajxkWVsQJGvvLok8vQZEuf

# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

### 4. Configurar Webhooks en Stripe

#### URL del Webhook:
```
https://petgourmet.mx/api/stripe/webhook
```

#### Eventos a Escuchar:
```
✅ checkout.session.completed
✅ payment_intent.succeeded
✅ customer.subscription.created
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ invoice.payment_succeeded
✅ invoice.payment_failed
```

#### Cómo Configurar:
1. Ir a [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Ingresar URL: `https://petgourmet.mx/api/stripe/webhook`
4. Seleccionar eventos listados arriba
5. Copiar **Signing Secret** (whsec_xxx)
6. Agregar a variables de entorno: `STRIPE_WEBHOOK_SECRET`

---

### 5. Testing de Webhooks

#### A. Stripe CLI (Local Testing)

```bash
# Instalar Stripe CLI
# Windows (con Scoop)
scoop install stripe

# Login
stripe login

# Forward webhooks a localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger evento de prueba
stripe trigger checkout.session.completed
```

#### B. Stripe Dashboard (Production Testing)

1. Ir a **Developers** → **Webhooks**
2. Seleccionar tu endpoint
3. Click en **Send test webhook**
4. Seleccionar `checkout.session.completed`
5. Verificar logs en dashboard

---

### 6. Logs Mejorados para Debugging

El código ya incluye logs detallados:

```typescript
// En webhook de Stripe
console.log('[EMAIL-SERVICE] Iniciando envío de correo...')
console.log('[EMAIL-SERVICE] ✅ Correo enviado exitosamente')
console.log('[EMAIL-SERVICE] ❌ Error enviando correo:', error)

// En verify-recaptcha
console.log('🔧 [DEV] Bypass de reCAPTCHA en desarrollo')
```

#### Ver logs en Producción:

**Vercel**:
```bash
vercel logs petgourmet --follow
```

**Netlify**:
- Dashboard → Functions → Ver logs en tiempo real

---

## 🔍 Checklist de Debugging

### En Desarrollo (localhost):

- [ ] ✅ reCAPTCHA bypass activo (ver log "🔧 [DEV] Bypass...")
- [ ] ✅ Formulario de newsletter funciona
- [ ] ✅ No error "host local no está en lista de dominios"
- [ ] ✅ SMTP configurado en .env.local
- [ ] ✅ Email de prueba enviado con script

### En Producción:

#### Cloudflare:
- [ ] ⚙️ Page Rules creadas para /api/stripe/webhook
- [ ] ⚙️ Page Rules creadas para /api/subscriptions/webhook
- [ ] ⚙️ WAF custom rules creadas
- [ ] ⚙️ SSL/TLS en modo Full (strict)
- [ ] ⚙️ WebSockets activados

#### Stripe:
- [ ] ⚙️ Webhook endpoint configurado
- [ ] ⚙️ URL correcta: https://petgourmet.mx/api/stripe/webhook
- [ ] ⚙️ Eventos configurados (checkout.session.completed, etc.)
- [ ] ⚙️ Signing secret copiado a variables de entorno
- [ ] ⚙️ Webhook activo (no deshabilitado)

#### Variables de Entorno:
- [ ] ⚙️ SMTP_HOST configurado
- [ ] ⚙️ SMTP_USER configurado
- [ ] ⚙️ SMTP_PASS configurado
- [ ] ⚙️ STRIPE_WEBHOOK_SECRET configurado
- [ ] ⚙️ SUPABASE_SERVICE_ROLE_KEY configurado
- [ ] ⚙️ RECAPTCHA_SECRET_KEY configurado

#### Testing:
- [ ] 🧪 Completar compra de prueba en producción
- [ ] 🧪 Verificar logs de Vercel/Netlify
- [ ] 🧪 Verificar webhook delivery en Stripe Dashboard
- [ ] 🧪 Verificar orden creada en Supabase
- [ ] 🧪 Verificar email recibido
- [ ] 🧪 Verificar no hay errores 500 en webhook

---

## 📊 Monitoreo de Emails

### Ver Estado de Webhooks en Stripe:

1. Dashboard → **Developers** → **Webhooks**
2. Seleccionar endpoint
3. Ver **"Request logs"**
4. Verificar status codes:
   - `200 OK`: ✅ Webhook procesado correctamente
   - `500 Error`: ❌ Error en servidor
   - `Timeout`: ⏱️ Respuesta demoró más de 30s

### Ver Emails Enviados:

#### Logs de Servidor:
```bash
# Buscar en logs
grep "EMAIL-SERVICE" logs.txt
grep "✅ Correo" logs.txt
grep "❌ Error" logs.txt
```

#### En GoDaddy/Secureserver:
- Login a panel de email
- Revisar **"Sent"** folder
- Verificar emails enviados

---

## 🚨 Problemas Comunes y Soluciones

### Problema 1: Webhook Timeout

**Síntoma**: Stripe reporta timeout después de 30 segundos

**Causa**: Procesamiento de email toma demasiado tiempo

**Solución**: Ya implementado con reintentos
```typescript
// El email se envía con reintentos automáticos
await sendOrderStatusEmail('pending', customerEmail, orderData, 3)
```

### Problema 2: Cloudflare Bloquea Webhook

**Síntoma**: Webhook recibe 403 Forbidden o 524 Timeout

**Solución**: 
1. Verificar Page Rules están activas
2. Verificar WAF no tiene reglas que bloqueen
3. Temporalmente deshabilitar **"I'm Under Attack Mode"**

### Problema 3: Email No Llega

**Síntoma**: Webhook funciona pero email no llega

**Causas Posibles**:
- Credenciales SMTP incorrectas
- Puerto bloqueado (465/587)
- Email en carpeta SPAM
- Servidor SMTP rechaza dominio receptor

**Debugging**:
```bash
# Ver logs específicos de email
grep "EMAIL-SERVICE" vercel-logs.txt

# Buscar errores SMTP
grep "SMTP" vercel-logs.txt
grep "EAUTH" vercel-logs.txt
grep "ECONNREFUSED" vercel-logs.txt
```

### Problema 4: Variables de Entorno No Disponibles

**Síntoma**: `process.env.SMTP_HOST` es undefined en producción

**Solución**:
1. Verificar variables en dashboard de hosting
2. Re-deploy después de agregar variables
3. Verificar nombres exactos (case-sensitive)

---

## 🎯 Prueba Final

### Script de Prueba Completo:

```bash
# 1. Verificar desarrollo local
pnpm run dev
# Ir a http://localhost:3000
# Probar formulario de newsletter
# Verificar log: "🔧 [DEV] Bypass de reCAPTCHA"

# 2. Verificar SMTP local
npx tsx scripts/test-smtp.ts
# Verificar email llega a cristoferscalante@gmail.com

# 3. Deploy a producción
vercel --prod
# o
git push origin main

# 4. Prueba en producción
# Ir a https://petgourmet.mx
# Completar compra de prueba con Stripe test mode
# Verificar:
#   - Orden en Supabase
#   - Webhook en Stripe Dashboard (200 OK)
#   - Email recibido

# 5. Ver logs de producción
vercel logs --follow
# Buscar: "[EMAIL-SERVICE] ✅ Correo enviado"
```

---

## 📞 Contacto y Soporte

Si después de seguir estos pasos los correos no se envían:

1. **Exportar logs completos**:
```bash
vercel logs > logs-production.txt
```

2. **Verificar webhook delivery en Stripe**:
   - Screenshot de request logs
   - Response body del último webhook

3. **Verificar configuración SMTP**:
   - Contactar a GoDaddy para verificar cuenta activa
   - Verificar no hay límite de envío alcanzado

4. **Alternativa temporal**:
   - Usar servicio de email como SendGrid o Resend
   - Más fiable que SMTP directo

---

## ✅ Resultado Esperado

Después de aplicar todos los cambios:

- ✅ Formularios funcionan en localhost sin error de reCAPTCHA
- ✅ Webhooks de Stripe se procesan correctamente (200 OK)
- ✅ Órdenes se crean en Supabase
- ✅ Emails de confirmación se envían automáticamente
- ✅ Cloudflare no interfiere con el proceso
- ✅ Logs detallados disponibles para debugging
