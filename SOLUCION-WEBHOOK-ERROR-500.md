# 🚨 SOLUCIÓN CRÍTICA: Error 500 en Webhook MercadoPago - PRODUCCIÓN

## ❌ PROBLEMA IDENTIFICADO

El webhook de MercadoPago está fallando con **Error 500** en producción debido a una **configuración inconsistente** en las variables de entorno:

### Causa Raíz del Error:
1. **Token de SANDBOX en PRODUCCIÓN**: El archivo `.env` contiene credenciales de MercadoPago SANDBOX pero la aplicación está configurada para entorno de PRODUCCIÓN
2. **Configuración Conflictiva**: 
   - `NODE_ENV=production`
   - `NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT=production`
   - `MERCADOPAGO_ACCESS_TOKEN=APP_USR-1329434229865091-...` (TOKEN DE SANDBOX)
   - `USE_MERCADOPAGO_MOCK=true` (INCORRECTO para producción)

### Error Específico:
El `WebhookService` constructor valida que `MERCADOPAGO_ACCESS_TOKEN` esté presente, pero el token de sandbox no es válido para el entorno de producción, causando fallos en las llamadas a la API de MercadoPago.

## ✅ ACCIONES REALIZADAS

### 1. Identificación del Problema
- ✅ Revisado logs del servidor
- ✅ Analizado configuración de variables de entorno
- ✅ Identificado tokens de sandbox en producción

### 2. Correcciones Implementadas
- ✅ Creado archivo `.env.production` con configuración correcta
- ✅ Actualizado `.env` principal con advertencias y placeholders
- ✅ Cambiado `USE_MERCADOPAGO_MOCK=false` para producción
- ✅ Marcado tokens que requieren actualización

## 🔧 ACCIONES REQUERIDAS URGENTES

### ⚠️ CRÍTICO - Configurar Tokens de Producción

Debe reemplazar los siguientes placeholders en el archivo `.env` con las **credenciales REALES de MercadoPago PRODUCCIÓN**:

```bash
# En .env - REEMPLAZAR ESTOS VALORES:
MERCADOPAGO_ACCESS_TOKEN=APP_USR-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX-XXXXXXXXX
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```

### Dónde Obtener las Credenciales:
1. Ingresar a [MercadoPago Developers](https://www.mercadopago.com.mx/developers)
2. Ir a "Tus integraciones" → Seleccionar la aplicación
3. En la sección "Credenciales de producción":
   - Copiar **Access Token** → `MERCADOPAGO_ACCESS_TOKEN`
   - Copiar **Public Key** → `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`

## 🧪 VERIFICACIÓN POST-CORRECCIÓN

Después de configurar las credenciales reales:

### 1. Reiniciar la Aplicación
```bash
npm run build
npm start
```

### 2. Probar el Webhook
```bash
# Probar con curl (PowerShell)
Invoke-WebRequest -Uri "https://petgourmet.mx/api/mercadopago/webhook" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"action":"payment.updated","api_version":"v1","data":{"id":"123456"},"date_created":"2021-11-01T02:02:02Z","id":"123456","live_mode":false,"type":"payment","user_id":1227980651}'
```

### 3. Verificar Respuesta Esperada
- ✅ **Status Code**: 200 OK
- ✅ **Response**: "Webhook procesado"
- ✅ **Logs**: Sin errores en consola del servidor

## 📋 CONFIGURACIÓN FINAL CORRECTA

### Variables Críticas para Producción:
```bash
NODE_ENV=production
NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT=production
USE_MERCADOPAGO_MOCK=false
NEXT_PUBLIC_PAYMENT_TEST_MODE=false
MERCADOPAGO_ACCESS_TOKEN=[TOKEN_REAL_PRODUCCION]
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=[PUBLIC_KEY_REAL_PRODUCCION]
```

## 🔍 MONITOREO CONTINUO

Para evitar futuros problemas:

1. **Verificar Logs Regularmente**: Revisar `/api/health` para estado del sistema
2. **Validar Configuración**: Usar endpoint de diagnóstico para verificar tokens
3. **Alertas**: Configurar notificaciones para errores 500 en webhooks

## 📞 SOPORTE

Si después de configurar las credenciales reales el problema persiste:
1. Verificar que los tokens sean de **PRODUCCIÓN** (no sandbox)
2. Confirmar que la aplicación MercadoPago esté **ACTIVADA** para producción
3. Revisar logs del servidor para errores específicos

---

**Estado**: ⏳ Pendiente configuración de credenciales reales por parte del usuario
**Prioridad**: 🚨 CRÍTICA - Afecta procesamiento de pagos en producción
**Fecha**: $(date)