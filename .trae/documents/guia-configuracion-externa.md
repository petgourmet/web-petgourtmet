# Guía de Configuración Externa - Sistema de Pagos Pet Gourmet

## 📋 Lista de Verificación Previa

Antes de comenzar, asegúrate de tener:
- [ ] Cuenta de MercadoPago con credenciales de producción
- [ ] Acceso al panel de desarrolladores de MercadoPago
- [ ] Dominio configurado y SSL activo
- [ ] Variables de entorno configuradas en el proyecto
- [ ] Base de datos Supabase funcionando

## 🔧 1. Configuración de MercadoPago

### 1.1 Configurar Webhooks en el Panel de MercadoPago

**Paso 1:** Accede al panel de MercadoPago
1. Ve a [https://www.mercadopago.com.co/developers](https://www.mercadopago.com.co/developers)
2. Inicia sesión con tu cuenta de MercadoPago
3. Selecciona tu aplicación o crea una nueva

**Paso 2:** Configurar URLs de Webhook
1. En el panel, ve a "Webhooks" o "Notificaciones"
2. Configura las siguientes URLs:

**Para Desarrollo:**
```
URL: https://tu-dominio-dev.vercel.app/api/mercadopago/webhook
Eventos: payment, subscription_preapproval, subscription_authorized_payment
```

**Para Producción:**
```
URL: https://petgourmet.com.co/api/mercadopago/webhook
Eventos: payment, subscription_preapproval, subscription_authorized_payment
```

**Paso 3:** Configurar Eventos Específicos
Selecciona estos eventos en el panel:
- ✅ `payment` - Todos los sub-eventos
- ✅ `subscription_preapproval` - Todos los sub-eventos  
- ✅ `subscription_authorized_payment` - Todos los sub-eventos
- ✅ `plan` - Todos los sub-eventos
- ✅ `invoice` - Todos los sub-eventos

### 1.2 Obtener Credenciales

**Credenciales Necesarias:**
```env
# En tu archivo .env.local
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MERCADOPAGO_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MERCADOPAGO_ENVIRONMENT=production
```

**Cómo obtenerlas:**
1. **Access Token y Public Key:** Panel > Credenciales > Producción
2. **Webhook Secret:** Se genera automáticamente al crear el webhook
3. **Environment:** Usar `production` para producción, `sandbox` para pruebas

### 1.3 Configurar URLs de Retorno

En el panel de MercadoPago, configura:
```
URL de éxito: https://petgourmet.com.co/pago-exitoso
URL de fallo: https://petgourmet.com.co/pago-fallido
URL de pendiente: https://petgourmet.com.co/pago-pendiente
```

## 🔐 2. Verificación de Variables de Entorno

### 2.1 Variables Requeridas

Verifica que tu archivo `.env.local` contenga:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MERCADOPAGO_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MERCADOPAGO_ENVIRONMENT=production

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
SMTP_FROM=noreply@petgourmet.com.co

# URLs de la aplicación
NEXT_PUBLIC_SITE_URL=https://petgourmet.com.co
NEXT_PUBLIC_APP_URL=https://petgourmet.com.co
```

### 2.2 Verificar Configuración SMTP

**Para Gmail:**
1. Habilita la verificación en 2 pasos
2. Genera una "Contraseña de aplicación"
3. Usa esa contraseña en `SMTP_PASS`

**Para otros proveedores:**
- **Outlook:** `smtp-mail.outlook.com:587`
- **Yahoo:** `smtp.mail.yahoo.com:587`
- **SendGrid:** `smtp.sendgrid.net:587`

## 🗄️ 3. Configuración de Base de Datos

### 3.1 Verificar Tablas Existentes

Ejecuta este query en Supabase para verificar las tablas:

```sql
-- Verificar que existan las tablas principales
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'orders', 
  'order_items', 
  'user_subscriptions', 
  'subscription_billing_history',
  'products'
);
```

### 3.2 Configurar Políticas RLS (Row Level Security)

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_billing_history ENABLE ROW LEVEL SECURITY;

-- Políticas para orders
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all orders" ON orders
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Políticas para user_subscriptions
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all subscriptions" ON user_subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Políticas para subscription_billing_history
CREATE POLICY "Users can view own billing history" ON subscription_billing_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_subscriptions 
      WHERE user_subscriptions.id = subscription_billing_history.subscription_id 
      AND user_subscriptions.user_id = auth.uid()
    )
  );

-- Políticas para order_items
CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );
```

### 3.3 Configurar Canales de Tiempo Real

```sql
-- Habilitar realtime en las tablas necesarias
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE user_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE subscription_billing_history;
```

## 🧪 4. Pruebas de Configuración

### 4.1 Probar Webhook Localmente

**Usando ngrok para desarrollo:**
```bash
# Instalar ngrok
npm install -g ngrok

# Exponer puerto local
ngrok http 3000

# Usar la URL generada en MercadoPago:
# https://xxxxxxxx.ngrok.io/api/mercadopago/webhook
```

### 4.2 Script de Prueba de Webhook

Crea un archivo `test-webhook.js`:

```javascript
const crypto = require('crypto')

// Simular webhook de MercadoPago
const testPayload = {
  id: '12345',
  live_mode: false,
  type: 'payment',
  date_created: new Date().toISOString(),
  application_id: '123456789',
  user_id: '987654321',
  version: 1,
  api_version: 'v1',
  action: 'payment.updated',
  data: {
    id: 'payment_123'
  }
}

const payload = JSON.stringify(testPayload)
const signature = crypto
  .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET)
  .update(payload)
  .digest('hex')

console.log('Payload:', payload)
console.log('Signature:', signature)

// Hacer request a tu webhook
fetch('http://localhost:3000/api/mercadopago/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-signature': signature,
    'x-request-id': 'test-request-123',
    'user-agent': 'MercadoPago/1.0'
  },
  body: payload
})
.then(res => res.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err))
```

### 4.3 Verificar Endpoint de Salud

Crea un endpoint para verificar el estado:

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Verificar Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data, error } = await supabase
      .from('orders')
      .select('count')
      .limit(1)
    
    if (error) throw error
    
    // Verificar variables de entorno
    const requiredEnvs = [
      'MERCADOPAGO_ACCESS_TOKEN',
      'MERCADOPAGO_WEBHOOK_SECRET',
      'SMTP_HOST',
      'SMTP_USER'
    ]
    
    const missingEnvs = requiredEnvs.filter(env => !process.env[env])
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      missingEnvs: missingEnvs.length > 0 ? missingEnvs : null
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
```

## 🚀 5. Despliegue en Producción

### 5.1 Configuración en Vercel

**Variables de Entorno en Vercel:**
1. Ve a tu proyecto en Vercel
2. Settings > Environment Variables
3. Agrega todas las variables del archivo `.env.local`
4. Asegúrate de marcar las variables sensibles como "Sensitive"

**Variables críticas para producción:**
```
MERCADOPAGO_ACCESS_TOKEN (Sensitive)
MERCADOPAGO_WEBHOOK_SECRET (Sensitive)
SUPABASE_SERVICE_ROLE_KEY (Sensitive)
SMTP_PASS (Sensitive)
```

### 5.2 Configurar Dominio Personalizado

1. En Vercel: Settings > Domains
2. Agregar dominio: `petgourmet.com.co`
3. Configurar DNS según las instrucciones
4. Verificar SSL automático

### 5.3 Actualizar URLs en MercadoPago

Una vez desplegado, actualiza en MercadoPago:
```
Webhook URL: https://petgourmet.com.co/api/mercadopago/webhook
Success URL: https://petgourmet.com.co/pago-exitoso
Failure URL: https://petgourmet.com.co/pago-fallido
Pending URL: https://petgourmet.com.co/pago-pendiente
```

## 📊 6. Monitoreo y Logs

### 6.1 Configurar Logging

Agrega logging estructurado en el webhook:

```typescript
// lib/logger.ts
export function log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    service: 'payment-webhook'
  }
  
  console.log(JSON.stringify(logEntry))
  
  // En producción, enviar a servicio de logging
  // await sendToLogService(logEntry)
}
```

### 6.2 Dashboard de Monitoreo

Crea queries para monitorear:

```sql
-- Órdenes pendientes por más de 1 hora
SELECT COUNT(*) as pending_orders
FROM orders 
WHERE status = 'pending_payment' 
AND created_at < NOW() - INTERVAL '1 hour';

-- Webhooks fallidos (basado en logs)
SELECT DATE(created_at) as date, COUNT(*) as failed_webhooks
FROM webhook_logs 
WHERE status = 'error' 
AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at);

-- Suscripciones activas
SELECT COUNT(*) as active_subscriptions
FROM user_subscriptions 
WHERE status = 'active';
```

## ✅ 7. Lista de Verificación Final

### Antes de ir a producción:

- [ ] **MercadoPago configurado**
  - [ ] Webhooks configurados con URL de producción
  - [ ] Eventos seleccionados correctamente
  - [ ] Credenciales de producción configuradas
  - [ ] URLs de retorno configuradas

- [ ] **Variables de entorno**
  - [ ] Todas las variables configuradas en Vercel
  - [ ] Variables sensibles marcadas como "Sensitive"
  - [ ] URLs apuntan a producción

- [ ] **Base de datos**
  - [ ] Tablas creadas y verificadas
  - [ ] Políticas RLS configuradas
  - [ ] Realtime habilitado
  - [ ] Índices creados

- [ ] **Pruebas**
  - [ ] Webhook responde correctamente
  - [ ] Endpoint de salud funciona
  - [ ] Pago de prueba completado
  - [ ] Email de confirmación enviado

- [ ] **Monitoreo**
  - [ ] Logs estructurados implementados
  - [ ] Dashboard de monitoreo configurado
  - [ ] Alertas configuradas

## 🆘 8. Troubleshooting Común

### Problema: Webhook no recibe notificaciones
**Solución:**
1. Verificar que la URL esté accesible públicamente
2. Comprobar que el SSL esté funcionando
3. Revisar logs de Vercel para errores
4. Verificar que los eventos estén seleccionados en MercadoPago

### Problema: Error de validación de firma
**Solución:**
1. Verificar que `MERCADOPAGO_WEBHOOK_SECRET` sea correcto
2. Asegurar que el payload no se modifique antes de la validación
3. Verificar que se use el header `x-signature` correcto

### Problema: Emails no se envían
**Solución:**
1. Verificar credenciales SMTP
2. Comprobar que el puerto esté abierto (587 o 465)
3. Verificar configuración de "Contraseña de aplicación" en Gmail
4. Revisar logs de errores de SMTP

### Problema: Base de datos no actualiza
**Solución:**
1. Verificar políticas RLS
2. Comprobar que se use `SUPABASE_SERVICE_ROLE_KEY`
3. Verificar que las tablas existan
4. Revisar logs de Supabase

---

**¿Necesitas ayuda?** Revisa los logs en Vercel y Supabase, o contacta al equipo de desarrollo.

**Última actualización:** Enero 2025