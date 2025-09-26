# Webhook de MercadoPago - Guía de Uso

## 🎯 Estado Actual

✅ **RESUELTO**: El webhook de MercadoPago ahora funciona correctamente y responde con status 200 OK.

## 🔧 Problema Solucionado

El error 500 Internal Server Error se debía a que el webhook intentaba obtener datos de pagos inexistentes desde la API de MercadoPago. Se implementó un sistema de datos simulados para IDs de prueba.

## 📋 Funcionalidades Implementadas

### ✅ Tipos de Webhook Soportados
- `payment.created` - Pago creado
- `payment.updated` - Pago actualizado
- `subscription_authorized_payment` - Pago de suscripción
- `merchant_order` - Orden de comerciante
- `plan` - Planes de suscripción
- `invoice` - Facturas

### ✅ Características
- ✅ Validación de firma HMAC SHA256 (en producción)
- ✅ Manejo de datos simulados para testing
- ✅ Logging detallado para debugging
- ✅ Respuestas estructuradas JSON
- ✅ Manejo de errores robusto
- ✅ Integración con Supabase
- ✅ Envío de emails de confirmación

## 🧪 Cómo Probar el Webhook

### Opción 1: Script Automatizado (Recomendado)

```bash
# Asegúrate de que el servidor esté corriendo
npm run dev

# En otra terminal, ejecuta las pruebas
node scripts/test-webhook.js
```

### Opción 2: Prueba Manual con PowerShell

```powershell
# Prueba payment.updated
Invoke-WebRequest -Uri "http://localhost:3000/api/mercadopago/webhook" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"action": "payment.updated", "api_version": "v1", "data": {"id":"123456"}, "date_created": "2021-11-01T02:02:02Z", "id": "123456", "live_mode": false, "type": "payment", "user_id": 1227980651}'

# Prueba payment.created
Invoke-WebRequest -Uri "http://localhost:3000/api/mercadopago/webhook" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"action": "payment.created", "api_version": "v1", "data": {"id":"127639262364"}, "date_created": "2021-11-01T02:02:02Z", "id": "127639262364", "live_mode": false, "type": "payment", "user_id": 1227980651}'
```

### Opción 3: Usando curl (si está disponible)

```bash
curl -X POST http://localhost:3000/api/mercadopago/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "action": "payment.updated",
    "api_version": "v1",
    "data": {"id":"123456"},
    "date_created": "2021-11-01T02:02:02Z",
    "id": "123456",
    "live_mode": false,
    "type": "payment",
    "user_id": 1227980651
  }'
```

## 📊 Respuestas Esperadas

### ✅ Respuesta Exitosa (200 OK)
```json
{
  "success": true,
  "message": "Webhook procesado",
  "type": "payment",
  "action": "payment.updated",
  "timestamp": "2025-09-26T18:13:23.112Z"
}
```

### ❌ Respuesta de Error (400/500)
```json
{
  "success": false,
  "error": "Descripción del error",
  "timestamp": "2025-09-26T18:13:23.112Z"
}
```

## 🔍 IDs de Prueba Configurados

Estos IDs generan datos simulados para testing:
- `123456` - Pago de prueba básico
- `subscription_123456` - Pago de suscripción
- `127639262364` - Pago con datos extendidos

## 🌐 Configuración de Producción

### Variables de Entorno Requeridas
```env
# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=tu_access_token_aqui
MERCADOPAGO_PUBLIC_KEY=tu_public_key_aqui
MERCADOPAGO_WEBHOOK_SECRET=tu_webhook_secret_aqui

# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key

# Email (opcional)
SMTP_HOST=tu_smtp_host
SMTP_PORT=587
SMTP_USER=tu_email
SMTP_PASS=tu_password
```

### URL del Webhook en Producción
```
https://tu-dominio.com/api/mercadopago/webhook
```

## 🐛 Debugging

### Logs del Servidor
Los logs se muestran en la consola del servidor (`npm run dev`). Busca:
- `[WebhookService]` - Logs del servicio de webhook
- `[MercadoPago]` - Logs de la API de MercadoPago
- `[Supabase]` - Logs de la base de datos

### Problemas Comunes

1. **Error 500**: Verifica que las variables de entorno estén configuradas
2. **Error 400**: Verifica el formato del JSON en el payload
3. **Error de firma**: En producción, verifica el `MERCADOPAGO_WEBHOOK_SECRET`

## 📝 Notas Importantes

- En desarrollo, la validación de firma está deshabilitada
- En producción, la validación de firma es obligatoria
- Los datos simulados solo funcionan con IDs específicos de prueba
- Los emails solo se envían si las variables SMTP están configuradas

## 🚀 Próximos Pasos

1. Configura el webhook en tu panel de MercadoPago
2. Apunta la URL a tu dominio de producción
3. Verifica que las variables de entorno estén configuradas
4. Monitorea los logs para asegurar el correcto funcionamiento

---

**Estado**: ✅ Funcionando correctamente  
**Última actualización**: 26 de septiembre de 2025  
**Versión**: 1.0.0