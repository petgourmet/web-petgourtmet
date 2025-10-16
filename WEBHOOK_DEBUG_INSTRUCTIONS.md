# 🔍 Instrucciones para Depurar Webhook - Suscripción ID 265

## 📊 Estado Actual

**Suscripción ID**: 265  
**Status**: `pending` ❌  
**mercadopago_subscription_id**: `null` ❌  
**Problema**: El webhook NO se ejecutó después del pago

## ✅ Cambios Realizados

1. ✅ ngrok configurado y corriendo en: `https://nonmetaphorical-terrance-ungeneralising.ngrok-free.dev`
2. ✅ `.env.local` actualizado con la URL de ngrok
3. ✅ `auto_return: "approved"` ya está configurado
4. ✅ Metadata de suscripción se envía correctamente

## 🚨 IMPORTANTE: Por qué el webhook no funcionó

La suscripción ID 265 tiene:
```json
"back_url": "https://nonmetaphorical-terrance-ungeneralising.ngrok-free.dev/suscripcion"
```

Esto significa que **SÍ usó la URL de ngrok**, PERO:

### Posibles razones por las que el webhook no se ejecutó:

1. **El servidor de Next.js no estaba corriendo con la URL de ngrok actualizada**
2. **MercadoPago aún no ha enviado el webhook** (puede tardar minutos)
3. **El webhook llegó pero falló** (necesitamos ver los logs)
4. **ngrok requiere confirmación en navegador** (página de advertencia de ngrok)

## 🔧 Solución Paso a Paso

### Paso 1: Reiniciar el Servidor de Next.js

En la terminal donde está corriendo Next.js:

1. Presiona `Ctrl+C` para detener el servidor
2. Ejecuta:
   ```bash
   pnpm dev
   ```
3. Espera a que inicie completamente (verás: `✓ Ready in...`)

### Paso 2: Verificar que ngrok está corriendo

En la ventana de cmd donde está ngrok, deberías ver:
```
Session Status                online
Forwarding                    https://nonmetaphorical-terrance-ungeneralising.ngrok-free.dev -> http://localhost:3000
```

### Paso 3: Verificar la URL del webhook en el servidor

Una vez reiniciado el servidor, los logs deberían mostrar:
```
Webhook URL configurada: https://nonmetaphorical-terrance-ungeneralising.ngrok-free.dev/api/mercadopago/webhook
```

### Paso 4: Hacer UNA NUEVA prueba de suscripción

**IMPORTANTE**: La suscripción anterior (ID 265) ya procesó el pago. Necesitas:

1. Ir a http://localhost:3000 (o a la URL de ngrok)
2. Crear una NUEVA suscripción
3. Completar el pago en MercadoPago
4. **Observar los logs del servidor** para ver:
   ```
   🔔🔔🔔 ==================== WEBHOOK RECIBIDO DE MERCADOPAGO ====================
   ```

### Paso 5: Monitorear los logs

En la terminal de Next.js, busca estos logs:

```bash
# ✅ Webhook recibido
🔔🔔🔔 ==================== WEBHOOK RECIBIDO DE MERCADOPAGO ====================
📦📦📦 DATOS DEL WEBHOOK: { type: 'payment', action: 'payment.updated', ... }

# ✅ Procesando pago
💳 Procesando webhook de pago
🔍 VERIFICANDO METADATA DEL PAGO
✅ PAGO APROBADO - Verificando si es suscripción

# ✅ Activando suscripción
🎯 ¡ACTIVANDO FLUJO DE SUSCRIPCIÓN! Pago aprobado es primer pago de suscripción...
✅ Preapproval creado exitosamente en MercadoPago
🎉 Suscripción activada exitosamente
```

## 🎯 Para la Suscripción Actual (ID 265)

Si quieres activar manualmente la suscripción ID 265 que ya fue pagada:

### Opción A: Simular el webhook manualmente (Desarrollo)

Puedes crear un script temporal para activar la suscripción:

```typescript
// scripts/activate-subscription-265.ts
// Ejecutar: npx tsx scripts/activate-subscription-265.ts

const subscriptionId = 265;
const userId = "2f4ec8c0-0e58-486d-9c11-a652368f7c19";

// Llamar al endpoint del webhook con datos simulados
fetch('http://localhost:3000/api/mercadopago/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'payment',
    action: 'payment.updated',
    data: {
      id: 'test_payment_12345' // Este ID no importa para testing
    },
    // Aquí simularíamos la respuesta de MercadoPago
  })
});
```

### Opción B: Actualizar manualmente en la base de datos (Más rápido)

Si solo quieres probar el flujo completo, puedes actualizar manualmente la suscripción:

```sql
UPDATE unified_subscriptions
SET 
  status = 'active',
  mercadopago_subscription_id = 'manual_activation_265',
  charges_made = 1,
  last_billing_date = NOW(),
  updated_at = NOW()
WHERE id = 265;
```

## 📝 Checklist de Verificación

Antes de hacer una nueva prueba:

- [ ] ngrok está corriendo (ventana de cmd abierta)
- [ ] URL de ngrok en `.env.local` está correcta
- [ ] Servidor de Next.js reiniciado con `pnpm dev`
- [ ] Logs del servidor se muestran en la terminal
- [ ] Nueva suscripción creada (no reusar la 265)
- [ ] Observando logs mientras se completa el pago

## 🚀 Comando Rápido para Reiniciar Todo

```powershell
# 1. Detener servidor (Ctrl+C en terminal de Node)
# 2. Verificar ngrok está corriendo (ventana cmd separada)
# 3. Iniciar servidor
pnpm dev

# 4. En otra terminal, ver logs en tiempo real
Get-Content -Path .\.next\trace -Wait  # Si hay logs de trace
```

## 📞 Si el webhook sigue sin funcionar

1. **Verifica que ngrok muestre requests entrantes**:
   - En la ventana de ngrok deberías ver cada request que llega
   - Si ves un POST a `/api/mercadopago/webhook`, el webhook llegó

2. **Verifica que no haya página de advertencia de ngrok**:
   - Abre la URL de ngrok en el navegador: https://nonmetaphorical-terrance-ungeneralising.ngrok-free.dev
   - Si ves una página de advertencia, click en "Visit Site"
   - Esto solo se hace una vez por sesión

3. **Verifica los logs de MercadoPago**:
   - Ve a: https://www.mercadopago.com.mx/developers/panel/notifications/webhooks
   - Ahí puedes ver si MercadoPago intentó enviar el webhook y si hubo errores

---

**Fecha**: Octubre 15, 2025  
**Estado**: Configuración completada, pendiente reinicio de servidor y nueva prueba
