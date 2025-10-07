# 🧪 CONFIGURACIÓN: Modo de Pruebas (Desarrollo en Colombia para México)

**Fecha**: 6 de octubre de 2025  
**Problema**: Error "Cannot operate between different countries"  
**Solución**: Configurar modo de pruebas (sandbox) de MercadoPago

---

## ❌ PROBLEMA

### Error Reportado
```
❌ Error de MercadoPago: {
  "message": "Cannot operate between different countries",
  "status": 400
}
```

### Causa
Estás desarrollando desde **Colombia** pero el proyecto es para **México**. MercadoPago no permite operaciones entre diferentes países en producción.

---

## ✅ SOLUCIÓN

### Opción 1: Modo de Pruebas (RECOMENDADO)

Usa las **credenciales de prueba** de MercadoPago México que funcionan desde cualquier país.

#### Paso 1: Obtener Credenciales de Prueba

1. **Ir a MercadoPago Developers**
   ```
   https://www.mercadopago.com.mx/developers/panel/app
   ```

2. **Seleccionar tu aplicación** (o crear una nueva)

3. **Ir a "Credenciales"**

4. **Copiar las credenciales de PRUEBAS**:
   - Access Token de Prueba (empieza con `TEST-`)
   - Public Key de Prueba (empieza con `TEST-`)

#### Paso 2: Configurar Variables de Entorno

Crea o edita el archivo `.env.local` en la raíz del proyecto:

```env
# ============================================
# MODO DE PRUEBAS (DESARROLLO)
# ============================================
NEXT_PUBLIC_PAYMENT_TEST_MODE=true

# Credenciales de PRUEBA de MercadoPago México
MERCADOPAGO_ACCESS_TOKEN_TEST=TEST-1234567890-123456-abcdefghijklmnopqrstuvwxyz-123456789
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_TEST=TEST-abcd1234-5678-90ab-cdef-1234567890ab
MERCADOPAGO_WEBHOOK_SECRET_TEST=test_webhook_secret_here

# Credenciales de Cliente (Pruebas)
CLIENT_ID_TEST=1234567890123456
CLIENT_SECRET_TEST=abcdefghijklmnopqrstuvwxyz123456

# ============================================
# CONFIGURACIÓN GENERAL
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (mantener tus credenciales actuales)
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

#### Paso 3: Reiniciar el Servidor

```bash
# Detener el servidor (Ctrl+C)
# Iniciar de nuevo
npm run dev
# o
pnpm dev
```

#### Paso 4: Verificar Configuración

El sistema automáticamente detectará el modo de pruebas y mostrará:

```
🧪 MODO DE PRUEBAS ACTIVO
Usando credenciales de sandbox
```

---

## 🔍 CÓMO VERIFICAR QUE FUNCIONA

### 1. Logs al Crear Suscripción

Deberías ver:
```
✅ Modo de pruebas activo
🔑 Usando Access Token de TEST
💰 Moneda: MXN (sandbox)
```

### 2. URLs de MercadoPago

En modo de pruebas, las URLs incluirán "sandbox":
```
https://sandbox.mercadopago.com.mx/subscriptions/checkout?preapproval_id=...
```

### 3. Datos de Prueba

Usa las **tarjetas de prueba** de MercadoPago:

#### Tarjetas Aprobadas
```
Número: 5031 7557 3453 0604
CVV: 123
Vencimiento: 11/25
Nombre: APRO (cualquier nombre)
```

#### Tarjetas Rechazadas (para probar errores)
```
Número: 5031 4332 1540 6351
CVV: 123
Vencimiento: 11/25
Nombre: OXXO (rechazada)
```

---

## 🛠️ CONFIGURACIÓN TÉCNICA

### Archivo: `lib/mercadopago-config.ts`

El sistema ya tiene la lógica para detectar el modo:

```typescript
export function isTestMode(): boolean {
  return process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === 'true'
}

export function getMercadoPagoAccessToken(): string {
  const config = getMercadoPagoConfig()
  if (!config.accessToken) {
    throw new Error(`Access Token no configurado`)
  }
  return config.accessToken
}
```

### Archivo: `app/api/mercadopago/create-subscription-preference/route.ts`

Ya usa la configuración correcta:

```typescript
import { getMercadoPagoAccessToken } from '@/lib/mercadopago-config'

const accessToken = getMercadoPagoAccessToken() // ✅ Obtiene el correcto según el modo
```

---

## 📋 CHECKLIST DE CONFIGURACIÓN

- [ ] Obtener credenciales de PRUEBA de MercadoPago México
- [ ] Crear/editar archivo `.env.local`
- [ ] Agregar `NEXT_PUBLIC_PAYMENT_TEST_MODE=true`
- [ ] Agregar `MERCADOPAGO_ACCESS_TOKEN_TEST`
- [ ] Agregar `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_TEST`
- [ ] Reiniciar servidor de desarrollo
- [ ] Probar creación de suscripción
- [ ] Verificar que redirige a sandbox
- [ ] Completar pago con tarjeta de prueba
- [ ] Verificar activación automática

---

## ⚠️ IMPORTANTE

### NO Mezclar Credenciales

```
❌ INCORRECTO:
NEXT_PUBLIC_PAYMENT_TEST_MODE=true
MERCADOPAGO_ACCESS_TOKEN_TEST=APP-prod-token-real  # ❌ Token de producción

✅ CORRECTO:
NEXT_PUBLIC_PAYMENT_TEST_MODE=true
MERCADOPAGO_ACCESS_TOKEN_TEST=TEST-1234567890...  # ✅ Token de prueba
```

### Producción vs Desarrollo

```env
# DESARROLLO (Colombia → México)
NEXT_PUBLIC_PAYMENT_TEST_MODE=true
MERCADOPAGO_ACCESS_TOKEN_TEST=TEST-...

# PRODUCCIÓN (Solo en servidor en México)
NEXT_PUBLIC_PAYMENT_TEST_MODE=false
MERCADOPAGO_ACCESS_TOKEN_PROD=APP-...
```

---

## 🌐 Opción 2: VPN (No Recomendado)

Si prefieres usar credenciales de producción:

1. **Usar VPN** con servidor en México
2. Cambiar tu IP a una mexicana
3. Mantener `NEXT_PUBLIC_PAYMENT_TEST_MODE=false`

**⚠️ NO RECOMENDADO**: Es mejor usar el modo de pruebas oficial.

---

## 🔧 TROUBLESHOOTING

### Error: "Access Token no configurado"

```
✅ Solución: Verificar que .env.local tiene:
MERCADOPAGO_ACCESS_TOKEN_TEST=TEST-...
```

### Error: "Cannot operate between different countries" persiste

```
✅ Verificar:
1. NEXT_PUBLIC_PAYMENT_TEST_MODE=true
2. Reiniciar servidor (npm run dev)
3. Limpiar cache del navegador
4. Verificar que el token empiece con "TEST-"
```

### Webhook no funciona en localhost

```
✅ Es normal. Los webhooks de MercadoPago no llegan a localhost.
Opciones:
- Usar ngrok para exponer tu servidor
- Probar webhooks en ambiente de staging/producción
- Simular webhooks manualmente en desarrollo
```

---

## 📚 RECURSOS

### Documentación Oficial
- [MercadoPago - Credenciales de Prueba](https://www.mercadopago.com.mx/developers/es/docs/checkout-api/additional-content/your-integrations/credentials)
- [MercadoPago - Tarjetas de Prueba](https://www.mercadopago.com.mx/developers/es/docs/checkout-api/additional-content/your-integrations/test/cards)
- [MercadoPago - Webhooks en Pruebas](https://www.mercadopago.com.mx/developers/es/docs/checkout-api/additional-content/your-integrations/notifications/webhooks)

### Archivos del Proyecto
- Configuración: `/lib/mercadopago-config.ts`
- API de Suscripciones: `/app/api/mercadopago/create-subscription-preference/route.ts`
- Variables de Entorno: `.env.local` (crear si no existe)

---

## ✅ RESULTADO ESPERADO

### Antes (Error)
```
❌ Error: Cannot operate between different countries
Status: 400
```

### Después (Funcional)
```
✅ Modo de pruebas activo
✅ Preapproval creado exitosamente
✅ Redirigiendo a: https://sandbox.mercadopago.com.mx/...
```

---

## 🎯 NEXT STEPS

1. **Configurar modo de pruebas** (este documento)
2. **Probar flujo completo** de suscripción
3. **Verificar activación automática** funcione
4. **Documentar casos de prueba** exitosos
5. **Preparar despliegue** a producción (cuando sea el momento)

---

**Creado**: 6 de octubre de 2025  
**Última actualización**: 6 de octubre de 2025  
**Estado**: ✅ DOCUMENTADO
