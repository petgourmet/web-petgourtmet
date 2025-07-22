# Sistema de Pagos Pet Gourmet - Estado Actual y Testing

## 📋 Resumen del Sistema

### ✅ Configurado y Funcionando:

1. **Webhook de MercadoPago** (`/api/mercadopago/webhook`)
   - Recibe notificaciones de pago de MercadoPago
   - Actualiza automáticamente el estado de las órdenes
   - Estados manejados:
     - `approved` → `status: processing`, `payment_status: paid`
     - `rejected/cancelled` → `status: cancelled`, `payment_status: failed`
     - `pending` → `status: pending`, `payment_status: pending`

2. **Cancelación Automática** (`/api/admin/auto-cancel-orders`)
   - Cancela automáticamente órdenes pendientes después de 3 días
   - Envía email de cancelación al cliente
   - Actualiza estado a `cancelled` y `payment_status: failed`

3. **Sistema de Emails** 
   - Confirmación de pago procesado
   - Notificación de cancelación
   - Logo con fondo azul aplicado a todas las plantillas

### 🧪 Herramientas de Testing:

1. **Diagnóstico Completo** (`/admin/payment-test`)
   - Verificar configuración de MercadoPago
   - Estadísticas de órdenes por estado
   - Órdenes de prueba de Cristofer
   - Recomendaciones de configuración

2. **Simulador de Webhook** 
   - Permite simular respuestas de MercadoPago
   - Testear flujo completo: pago → email → actualización estado

3. **Preview de Cancelación**
   - Ver qué órdenes serían canceladas automáticamente

## 🔄 Flujo de Pago Normal:

```
1. Cliente realiza compra → Orden creada (status: pending, payment_status: pending)
2. Cliente paga en MercadoPago → Webhook recibido
3. Sistema verifica pago → Estado actualizado automáticamente
4. Si approved: status → processing, payment_status → paid + email enviado
5. Si rejected: status → cancelled, payment_status → failed
6. Si >3 días pendiente: Auto-cancelación + email
```

## 🧪 Pasos para Testing con Pago Real:

### 1. Verificar Configuración
```bash
# Visitar: /admin/payment-test
# Ejecutar diagnóstico para verificar:
- ✅ MercadoPago Access Token
- ✅ SMTP configurado
- ✅ Webhook URL configurado en MercadoPago
```

### 2. Hacer Compra de Prueba
```bash
# Con cuenta de Cristofer o nueva:
1. Agregar producto al carrito
2. Proceder al checkout
3. Usar tarjeta de prueba de MercadoPago
4. Completar el pago
```

### 3. Verificar Estados
```bash
# En /admin/orders verificar:
- Orden aparece como "Pendiente" inicialmente
- Después del pago → cambia a "En Proceso" 
- payment_status cambia a "paid"
- Cliente recibe email de confirmación
```

### 4. Simular Casos de Error
```bash
# En /admin/payment-test:
1. Simular pago rechazado → debe cancelar orden
2. Verificar cancelación automática → órdenes >3 días
3. Testear emails de cancelación
```

## 🔧 URLs Importantes:

- **Admin Panel**: `/admin/orders` - Ver todas las órdenes
- **Testing**: `/admin/payment-test` - Herramientas de diagnóstico
- **Webhook**: `/api/mercadopago/webhook` - Endpoint para MercadoPago
- **Auto-cancel**: `/api/admin/auto-cancel-orders` - Cancelación manual
- **Diagnóstico**: `/api/admin/payment-system-test` - API de testing

## ⚠️ Consideraciones Importantes:

### En MercadoPago Dashboard:
1. **Webhook URL debe estar configurada**: `https://tudominio.com/api/mercadopago/webhook`
2. **Eventos habilitados**: `payment` y `preapproval`
3. **Usar credenciales de producción** para testing real

### Variables de Entorno Requeridas:
```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx (producción)
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-xxx (producción)
MERCADOPAGO_WEBHOOK_SECRET=xxx (opcional pero recomendado)
SMTP_HOST=xxx
SMTP_USER=xxx
SMTP_PASS=xxx
EMAIL_FROM=xxx
```

### Automatización (Recomendado):
```bash
# Configurar cron job para ejecutar cada hora:
curl -X POST https://tudominio.com/api/admin/auto-cancel-orders

# O usar GitHub Actions / Vercel Cron para ejecutar automáticamente
```

## 🎯 Estado Actual del Sistema:

**✅ LISTO PARA TESTING EN PRODUCCIÓN**

El sistema está completamente configurado y debería funcionar automáticamente:
1. Pagos aprobados → Estado actualizado + Email enviado
2. Pagos rechazados → Orden cancelada  
3. Órdenes pendientes >3 días → Auto-cancelación

**Para probar ahora mismo:**
1. Ve a `/admin/payment-test`
2. Ejecuta diagnóstico
3. Usa las órdenes de Cristofer para simular webhooks
4. Haz una compra real con tarjeta de prueba

El sistema debería manejar todo automáticamente sin intervención manual.
