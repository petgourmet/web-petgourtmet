# Configuración de Webhooks de MercadoPago - Pet Gourmet

## 📋 Descripción

Este sistema maneja de forma centralizada todos los webhooks de MercadoPago para confirmar pagos y actualizar el estado de órdenes y suscripciones en tiempo real.

## 🏗️ Arquitectura

### Componentes principales:

1. **WebhookService** (`lib/webhook-service.ts`)
   - Servicio centralizado para procesar webhooks
   - Validación de firmas de seguridad
   - Manejo de pagos de órdenes y suscripciones
   - Envío de emails de confirmación

2. **Endpoint de Webhook** (`app/api/mercadopago/webhook/route.ts`)
   - Endpoint único para recibir todos los webhooks
   - Validación de estructura y firma
   - Enrutamiento según tipo de webhook

## 🔧 Configuración

### 1. Variables de Entorno

Copia `.env.example` a `.env.local` y configura:

```bash
# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=your_access_token
MERCADOPAGO_WEBHOOK_SECRET=your_webhook_secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=contacto@petgourmet.mx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Configuración en MercadoPago

#### Desarrollo (con localtunnel):
1. Instala localtunnel: `npm install -g localtunnel`
2. Ejecuta tu aplicación: `npm run dev`
3. En otra terminal: `lt --port 3000`
4. Copia la URL de localtunnel (ej: `https://random-name.loca.lt`)
5. En el panel de MercadoPago, configura el webhook:
   ```
   URL: https://random-name.loca.lt/api/mercadopago/webhook
   ```

**Nota:** Localtunnel puede mostrar una página de advertencia la primera vez. Los webhooks de MercadoPago deberían pasar directamente sin problemas.

#### Producción:
```
URL: https://tudominio.com/api/mercadopago/webhook
```

### 3. Eventos a Configurar en MercadoPago

En el panel de MercadoPago, habilita estos eventos:

**Pagos:**
- ✅ `payment` - Pagos creados/actualizados

**Suscripciones:**
- ✅ `subscription_preapproval` - Suscripciones creadas/actualizadas/canceladas
- ✅ `subscription_authorized_payment` - Pagos de suscripciones

**Opcional:**
- ✅ `plan` - Planes de suscripción
- ✅ `invoice` - Facturas

## 🔄 Flujo de Procesamiento

### Pagos de Órdenes
1. MercadoPago envía webhook de tipo `payment`
2. Sistema obtiene datos del pago desde API de MercadoPago
3. Identifica si es pago de orden (por `external_reference`)
4. Actualiza tabla `orders` con nuevo estado
5. Envía email de confirmación al cliente

### Pagos de Suscripciones
1. MercadoPago envía webhook de tipo `payment`
2. Sistema identifica pago de suscripción (por `metadata` o `external_reference`)
3. Actualiza/crea registro en `subscription_billing_history`
4. Actualiza `last_billing_date` en `user_subscriptions`
5. Envía email de confirmación de pago

### Eventos de Suscripciones
1. MercadoPago envía webhook de tipo `subscription_preapproval`
2. Sistema obtiene datos de suscripción desde API
3. Actualiza estado en `user_subscriptions`
4. Maneja eventos específicos:
   - `created`: Email de bienvenida
   - `cancelled`: Marca como inactiva y envía email
   - `updated`: Actualiza datos locales

## 📊 Estados de Pago

### Estados de MercadoPago → Estados Locales

| MercadoPago | Orden Local | Descripción |
|-------------|-------------|-------------|
| `approved` | `confirmed` | Pago aprobado |
| `paid` | `confirmed` | Pago completado |
| `pending` | `pending_payment` | Pago pendiente |
| `in_process` | `processing` | Pago en proceso |
| `cancelled` | `cancelled` | Pago cancelado |
| `rejected` | `cancelled` | Pago rechazado |
| `refunded` | `refunded` | Pago reembolsado |

## 🧪 Testing

### Verificar Webhook
```bash
# GET para verificar estado
curl https://tudominio.com/api/mercadopago/webhook

# Respuesta esperada:
{
  "status": "active",
  "message": "Webhook endpoint de MercadoPago funcionando",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production"
}
```

### Simular Webhook (Desarrollo)
```bash
curl -X POST https://tudominio.com/api/mercadopago/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: test" \
  -H "x-request-id: test-123" \
  -d '{
    "id": "test-webhook",
    "live_mode": false,
    "type": "payment",
    "date_created": "2024-01-01T00:00:00.000Z",
    "application_id": "123",
    "user_id": "456",
    "version": 1,
    "api_version": "v1",
    "action": "payment.updated",
    "data": {
      "id": "1234567890"
    }
  }'
```

## 🔒 Seguridad

### Validación de Firmas
- En producción, todas las firmas se validan usando `MERCADOPAGO_WEBHOOK_SECRET`
- En desarrollo, la validación se omite para facilitar testing
- Se usa `crypto.timingSafeEqual()` para prevenir ataques de timing

### Headers de Seguridad
- `x-signature`: Firma HMAC-SHA256 del payload
- `x-request-id`: ID único de la request
- `user-agent`: Identificación de MercadoPago

## 📧 Emails Automáticos

### Configuración SMTP
Se envían emails automáticos para:
- ✅ Confirmación de pago de orden
- ✅ Confirmación de pago de suscripción
- ✅ Bienvenida a nueva suscripción
- ✅ Cancelación de suscripción

### Templates
Todos los emails incluyen:
- Diseño responsive
- Información detallada del pago/suscripción
- Enlaces a la cuenta del usuario
- Branding de Pet Gourmet

## 🚨 Monitoreo y Logs

### Logs del Sistema
```bash
# Webhook recibido
🔔 Webhook recibido de MercadoPago

# Procesamiento exitoso
✅ Webhook procesado exitosamente

# Errores
❌ Error procesando webhook
```

### Verificar Logs
```bash
# En desarrollo
npm run dev

# En producción (Vercel)
vercel logs
```

## 🔧 Troubleshooting

### Problemas Comunes

1. **Webhook no recibe datos**
   - Verificar URL en panel de MercadoPago
   - Verificar que ngrok esté corriendo (desarrollo)
   - Verificar logs del servidor

2. **Firma inválida**
   - Verificar `MERCADOPAGO_WEBHOOK_SECRET`
   - Verificar que el secret coincida con MercadoPago

3. **Emails no se envían**
   - Verificar configuración SMTP
   - Verificar credenciales de email
   - Verificar logs de email

4. **Base de datos no se actualiza**
   - Verificar conexión a Supabase
   - Verificar permisos de `SUPABASE_SERVICE_ROLE_KEY`
   - Verificar estructura de tablas

### Debug Mode
Para más información en logs:
```bash
NODE_ENV=development npm run dev
```

## 📚 Referencias

- [Documentación de Webhooks de MercadoPago](https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks)
- [API de Pagos de MercadoPago](https://www.mercadopago.com.mx/developers/es/reference/payments/_payments_id/get)
- [API de Suscripciones de MercadoPago](https://www.mercadopago.com.mx/developers/es/reference/subscriptions/_preapproval/get)

## 🚀 Deployment

### Checklist de Producción
- [ ] Variables de entorno configuradas
- [ ] Webhook URL configurada en MercadoPago
- [ ] Secret de webhook configurado
- [ ] SMTP configurado para emails
- [ ] Base de datos Supabase configurada
- [ ] SSL/HTTPS habilitado
- [ ] Logs de monitoreo configurados

### Comandos de Deployment
```bash
# Vercel
vercel --prod

# O tu plataforma preferida
npm run build
npm start
```

---

**✅ Sistema listo para producción**

Este sistema está diseñado para ser robusto, seguro y escalable, manejando todos los casos de uso de pagos y suscripciones de Pet Gourmet.