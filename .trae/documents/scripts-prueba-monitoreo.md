# Scripts de Prueba y Monitoreo - Sistema de Pagos Pet Gourmet

## 🧪 Scripts de Prueba

### 1. Script de Prueba de Webhook

**Crear archivo:** `scripts/test-webhook.js`
```javascript
const crypto = require('crypto')
const fetch = require('node-fetch') // npm install node-fetch@2

// Configuración
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/mercadopago/webhook'
const WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET

if (!WEBHOOK_SECRET) {
  console.error('❌ MERCADOPAGO_WEBHOOK_SECRET no está configurado')
  process.exit(1)
}

// Función para crear firma
function createSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  return `ts=${timestamp},v1=${signature}`
}

// Payloads de prueba
const testPayloads = {
  payment: {
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
      id: 'payment_test_123'
    }
  },
  
  subscription: {
    id: '67890',
    live_mode: false,
    type: 'subscription_preapproval',
    date_created: new Date().toISOString(),
    application_id: '123456789',
    user_id: '987654321',
    version: 1,
    api_version: 'v1',
    action: 'subscription_preapproval.created',
    data: {
      id: 'preapproval_test_456'
    }
  },
  
  subscription_payment: {
    id: '11111',
    live_mode: false,
    type: 'subscription_authorized_payment',
    date_created: new Date().toISOString(),
    application_id: '123456789',
    user_id: '987654321',
    version: 1,
    api_version: 'v1',
    action: 'subscription_authorized_payment.created',
    data: {
      id: 'sub_payment_test_789'
    }
  }
}

// Función para probar webhook
async function testWebhook(type, payload) {
  console.log(`\n🧪 Probando webhook tipo: ${type}`)
  
  const payloadString = JSON.stringify(payload)
  const signature = createSignature(payloadString, WEBHOOK_SECRET)
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': signature,
        'x-request-id': `test-${Date.now()}`,
        'user-agent': 'MercadoPago/1.0'
      },
      body: payloadString
    })
    
    const responseData = await response.text()
    
    if (response.ok) {
      console.log(`✅ ${type}: ${response.status} - ${responseData}`)
    } else {
      console.log(`❌ ${type}: ${response.status} - ${responseData}`)
    }
    
  } catch (error) {
    console.log(`❌ ${type}: Error - ${error.message}`)
  }
}

// Ejecutar pruebas
async function runTests() {
  console.log('🚀 Iniciando pruebas de webhook...')
  console.log(`📍 URL: ${WEBHOOK_URL}`)
  
  // Probar endpoint de salud primero
  try {
    const healthResponse = await fetch(WEBHOOK_URL.replace('/api/mercadopago/webhook', '/api/health'))
    const healthData = await healthResponse.json()
    console.log('🏥 Estado del sistema:', healthData.status)
  } catch (error) {
    console.log('⚠️  No se pudo verificar el estado del sistema')
  }
  
  // Ejecutar pruebas de webhook
  for (const [type, payload] of Object.entries(testPayloads)) {
    await testWebhook(type, payload)
    await new Promise(resolve => setTimeout(resolve, 1000)) // Esperar 1 segundo entre pruebas
  }
  
  console.log('\n✨ Pruebas completadas')
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = { testWebhook, createSignature }
```

**Uso:**
```bash
# Instalar dependencias
npm install node-fetch@2

# Probar localmente
WEBHOOK_URL=http://localhost:3000/api/mercadopago/webhook node scripts/test-webhook.js

# Probar en producción
WEBHOOK_URL=https://petgourmet.com.co/api/mercadopago/webhook node scripts/test-webhook.js
```

### 2. Script de Verificación de Base de Datos

**Crear archivo:** `scripts/verify-database.js`
```javascript
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Verificaciones de base de datos
const checks = [
  {
    name: 'Tablas principales',
    query: `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('orders', 'order_items', 'user_subscriptions', 'subscription_billing_history', 'products')
    `,
    expected: 5
  },
  
  {
    name: 'Políticas RLS habilitadas',
    query: `
      SELECT schemaname, tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('orders', 'user_subscriptions')
    `,
    expected: 2
  },
  
  {
    name: 'Índices en orders',
    query: `
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'orders' 
      AND indexname LIKE 'idx_%'
    `,
    expected: 4 // Al menos 4 índices
  },
  
  {
    name: 'Órdenes de prueba',
    query: 'SELECT COUNT(*) as count FROM orders',
    expected: null // Solo verificar que no hay error
  },
  
  {
    name: 'Suscripciones activas',
    query: "SELECT COUNT(*) as count FROM user_subscriptions WHERE status = 'active'",
    expected: null
  }
]

async function runDatabaseChecks() {
  console.log('🔍 Verificando base de datos...\n')
  
  let passed = 0
  let failed = 0
  
  for (const check of checks) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: check.query })
      
      if (error) {
        console.log(`❌ ${check.name}: ${error.message}`)
        failed++
        continue
      }
      
      const count = Array.isArray(data) ? data.length : (data?.[0]?.count || 0)
      
      if (check.expected !== null && count < check.expected) {
        console.log(`⚠️  ${check.name}: ${count}/${check.expected} (esperado al menos ${check.expected})`)
        failed++
      } else {
        console.log(`✅ ${check.name}: ${count} ${check.expected ? `(esperado: ${check.expected})` : ''}`)
        passed++
      }
      
    } catch (error) {
      console.log(`❌ ${check.name}: ${error.message}`)
      failed++
    }
  }
  
  console.log(`\n📊 Resumen: ${passed} ✅ | ${failed} ❌`)
  
  if (failed > 0) {
    console.log('\n⚠️  Hay problemas en la base de datos que necesitan atención')
    process.exit(1)
  } else {
    console.log('\n🎉 Base de datos verificada correctamente')
  }
}

// Función alternativa usando queries directas
async function runSimpleChecks() {
  console.log('🔍 Verificación simple de base de datos...\n')
  
  const simpleChecks = [
    { name: 'orders', table: 'orders' },
    { name: 'order_items', table: 'order_items' },
    { name: 'user_subscriptions', table: 'user_subscriptions' },
    { name: 'subscription_billing_history', table: 'subscription_billing_history' },
    { name: 'products', table: 'products' }
  ]
  
  for (const check of simpleChecks) {
    try {
      const { data, error } = await supabase
        .from(check.table)
        .select('count', { count: 'exact', head: true })
      
      if (error) {
        console.log(`❌ Tabla ${check.name}: ${error.message}`)
      } else {
        console.log(`✅ Tabla ${check.name}: ${data || 0} registros`)
      }
    } catch (error) {
      console.log(`❌ Tabla ${check.name}: ${error.message}`)
    }
  }
}

if (require.main === module) {
  runSimpleChecks().catch(console.error)
}

module.exports = { runDatabaseChecks, runSimpleChecks }
```

### 3. Script de Monitoreo de Órdenes Pendientes

**Crear archivo:** `scripts/monitor-orders.js`
```javascript
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Configuración de alertas
const ALERT_THRESHOLDS = {
  PENDING_ORDERS_1H: 5,    // Más de 5 órdenes pendientes por más de 1 hora
  PENDING_ORDERS_24H: 2,   // Más de 2 órdenes pendientes por más de 24 horas
  FAILED_PAYMENTS_1H: 10   // Más de 10 pagos fallidos en la última hora
}

async function checkPendingOrders() {
  console.log('📊 Verificando órdenes pendientes...\n')
  
  // Órdenes pendientes por más de 1 hora
  const { data: pending1h, error: error1h } = await supabase
    .from('orders')
    .select('id, created_at, customer_email, total')
    .eq('status', 'pending_payment')
    .lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
  
  if (error1h) {
    console.log('❌ Error consultando órdenes pendientes 1h:', error1h.message)
  } else {
    console.log(`📋 Órdenes pendientes > 1h: ${pending1h.length}`)
    if (pending1h.length > ALERT_THRESHOLDS.PENDING_ORDERS_1H) {
      console.log(`🚨 ALERTA: ${pending1h.length} órdenes pendientes por más de 1 hora`)
    }
  }
  
  // Órdenes pendientes por más de 24 horas
  const { data: pending24h, error: error24h } = await supabase
    .from('orders')
    .select('id, created_at, customer_email, total')
    .eq('status', 'pending_payment')
    .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  
  if (error24h) {
    console.log('❌ Error consultando órdenes pendientes 24h:', error24h.message)
  } else {
    console.log(`📋 Órdenes pendientes > 24h: ${pending24h.length}`)
    if (pending24h.length > ALERT_THRESHOLDS.PENDING_ORDERS_24H) {
      console.log(`🚨 ALERTA CRÍTICA: ${pending24h.length} órdenes pendientes por más de 24 horas`)
      pending24h.forEach(order => {
        console.log(`   - Orden ${order.id}: $${order.total} (${order.customer_email})`)
      })
    }
  }
  
  // Pagos rechazados en la última hora
  const { data: rejected, error: errorRejected } = await supabase
    .from('orders')
    .select('id, created_at, payment_status')
    .in('payment_status', ['rejected', 'cancelled'])
    .gt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
  
  if (errorRejected) {
    console.log('❌ Error consultando pagos rechazados:', errorRejected.message)
  } else {
    console.log(`📋 Pagos rechazados última hora: ${rejected.length}`)
    if (rejected.length > ALERT_THRESHOLDS.FAILED_PAYMENTS_1H) {
      console.log(`🚨 ALERTA: ${rejected.length} pagos fallidos en la última hora`)
    }
  }
}

async function checkSubscriptions() {
  console.log('\n💳 Verificando suscripciones...\n')
  
  // Suscripciones activas
  const { data: active, error: errorActive } = await supabase
    .from('user_subscriptions')
    .select('count', { count: 'exact', head: true })
    .eq('status', 'active')
  
  if (errorActive) {
    console.log('❌ Error consultando suscripciones activas:', errorActive.message)
  } else {
    console.log(`📋 Suscripciones activas: ${active || 0}`)
  }
  
  // Suscripciones que vencen en los próximos 3 días
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: expiring, error: errorExpiring } = await supabase
    .from('user_subscriptions')
    .select('id, next_billing_date, user_id')
    .eq('status', 'active')
    .lte('next_billing_date', threeDaysFromNow)
  
  if (errorExpiring) {
    console.log('❌ Error consultando suscripciones próximas a vencer:', errorExpiring.message)
  } else {
    console.log(`📋 Suscripciones que facturan en 3 días: ${expiring.length}`)
    if (expiring.length > 0) {
      console.log('📅 Próximas facturaciones:')
      expiring.forEach(sub => {
        console.log(`   - Suscripción ${sub.id}: ${sub.next_billing_date}`)
      })
    }
  }
}

async function generateDailyReport() {
  console.log('📈 Reporte diario del sistema\n')
  console.log('=' .repeat(50))
  
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  // Órdenes de hoy
  const { data: todayOrders, error: errorToday } = await supabase
    .from('orders')
    .select('status, total')
    .gte('created_at', today)
  
  if (!errorToday && todayOrders) {
    const confirmed = todayOrders.filter(o => o.status === 'confirmed')
    const pending = todayOrders.filter(o => o.status === 'pending_payment')
    const cancelled = todayOrders.filter(o => o.status === 'cancelled')
    
    const totalRevenue = confirmed.reduce((sum, order) => sum + parseFloat(order.total), 0)
    
    console.log(`📊 Órdenes de hoy (${today}):`)
    console.log(`   ✅ Confirmadas: ${confirmed.length} ($${totalRevenue.toLocaleString('es-CO')})`)
    console.log(`   ⏳ Pendientes: ${pending.length}`)
    console.log(`   ❌ Canceladas: ${cancelled.length}`)
  }
  
  // Comparación con ayer
  const { data: yesterdayOrders, error: errorYesterday } = await supabase
    .from('orders')
    .select('status, total')
    .gte('created_at', yesterday)
    .lt('created_at', today)
  
  if (!errorYesterday && yesterdayOrders) {
    const yesterdayConfirmed = yesterdayOrders.filter(o => o.status === 'confirmed')
    const yesterdayRevenue = yesterdayConfirmed.reduce((sum, order) => sum + parseFloat(order.total), 0)
    
    console.log(`\n📊 Comparación con ayer (${yesterday}):`)
    console.log(`   Órdenes: ${todayOrders?.length || 0} vs ${yesterdayOrders.length}`)
    console.log(`   Ingresos: $${(todayOrders ? todayOrders.filter(o => o.status === 'confirmed').reduce((sum, order) => sum + parseFloat(order.total), 0) : 0).toLocaleString('es-CO')} vs $${yesterdayRevenue.toLocaleString('es-CO')}`)
  }
  
  console.log('\n' + '=' .repeat(50))
}

async function runMonitoring() {
  console.log('🔍 Iniciando monitoreo del sistema...\n')
  console.log(`⏰ ${new Date().toLocaleString('es-CO')}\n`)
  
  await checkPendingOrders()
  await checkSubscriptions()
  await generateDailyReport()
  
  console.log('\n✅ Monitoreo completado')
}

if (require.main === module) {
  runMonitoring().catch(console.error)
}

module.exports = { checkPendingOrders, checkSubscriptions, generateDailyReport }
```

## 📊 Scripts de Análisis

### 4. Script de Análisis de Rendimiento

**Crear archivo:** `scripts/performance-analysis.js`
```javascript
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function analyzeConversionRates() {
  console.log('📈 Análisis de tasas de conversión\n')
  
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  
  // Obtener órdenes de los últimos 30 días
  const { data: orders, error } = await supabase
    .from('orders')
    .select('status, created_at, total')
    .gte('created_at', thirtyDaysAgo)
  
  if (error) {
    console.log('❌ Error obteniendo órdenes:', error.message)
    return
  }
  
  const totalOrders = orders.length
  const confirmedOrders = orders.filter(o => o.status === 'confirmed').length
  const pendingOrders = orders.filter(o => o.status === 'pending_payment').length
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length
  
  const conversionRate = totalOrders > 0 ? (confirmedOrders / totalOrders * 100).toFixed(2) : 0
  const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders * 100).toFixed(2) : 0
  
  console.log(`📊 Últimos 30 días:`)
  console.log(`   Total órdenes: ${totalOrders}`)
  console.log(`   Confirmadas: ${confirmedOrders} (${conversionRate}%)`)
  console.log(`   Pendientes: ${pendingOrders}`)
  console.log(`   Canceladas: ${cancelledOrders} (${cancellationRate}%)`)
  
  // Análisis por semana
  const weeklyData = {}
  orders.forEach(order => {
    const week = getWeekNumber(new Date(order.created_at))
    if (!weeklyData[week]) {
      weeklyData[week] = { total: 0, confirmed: 0, cancelled: 0 }
    }
    weeklyData[week].total++
    if (order.status === 'confirmed') weeklyData[week].confirmed++
    if (order.status === 'cancelled') weeklyData[week].cancelled++
  })
  
  console.log('\n📅 Análisis semanal:')
  Object.entries(weeklyData).forEach(([week, data]) => {
    const weekConversion = (data.confirmed / data.total * 100).toFixed(1)
    console.log(`   Semana ${week}: ${data.confirmed}/${data.total} (${weekConversion}%)`)
  })
}

function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

async function analyzeSubscriptionMetrics() {
  console.log('\n💳 Análisis de métricas de suscripción\n')
  
  // Suscripciones por tipo
  const { data: subscriptions, error } = await supabase
    .from('user_subscriptions')
    .select('subscription_type, status, created_at, price')
  
  if (error) {
    console.log('❌ Error obteniendo suscripciones:', error.message)
    return
  }
  
  const byType = {}
  const byStatus = {}
  let totalMRR = 0
  
  subscriptions.forEach(sub => {
    // Por tipo
    if (!byType[sub.subscription_type]) {
      byType[sub.subscription_type] = { count: 0, revenue: 0 }
    }
    byType[sub.subscription_type].count++
    
    // Por estado
    if (!byStatus[sub.status]) {
      byStatus[sub.status] = 0
    }
    byStatus[sub.status]++
    
    // MRR (Monthly Recurring Revenue)
    if (sub.status === 'active') {
      const monthlyRevenue = sub.subscription_type === 'weekly' 
        ? sub.price * 4.33 // Aproximadamente 4.33 semanas por mes
        : sub.price
      totalMRR += monthlyRevenue
      byType[sub.subscription_type].revenue += monthlyRevenue
    }
  })
  
  console.log('📊 Suscripciones por tipo:')
  Object.entries(byType).forEach(([type, data]) => {
    console.log(`   ${type}: ${data.count} suscripciones ($${data.revenue.toLocaleString('es-CO')}/mes)`)
  })
  
  console.log('\n📊 Suscripciones por estado:')
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`)
  })
  
  console.log(`\n💰 MRR Total: $${totalMRR.toLocaleString('es-CO')}`)
  console.log(`💰 ARR Proyectado: $${(totalMRR * 12).toLocaleString('es-CO')}`)
}

async function runPerformanceAnalysis() {
  console.log('🔍 Análisis de rendimiento del sistema\n')
  console.log('=' .repeat(60))
  
  await analyzeConversionRates()
  await analyzeSubscriptionMetrics()
  
  console.log('\n' + '=' .repeat(60))
  console.log('✅ Análisis completado')
}

if (require.main === module) {
  runPerformanceAnalysis().catch(console.error)
}

module.exports = { analyzeConversionRates, analyzeSubscriptionMetrics }
```

## 🚨 Sistema de Alertas

### 5. Script de Alertas por Email

**Crear archivo:** `scripts/alert-system.js`
```javascript
const nodemailer = require('nodemailer')
const { checkPendingOrders, checkSubscriptions } = require('./monitor-orders')
require('dotenv').config({ path: '.env.local' })

// Configurar transportador de email
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@petgourmet.com.co'

async function sendAlert(subject, message, priority = 'normal') {
  const priorityEmojis = {
    low: '🔵',
    normal: '🟡',
    high: '🟠',
    critical: '🔴'
  }
  
  const emailSubject = `${priorityEmojis[priority]} Pet Gourmet Alert: ${subject}`
  
  const emailBody = `
    <h2>Alerta del Sistema Pet Gourmet</h2>
    <p><strong>Prioridad:</strong> ${priority.toUpperCase()}</p>
    <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CO')}</p>
    <hr>
    <div style="font-family: monospace; background: #f5f5f5; padding: 15px; border-radius: 5px;">
      ${message.replace(/\n/g, '<br>')}
    </div>
    <hr>
    <p><small>Este es un mensaje automático del sistema de monitoreo de Pet Gourmet.</small></p>
  `
  
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: ADMIN_EMAIL,
      subject: emailSubject,
      html: emailBody
    })
    
    console.log(`📧 Alerta enviada: ${subject}`)
  } catch (error) {
    console.error('❌ Error enviando alerta:', error.message)
  }
}

async function checkAndAlert() {
  console.log('🚨 Verificando condiciones de alerta...\n')
  
  const alerts = []
  
  try {
    // Verificar órdenes pendientes
    const { data: pending24h } = await supabase
      .from('orders')
      .select('count', { count: 'exact', head: true })
      .eq('status', 'pending_payment')
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    
    if (pending24h > 2) {
      alerts.push({
        subject: 'Órdenes Pendientes Críticas',
        message: `Hay ${pending24h} órdenes pendientes por más de 24 horas`,
        priority: 'critical'
      })
    }
    
    // Verificar pagos fallidos
    const { data: failedPayments } = await supabase
      .from('orders')
      .select('count', { count: 'exact', head: true })
      .in('payment_status', ['rejected', 'cancelled'])
      .gt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    
    if (failedPayments > 10) {
      alerts.push({
        subject: 'Alto Número de Pagos Fallidos',
        message: `${failedPayments} pagos han fallado en la última hora`,
        priority: 'high'
      })
    }
    
    // Verificar suscripciones inactivas
    const { data: inactiveSubscriptions } = await supabase
      .from('user_subscriptions')
      .select('count', { count: 'exact', head: true })
      .eq('status', 'cancelled')
      .gt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    
    if (inactiveSubscriptions > 5) {
      alerts.push({
        subject: 'Múltiples Cancelaciones de Suscripción',
        message: `${inactiveSubscriptions} suscripciones han sido canceladas en las últimas 24 horas`,
        priority: 'high'
      })
    }
    
  } catch (error) {
    alerts.push({
      subject: 'Error en Sistema de Monitoreo',
      message: `Error al verificar métricas: ${error.message}`,
      priority: 'critical'
    })
  }
  
  // Enviar alertas
  for (const alert of alerts) {
    await sendAlert(alert.subject, alert.message, alert.priority)
  }
  
  if (alerts.length === 0) {
    console.log('✅ No se encontraron condiciones de alerta')
  } else {
    console.log(`📧 ${alerts.length} alertas enviadas`)
  }
}

if (require.main === module) {
  checkAndAlert().catch(console.error)
}

module.exports = { sendAlert, checkAndAlert }
```

## 📋 Package.json Scripts

**Agregar a `package.json`:**
```json
{
  "scripts": {
    "test:webhook": "node scripts/test-webhook.js",
    "verify:db": "node scripts/verify-database.js",
    "monitor": "node scripts/monitor-orders.js",
    "analyze": "node scripts/performance-analysis.js",
    "alerts": "node scripts/alert-system.js",
    "health:check": "curl -f http://localhost:3000/api/health || exit 1"
  }
}
```

## 🔄 Automatización con Cron Jobs

### 6. Configuración de Cron Jobs

**Para servidor Linux/Mac, agregar a crontab:**
```bash
# Editar crontab
crontab -e

# Agregar estas líneas:
# Monitoreo cada 15 minutos
*/15 * * * * cd /path/to/project && npm run monitor >> /var/log/petgourmet-monitor.log 2>&1

# Verificación de alertas cada hora
0 * * * * cd /path/to/project && npm run alerts >> /var/log/petgourmet-alerts.log 2>&1

# Análisis diario a las 9 AM
0 9 * * * cd /path/to/project && npm run analyze >> /var/log/petgourmet-analysis.log 2>&1

# Verificación de salud cada 5 minutos
*/5 * * * * curl -f https://petgourmet.com.co/api/health || echo "Health check failed at $(date)" >> /var/log/petgourmet-health.log
```

### 7. Script de Configuración Automática

**Crear archivo:** `scripts/setup-monitoring.sh`
```bash
#!/bin/bash

echo "🚀 Configurando sistema de monitoreo Pet Gourmet..."

# Crear directorio de logs
sudo mkdir -p /var/log/petgourmet
sudo chown $USER:$USER /var/log/petgourmet

# Instalar dependencias
npm install node-fetch@2 @supabase/supabase-js nodemailer

# Hacer scripts ejecutables
chmod +x scripts/*.js

# Crear archivo de configuración de cron
cat > petgourmet-cron.txt << EOF
# Pet Gourmet Monitoring Cron Jobs
*/15 * * * * cd $(pwd) && npm run monitor >> /var/log/petgourmet/monitor.log 2>&1
0 * * * * cd $(pwd) && npm run alerts >> /var/log/petgourmet/alerts.log 2>&1
0 9 * * * cd $(pwd) && npm run analyze >> /var/log/petgourmet/analysis.log 2>&1
*/5 * * * * curl -f https://petgourmet.com.co/api/health || echo "Health check failed at \$(date)" >> /var/log/petgourmet/health.log
EOF

echo "📋 Archivo de cron creado: petgourmet-cron.txt"
echo "Para instalar, ejecuta: crontab petgourmet-cron.txt"

# Probar scripts
echo "🧪 Probando scripts..."
npm run verify:db
npm run monitor

echo "✅ Configuración completada"
echo "📖 Revisa los logs en /var/log/petgourmet/"
```

## 📊 Dashboard de Monitoreo Simple

### 8. Página de Monitoreo para Admin

**Crear archivo:** `app/admin/monitoring/page.tsx`
```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface MonitoringData {
  pendingOrders: number
  todayOrders: number
  activeSubscriptions: number
  todayRevenue: number
  systemHealth: 'healthy' | 'degraded' | 'unhealthy'
}

export default function MonitoringPage() {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchMonitoringData = async () => {
    try {
      setLoading(true)
      
      // Obtener datos en paralelo
      const [pendingRes, todayRes, subsRes, healthRes] = await Promise.all([
        supabase.from('orders').select('count', { count: 'exact', head: true }).eq('status', 'pending_payment'),
        supabase.from('orders').select('total, status').gte('created_at', new Date().toISOString().split('T')[0]),
        supabase.from('user_subscriptions').select('count', { count: 'exact', head: true }).eq('status', 'active'),
        fetch('/api/health').then(r => r.json())
      ])
      
      const todayOrders = todayRes.data || []
      const todayRevenue = todayOrders
        .filter(order => order.status === 'confirmed')
        .reduce((sum, order) => sum + parseFloat(order.total), 0)
      
      setData({
        pendingOrders: pendingRes.count || 0,
        todayOrders: todayOrders.length,
        activeSubscriptions: subsRes.count || 0,
        todayRevenue,
        systemHealth: healthRes.status || 'unhealthy'
      })
      
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching monitoring data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMonitoringData()
    const interval = setInterval(fetchMonitoringData, 30000) // Actualizar cada 30 segundos
    return () => clearInterval(interval)
  }, [])

  if (loading && !data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Monitoreo del Sistema</h1>
        <div className="text-center">Cargando datos...</div>
      </div>
    )
  }

  const healthColors = {
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    unhealthy: 'bg-red-100 text-red-800'
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Monitoreo del Sistema</h1>
        <div className="text-sm text-gray-500">
          Última actualización: {lastUpdate.toLocaleTimeString('es-CO')}
        </div>
      </div>

      {/* Estado del Sistema */}
      <div className={`p-4 rounded-lg mb-6 ${healthColors[data?.systemHealth || 'unhealthy']}`}>
        <h2 className="font-semibold mb-2">Estado del Sistema</h2>
        <div className="text-lg">
          {data?.systemHealth === 'healthy' && '✅ Sistema funcionando correctamente'}
          {data?.systemHealth === 'degraded' && '⚠️ Sistema con problemas menores'}
          {data?.systemHealth === 'unhealthy' && '❌ Sistema con problemas críticos'}
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Órdenes Pendientes</h3>
          <div className="text-3xl font-bold text-orange-600">{data?.pendingOrders || 0}</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Órdenes Hoy</h3>
          <div className="text-3xl font-bold text-blue-600">{data?.todayOrders || 0}</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Suscripciones Activas</h3>
          <div className="text-3xl font-bold text-green-600">{data?.activeSubscriptions || 0}</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Ingresos Hoy</h3>
          <div className="text-3xl font-bold text-purple-600">
            ${(data?.todayRevenue || 0).toLocaleString('es-CO')}
          </div>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex gap-4">
        <button
          onClick={fetchMonitoringData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Actualizando...' : 'Actualizar Datos'}
        </button>
        
        <a
          href="/api/health"
          target="_blank"
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Ver Estado Técnico
        </a>
      </div>
    </div>
  )
}
```

## 🎯 Uso de los Scripts

### Comandos Principales:

```bash
# Verificar webhook
npm run test:webhook

# Verificar base de datos
npm run verify:db

# Monitorear órdenes
npm run monitor

# Análisis de rendimiento
npm run analyze

# Verificar alertas
npm run alerts

# Verificar salud del sistema
curl https://petgourmet.com.co/api/health
```

### Configuración de Monitoreo Automático:

1. **Ejecutar setup:** `chmod +x scripts/setup-monitoring.sh && ./scripts/setup-monitoring.sh`
2. **Instalar cron jobs:** `crontab petgourmet-cron.txt`
3. **Verificar logs:** `tail -f /var/log/petgourmet/monitor.log`

---

**Estos scripts proporcionan un sistema completo de monitoreo y alertas para el sistema de pagos de Pet Gourmet.**