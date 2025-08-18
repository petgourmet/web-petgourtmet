# Configuración y Troubleshooting - Webhooks Mercado Pago

## 1. Configuración de Entornos

### 1.1 Configuración de Desarrollo

#### Variables de Entorno (.env.local)
```env
# Mercado Pago - Sandbox
MERCADOPAGO_ACCESS_TOKEN=TEST-your-test-access-token
MERCADOPAGO_PUBLIC_KEY=TEST-your-test-public-key
MERCADOPAGO_WEBHOOK_SECRET=your-webhook-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Aplicación
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Logging
LOG_LEVEL=debug
ENABLE_WEBHOOK_LOGGING=true
```

#### Configuración de ngrok para Testing Local
```bash
# Instalar ngrok
npm install -g ngrok

# Exponer puerto local
ngrok http 3000

# Usar la URL HTTPS generada para configurar webhooks en MP
# Ejemplo: https://abc123.ngrok.io/api/webhooks/mercadopago
```

### 1.2 Configuración de Producción

#### Variables de Entorno (Vercel/Netlify)
```env
# Mercado Pago - Producción
MERCADOPAGO_ACCESS_TOKEN=APP_USR-your-production-access-token
MERCADOPAGO_PUBLIC_KEY=APP_USR-your-production-public-key
MERCADOPAGO_WEBHOOK_SECRET=your-production-webhook-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Aplicación
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Logging
LOG_LEVEL=info
ENABLE_WEBHOOK_LOGGING=false
```

#### Configuración de Vercel (vercel.json)
```json
{
  "functions": {
    "pages/api/webhooks/mercadopago.js": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/webhooks/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

## 2. Scripts de Utilidad

### 2.1 Script de Configuración Inicial
```javascript
// scripts/setup-webhooks.js
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const mpApi = axios.create({
  baseURL: 'https://api.mercadopago.com',
  headers: {
    'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function setupWebhooks() {
  console.log('🚀 Configurando webhooks de Mercado Pago...');
  
  try {
    // 1. Verificar conexión con Supabase
    console.log('📊 Verificando conexión con Supabase...');
    const { data, error } = await supabase.from('mercadopago_webhooks').select('count').limit(1);
    if (error) {
      throw new Error(`Error conectando con Supabase: ${error.message}`);
    }
    console.log('✅ Conexión con Supabase exitosa');
    
    // 2. Verificar credenciales de Mercado Pago
    console.log('🔑 Verificando credenciales de Mercado Pago...');
    const { data: userInfo } = await mpApi.get('/users/me');
    console.log(`✅ Conectado como: ${userInfo.email} (${userInfo.site_id})`);
    
    // 3. Listar webhooks existentes
    console.log('📋 Listando webhooks existentes...');
    const { data: existingWebhooks } = await mpApi.get('/v1/webhooks');
    console.log(`📌 Webhooks existentes: ${existingWebhooks.length}`);
    
    existingWebhooks.forEach(webhook => {
      console.log(`  - ${webhook.url} (${webhook.events.join(', ')})`);
    });
    
    // 4. Configurar nuevo webhook si no existe
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`;
    const existingWebhook = existingWebhooks.find(w => w.url === webhookUrl);
    
    if (!existingWebhook) {
      console.log('🔧 Creando nuevo webhook...');
      const { data: newWebhook } = await mpApi.post('/v1/webhooks', {
        url: webhookUrl,
        events: [
          'payment',
          'merchant_order',
          'subscription_preapproval',
          'subscription_preapproval_plan'
        ]
      });
      console.log(`✅ Webhook creado: ${newWebhook.id}`);
    } else {
      console.log('ℹ️ Webhook ya existe, actualizando eventos...');
      await mpApi.put(`/v1/webhooks/${existingWebhook.id}`, {
        events: [
          'payment',
          'merchant_order',
          'subscription_preapproval',
          'subscription_preapproval_plan'
        ]
      });
      console.log('✅ Webhook actualizado');
    }
    
    // 5. Verificar tabla de webhooks
    console.log('🗄️ Verificando estructura de base de datos...');
    const { data: tableInfo } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'mercadopago_webhooks')
      .eq('table_schema', 'public');
    
    const requiredColumns = [
      'id', 'webhook_id', 'topic', 'resource_id', 'processed', 'created_at'
    ];
    
    const missingColumns = requiredColumns.filter(
      col => !tableInfo.some(info => info.column_name === col)
    );
    
    if (missingColumns.length > 0) {
      console.warn(`⚠️ Columnas faltantes en mercadopago_webhooks: ${missingColumns.join(', ')}`);
    } else {
      console.log('✅ Estructura de base de datos correcta');
    }
    
    console.log('🎉 Configuración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en la configuración:', error.message);
    process.exit(1);
  }
}

setupWebhooks();
```

### 2.2 Script de Monitoreo
```javascript
// scripts/monitor-webhooks.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function monitorWebhooks() {
  console.log('📊 Monitor de Webhooks - Mercado Pago\n');
  
  try {
    // Estadísticas de las últimas 24 horas
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { data: webhooks24h } = await supabase
      .from('mercadopago_webhooks')
      .select('*')
      .gte('created_at', since24h.toISOString());
    
    // Estadísticas de la última hora
    const since1h = new Date(Date.now() - 60 * 60 * 1000);
    const { data: webhooks1h } = await supabase
      .from('mercadopago_webhooks')
      .select('*')
      .gte('created_at', since1h.toISOString());
    
    // Webhooks fallidos
    const { data: failedWebhooks } = await supabase
      .from('mercadopago_webhooks')
      .select('*')
      .eq('processed', false)
      .gte('retry_count', 3)
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Mostrar estadísticas
    console.log('📈 ESTADÍSTICAS ÚLTIMAS 24 HORAS');
    console.log(`Total webhooks: ${webhooks24h.length}`);
    console.log(`Procesados: ${webhooks24h.filter(w => w.processed).length}`);
    console.log(`Fallidos: ${webhooks24h.filter(w => !w.processed && w.retry_count >= 5).length}`);
    console.log(`Pendientes: ${webhooks24h.filter(w => !w.processed && w.retry_count < 5).length}`);
    
    // Por tópico
    const byTopic = webhooks24h.reduce((acc, w) => {
      acc[w.topic] = (acc[w.topic] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📋 POR TÓPICO (24h):');
    Object.entries(byTopic).forEach(([topic, count]) => {
      console.log(`  ${topic}: ${count}`);
    });
    
    console.log('\n⚡ ÚLTIMA HORA');
    console.log(`Total: ${webhooks1h.length}`);
    console.log(`Procesados: ${webhooks1h.filter(w => w.processed).length}`);
    
    // Tiempo promedio de procesamiento
    const processedWithTime = webhooks24h.filter(w => w.processing_time_ms);
    if (processedWithTime.length > 0) {
      const avgTime = processedWithTime.reduce((sum, w) => sum + w.processing_time_ms, 0) / processedWithTime.length;
      console.log(`\n⏱️ TIEMPO PROMEDIO DE PROCESAMIENTO: ${Math.round(avgTime)}ms`);
    }
    
    // Webhooks fallidos recientes
    if (failedWebhooks.length > 0) {
      console.log('\n❌ WEBHOOKS FALLIDOS RECIENTES:');
      failedWebhooks.forEach(w => {
        console.log(`  ${w.webhook_id} - ${w.topic} - ${w.error_message?.substring(0, 50)}...`);
      });
    }
    
    // Alertas
    const failureRate = webhooks1h.length > 0 ? 
      (webhooks1h.filter(w => !w.processed && w.retry_count >= 5).length / webhooks1h.length) * 100 : 0;
    
    if (failureRate > 10) {
      console.log(`\n🚨 ALERTA: Tasa de fallos alta (${failureRate.toFixed(1)}%) en la última hora`);
    }
    
    if (webhooks1h.length === 0 && webhooks24h.length > 0) {
      console.log('\n⚠️ ADVERTENCIA: No se han recibido webhooks en la última hora');
    }
    
  } catch (error) {
    console.error('❌ Error en el monitoreo:', error.message);
  }
}

// Ejecutar monitoreo
if (require.main === module) {
  monitorWebhooks();
}

// Exportar para uso programático
export { monitorWebhooks };
```

### 2.3 Script de Limpieza
```javascript
// scripts/cleanup-webhooks.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupWebhooks(daysToKeep = 30) {
  console.log(`🧹 Limpiando webhooks anteriores a ${daysToKeep} días...`);
  
  try {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    // Contar webhooks a eliminar
    const { count: totalToDelete } = await supabase
      .from('mercadopago_webhooks')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoffDate.toISOString());
    
    if (totalToDelete === 0) {
      console.log('✅ No hay webhooks antiguos para eliminar');
      return;
    }
    
    console.log(`📊 Se eliminarán ${totalToDelete} webhooks`);
    
    // Eliminar en lotes para evitar timeouts
    const batchSize = 1000;
    let deletedCount = 0;
    
    while (deletedCount < totalToDelete) {
      const { data: batch } = await supabase
        .from('mercadopago_webhooks')
        .select('id')
        .lt('created_at', cutoffDate.toISOString())
        .limit(batchSize);
      
      if (!batch || batch.length === 0) break;
      
      const ids = batch.map(w => w.id);
      const { error } = await supabase
        .from('mercadopago_webhooks')
        .delete()
        .in('id', ids);
      
      if (error) {
        throw new Error(`Error eliminando lote: ${error.message}`);
      }
      
      deletedCount += batch.length;
      console.log(`🗑️ Eliminados ${deletedCount}/${totalToDelete} webhooks`);
    }
    
    console.log('✅ Limpieza completada');
    
  } catch (error) {
    console.error('❌ Error en la limpieza:', error.message);
  }
}

// Uso: node cleanup-webhooks.js [días]
const daysToKeep = process.argv[2] ? parseInt(process.argv[2]) : 30;
cleanupWebhooks(daysToKeep);
```

## 3. Troubleshooting Común

### 3.1 Problemas de Validación de Firma

#### Síntoma
```
Error: Invalid webhook signature
Status: 401 Unauthorized
```

#### Soluciones
```javascript
// Debug de validación de firma
function debugSignatureValidation(req) {
  const signature = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];
  
  console.log('🔍 DEBUG SIGNATURE VALIDATION');
  console.log('Headers:', {
    'x-signature': signature,
    'x-request-id': requestId
  });
  
  if (!signature || !requestId) {
    console.log('❌ Missing required headers');
    return false;
  }
  
  const parts = signature.split(',');
  let ts, hash;
  
  parts.forEach(part => {
    const [key, value] = part.split('=');
    console.log(`Header part: ${key} = ${value}`);
    if (key.trim() === 'ts') ts = value;
    if (key.trim() === 'v1') hash = value;
  });
  
  console.log('Extracted:', { ts, hash });
  
  const dataId = req.body.data?.id || '';
  const payload = `id:${dataId};request-id:${requestId};ts:${ts};`;
  console.log('Payload to validate:', payload);
  
  const expectedHash = crypto
    .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  console.log('Expected hash:', expectedHash);
  console.log('Received hash:', hash);
  console.log('Match:', hash === expectedHash);
  
  return hash === expectedHash;
}
```

#### Checklist de Validación
- [ ] Variable `MERCADOPAGO_WEBHOOK_SECRET` configurada correctamente
- [ ] Headers `x-signature` y `x-request-id` presentes
- [ ] Formato de payload correcto: `id:{data.id};request-id:{request-id};ts:{timestamp};`
- [ ] Timestamp no mayor a 5 minutos
- [ ] Algoritmo HMAC-SHA256 usado correctamente

### 3.2 Problemas de Conexión con Supabase

#### Síntoma
```
Error: Failed to store webhook: relation "mercadopago_webhooks" does not exist
```

#### Solución
```sql
-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS mercadopago_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id VARCHAR(255),
    topic VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    user_id VARCHAR(255),
    application_id VARCHAR(255),
    webhook_type VARCHAR(100),
    data_id VARCHAR(255),
    action VARCHAR(100),
    api_version VARCHAR(50),
    live_mode BOOLEAN DEFAULT false,
    date_created TIMESTAMP WITH TIME ZONE,
    raw_data JSONB,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_mercadopago_webhooks_webhook_id ON mercadopago_webhooks(webhook_id);
CREATE INDEX IF NOT EXISTS idx_mercadopago_webhooks_topic ON mercadopago_webhooks(topic);
CREATE INDEX IF NOT EXISTS idx_mercadopago_webhooks_processed ON mercadopago_webhooks(processed);
CREATE INDEX IF NOT EXISTS idx_mercadopago_webhooks_created_at ON mercadopago_webhooks(created_at DESC);

-- Configurar RLS (Row Level Security)
ALTER TABLE mercadopago_webhooks ENABLE ROW LEVEL SECURITY;

-- Política para el service role
CREATE POLICY "Service role can manage webhooks" ON mercadopago_webhooks
    FOR ALL USING (auth.role() = 'service_role');
```

### 3.3 Problemas de Timeout

#### Síntoma
```
Error: Function execution timed out
Status: 504 Gateway Timeout
```

#### Soluciones

1. **Optimizar procesamiento**
```javascript
// Procesar de forma asíncrona
async function processWebhookEvent(webhookData, webhookDbId) {
  // Marcar como recibido inmediatamente
  await supabase
    .from('mercadopago_webhooks')
    .update({ received_at: new Date().toISOString() })
    .eq('id', webhookDbId);
  
  // Procesar en background
  setImmediate(async () => {
    try {
      await actualProcessing(webhookData);
      await markAsProcessed(webhookDbId);
    } catch (error) {
      await markAsError(webhookDbId, error.message);
    }
  });
}
```

2. **Configurar timeout en Vercel**
```json
{
  "functions": {
    "pages/api/webhooks/mercadopago.js": {
      "maxDuration": 30
    }
  }
}
```

### 3.4 Problemas de Duplicados

#### Síntoma
```
Multiple webhook processing for same event
```

#### Solución
```javascript
async function handleDuplicateWebhook(webhookData) {
  // Verificar por webhook_id
  const { data: existing } = await supabase
    .from('mercadopago_webhooks')
    .select('id, processed, created_at')
    .eq('webhook_id', webhookData.id)
    .single();
  
  if (existing) {
    if (existing.processed) {
      console.log(`Webhook ${webhookData.id} already processed`);
      return { status: 'already_processed', id: existing.id };
    }
    
    // Si no está procesado pero existe, usar el registro existente
    console.log(`Webhook ${webhookData.id} exists but not processed, retrying`);
    return { status: 'retry', id: existing.id };
  }
  
  // Verificar por combinación topic + resource_id + timestamp
  const timeWindow = new Date(Date.now() - 5 * 60 * 1000); // 5 minutos
  const { data: similar } = await supabase
    .from('mercadopago_webhooks')
    .select('id, processed')
    .eq('topic', webhookData.topic)
    .eq('resource_id', webhookData.resource_id)
    .gte('created_at', timeWindow.toISOString())
    .limit(1)
    .single();
  
  if (similar?.processed) {
    console.log(`Similar webhook already processed for ${webhookData.topic}:${webhookData.resource_id}`);
    return { status: 'similar_processed', id: similar.id };
  }
  
  return { status: 'new' };
}
```

### 3.5 Problemas de API de Mercado Pago

#### Síntoma
```
Error: Request failed with status code 401/404/500
```

#### Solución con Retry
```javascript
import axios from 'axios';

const mpApiWithRetry = axios.create({
  baseURL: 'https://api.mercadopago.com',
  headers: {
    'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Interceptor para reintentos
mpApiWithRetry.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config;
    
    // No reintentar errores 4xx (excepto 429)
    if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
      throw error;
    }
    
    // Configurar reintentos
    config.retryCount = config.retryCount || 0;
    const maxRetries = 3;
    const retryDelay = Math.pow(2, config.retryCount) * 1000; // Exponential backoff
    
    if (config.retryCount < maxRetries) {
      config.retryCount++;
      console.log(`Retrying MP API call (${config.retryCount}/${maxRetries}) after ${retryDelay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return mpApiWithRetry(config);
    }
    
    throw error;
  }
);

export { mpApiWithRetry as mpApi };
```

## 4. Herramientas de Debugging

### 4.1 Logger Avanzado
```javascript
// lib/logger.js
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...meta
      });
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Agregar transporte de archivo en producción
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ 
    filename: 'logs/webhook-errors.log', 
    level: 'error' 
  }));
  logger.add(new winston.transports.File({ 
    filename: 'logs/webhooks.log' 
  }));
}

export default logger;
```

### 4.2 Middleware de Debugging
```javascript
// lib/webhook-debug-middleware.js
import logger from './logger';

export function debugMiddleware(req, res, next) {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  
  // Log request
  logger.info('Webhook request received', {
    requestId,
    method: req.method,
    url: req.url,
    headers: {
      'x-signature': req.headers['x-signature'],
      'x-request-id': req.headers['x-request-id'],
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']
    },
    body: req.body
  });
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const processingTime = Date.now() - startTime;
    
    logger.info('Webhook response sent', {
      requestId,
      statusCode: res.statusCode,
      processingTime,
      response: data
    });
    
    return originalJson.call(this, data);
  };
  
  next();
}
```

### 4.3 Health Check Endpoint
```javascript
// pages/api/webhooks/health.js
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {}
  };
  
  try {
    // Check Supabase connection
    const { data, error } = await supabase
      .from('mercadopago_webhooks')
      .select('count')
      .limit(1);
    
    checks.checks.supabase = {
      status: error ? 'unhealthy' : 'healthy',
      error: error?.message
    };
    
    // Check Mercado Pago API
    try {
      const mpResponse = await axios.get('https://api.mercadopago.com/users/me', {
        headers: {
          'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
        },
        timeout: 5000
      });
      
      checks.checks.mercadopago = {
        status: 'healthy',
        user_id: mpResponse.data.id
      };
    } catch (mpError) {
      checks.checks.mercadopago = {
        status: 'unhealthy',
        error: mpError.message
      };
    }
    
    // Check recent webhook activity
    const since = new Date(Date.now() - 60 * 60 * 1000); // 1 hour
    const { data: recentWebhooks } = await supabase
      .from('mercadopago_webhooks')
      .select('processed')
      .gte('created_at', since.toISOString());
    
    const totalRecent = recentWebhooks?.length || 0;
    const processedRecent = recentWebhooks?.filter(w => w.processed).length || 0;
    const failureRate = totalRecent > 0 ? ((totalRecent - processedRecent) / totalRecent) * 100 : 0;
    
    checks.checks.webhook_activity = {
      status: failureRate > 20 ? 'warning' : 'healthy',
      recent_webhooks: totalRecent,
      processed: processedRecent,
      failure_rate: `${failureRate.toFixed(1)}%`
    };
    
    // Overall status
    const hasUnhealthy = Object.values(checks.checks).some(check => check.status === 'unhealthy');
    const hasWarning = Object.values(checks.checks).some(check => check.status === 'warning');
    
    if (hasUnhealthy) {
      checks.status = 'unhealthy';
      res.status(503);
    } else if (hasWarning) {
      checks.status = 'warning';
      res.status(200);
    } else {
      res.status(200);
    }
    
    res.json(checks);
    
  } catch (error) {
    res.status(503).json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: error.message
    });
  }
}
```

## 5. Alertas y Monitoreo

### 5.1 Sistema de Alertas Simple
```javascript
// lib/alerts.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  // Configurar según tu proveedor de email
  service: 'gmail',
  auth: {
    user: process.env.ALERT_EMAIL_USER,
    pass: process.env.ALERT_EMAIL_PASS
  }
});

export async function sendAlert(type, message, details = {}) {
  const alertConfig = {
    webhook_failure: {
      subject: '🚨 Webhook Failure Alert',
      priority: 'high'
    },
    high_failure_rate: {
      subject: '⚠️ High Webhook Failure Rate',
      priority: 'medium'
    },
    api_error: {
      subject: '🔴 Mercado Pago API Error',
      priority: 'high'
    }
  };
  
  const config = alertConfig[type] || {
    subject: '📢 Webhook Alert',
    priority: 'low'
  };
  
  const emailContent = `
    <h2>${config.subject}</h2>
    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    <p><strong>Message:</strong> ${message}</p>
    <h3>Details:</h3>
    <pre>${JSON.stringify(details, null, 2)}</pre>
  `;
  
  try {
    await transporter.sendMail({
      from: process.env.ALERT_EMAIL_FROM,
      to: process.env.ALERT_EMAIL_TO,
      subject: config.subject,
      html: emailContent,
      priority: config.priority
    });
    
    console.log(`Alert sent: ${type}`);
  } catch (error) {
    console.error('Failed to send alert:', error);
  }
}

// Verificar y enviar alertas
export async function checkAndSendAlerts() {
  const since = new Date(Date.now() - 60 * 60 * 1000); // 1 hora
  
  const { data: recentWebhooks } = await supabase
    .from('mercadopago_webhooks')
    .select('*')
    .gte('created_at', since.toISOString());
  
  if (!recentWebhooks || recentWebhooks.length === 0) return;
  
  const failed = recentWebhooks.filter(w => !w.processed && w.retry_count >= 5);
  const failureRate = (failed.length / recentWebhooks.length) * 100;
  
  // Alerta por tasa de fallos alta
  if (failureRate > 20) {
    await sendAlert('high_failure_rate', 
      `Failure rate: ${failureRate.toFixed(1)}% in the last hour`,
      {
        total_webhooks: recentWebhooks.length,
        failed_webhooks: failed.length,
        failure_rate: `${failureRate.toFixed(1)}%`
      }
    );
  }
  
  // Alerta por webhooks específicos fallidos
  const criticalFailures = failed.filter(w => 
    w.topic === 'payment' && w.error_message?.includes('timeout')
  );
  
  if (criticalFailures.length > 0) {
    await sendAlert('webhook_failure',
      `${criticalFailures.length} critical payment webhooks failed`,
      {
        failed_webhooks: criticalFailures.map(w => ({
          id: w.webhook_id,
          topic: w.topic,
          error: w.error_message,
          retry_count: w.retry_count
        }))
      }
    );
  }
}
```

## 6. Checklist de Deployment

### ✅ Pre-deployment
- [ ] Variables de entorno configuradas en producción
- [ ] Tabla `mercadopago_webhooks` creada en Supabase
- [ ] Campos MP agregados a tablas `orders` y `user_subscriptions`
- [ ] SSL/TLS configurado en el dominio
- [ ] URL pública accesible

### ✅ Deployment
- [ ] Código desplegado sin errores
- [ ] Endpoint `/api/webhooks/mercadopago` respondiendo
- [ ] Health check endpoint funcionando
- [ ] Logs configurados correctamente

### ✅ Post-deployment
- [ ] Webhooks configurados en panel de Mercado Pago
- [ ] Test de webhook exitoso
- [ ] Monitoreo activo
- [ ] Alertas configuradas
- [ ] Documentación actualizada

### ✅ Testing en Producción
- [ ] Crear pago de prueba
- [ ] Verificar recepción de webhook
- [ ] Confirmar actualización en base de datos
- [ ] Validar logs y métricas

Esta documentación proporciona todas las herramientas necesarias para configurar, implementar y mantener un sistema robusto de webhooks de Mercado Pago con capacidades completas de debugging y monitoreo.