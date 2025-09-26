# 🚨 GUÍA CRÍTICA: Corrección Error 500 Webhook MercadoPago

## ❌ PROBLEMA IDENTIFICADO

El webhook de MercadoPago está fallando con **Error 500** debido a una **configuración inconsistente** en las variables de entorno:

### 🔍 Causa Raíz:
- **Tokens de SANDBOX** configurados en entorno de **PRODUCCIÓN**
- `NODE_ENV=production` pero `MERCADOPAGO_ACCESS_TOKEN` es de sandbox
- `USE_MERCADOPAGO_MOCK=true` (incorrecto para producción)

### 📊 Configuración Actual Problemática:
```bash
# ❌ CONFIGURACIÓN INCORRECTA ACTUAL
NODE_ENV=production
NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT=production
MERCADOPAGO_ACCESS_TOKEN=APP_USR-1329434229865091-... # ❌ TOKEN SANDBOX
USE_MERCADOPAGO_MOCK=true # ❌ INCORRECTO PARA PRODUCCIÓN
```

## ✅ SOLUCIÓN PASO A PASO

### 1. 🔑 Obtener Credenciales de Producción

#### Acceder al Panel de MercadoPago:
1. Ir a [MercadoPago Developers](https://www.mercadopago.com.mx/developers)
2. Iniciar sesión con la cuenta de producción de PetGourmet
3. Seleccionar la aplicación de PetGourmet
4. Ir a **"Credenciales"** → **"Credenciales de producción"**

#### Obtener los siguientes valores:
- **Access Token**: `APP_USR-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX-XXXXXXXXX`
- **Public Key**: `APP_USR-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`

### 2. 🔐 Configurar Webhook Secret

#### En el Panel de MercadoPago:
1. Ir a **"Webhooks"** → **"Configurar webhooks"**
2. Verificar que la URL del webhook sea: `https://petgourmet.mx/api/mercadopago/webhook`
3. Copiar o generar el **Webhook Secret**

### 3. 📝 Actualizar Variables de Entorno

#### Reemplazar en `.env` (o usar `.env.production`):
```bash
# ✅ CONFIGURACIÓN CORRECTA PARA PRODUCCIÓN
NODE_ENV=production
NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT=production

# Credenciales REALES de producción
MERCADOPAGO_ACCESS_TOKEN=[ACCESS_TOKEN_REAL_PRODUCCION]
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=[PUBLIC_KEY_REAL_PRODUCCION]
MERCADOPAGO_WEBHOOK_SECRET=[WEBHOOK_SECRET_REAL_PRODUCCION]

# Configuración de producción
NEXT_PUBLIC_PAYMENT_TEST_MODE=false
USE_MERCADOPAGO_MOCK=false
```

### 4. 🚀 Desplegar y Verificar

#### Después de actualizar las variables:
1. **Redesplegar la aplicación** en Vercel/producción
2. **Probar el webhook** desde el panel de MercadoPago
3. **Verificar logs** para confirmar que no hay errores 500

## 🧪 VERIFICACIÓN DE LA CORRECCIÓN

### Probar Webhook Manualmente:
```bash
# Desde el panel de MercadoPago, enviar webhook de prueba
# O usar curl:
curl -X POST https://petgourmet.mx/api/mercadopago/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: [FIRMA_VALIDA]" \
  -d '{
    "action": "payment.updated",
    "api_version": "v1",
    "data": {"id": "123456"},
    "date_created": "2025-09-26T17:48:13Z",
    "id": 125030034984,
    "live_mode": true,
    "type": "payment",
    "user_id": "1227980651"
  }'
```

### Respuesta Esperada:
```json
{
  "success": true,
  "message": "Webhook procesado",
  "type": "payment",
  "action": "payment.updated",
  "timestamp": "2025-09-26T18:00:00.000Z"
}
```

## 🔍 MONITOREO POST-CORRECCIÓN

### Verificar Estado del Sistema:
1. **Endpoint de salud**: `GET https://petgourmet.mx/api/health`
2. **Estado de webhooks**: `GET https://petgourmet.mx/api/admin/webhook-status`
3. **Logs de aplicación**: Revisar logs de Vercel/servidor

### Indicadores de Éxito:
- ✅ Webhooks responden con status 200
- ✅ Órdenes se actualizan correctamente
- ✅ No hay errores 500 en logs
- ✅ Pagos se procesan y confirman por email

## 🚨 ACCIONES CRÍTICAS INMEDIATAS

1. **URGENTE**: Obtener credenciales reales de MercadoPago producción
2. **CRÍTICO**: Actualizar variables de entorno en producción
3. **IMPORTANTE**: Redesplegar aplicación
4. **VERIFICAR**: Probar webhook con payment ID real: `127639262364`

## 📞 CONTACTO DE SOPORTE

Si necesita ayuda para obtener las credenciales:
- **MercadoPago Soporte**: [Contactar soporte técnico](https://www.mercadopago.com.mx/ayuda)
- **Documentación**: [Webhooks MercadoPago](https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks)

---

**⚠️ NOTA IMPORTANTE**: Una vez corregida la configuración, la orden #178 con payment ID `127639262364` debería procesarse correctamente y cambiar de estado `pending` a `approved` o el estado correspondiente según el pago real.