#!/usr/bin/env node

/**
 * Script para ejecutar validación automática de pagos
 * Se puede usar localmente o en servidores para simular el cron job
 */

const https = require('https')
const http = require('http')

const config = {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  cronSecret: process.env.CRON_SECRET || 'dev-secret-key',
  interval: 5 * 60 * 1000, // 5 minutos en milisegundos
  maxAge: 2 // Validar órdenes de las últimas 2 horas
}

function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    
    const req = protocol.request(url, options, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(body)
          resolve({ status: res.statusCode, data: result })
        } catch (e) {
          resolve({ status: res.statusCode, data: body })
        }
      })
    })
    
    req.on('error', reject)
    
    if (data) {
      req.write(JSON.stringify(data))
    }
    
    req.end()
  })
}

async function validatePayments() {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] 🔄 Iniciando validación automática de pagos...`)
  
  try {
    // Ejecutar validación automática
    const response = await makeRequest(
      `${config.baseUrl}/api/cron/auto-validate-payments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.cronSecret}`
        }
      },
      {
        maxAge: config.maxAge,
        force: false
      }
    )
    
    if (response.status === 200 && response.data.success) {
      const result = response.data
      console.log(`[${timestamp}] ✅ Validación exitosa:`)
      console.log(`   📊 Órdenes procesadas: ${result.sync?.totalProcessed || 0}`)
      console.log(`   ✅ Exitosas: ${result.sync?.successful || 0}`)
      console.log(`   ❌ Fallidas: ${result.sync?.failed || 0}`)
      console.log(`   🏥 Estado del sistema: ${result.health?.status || 'unknown'} (${result.health?.score || 0}/100)`)
      
      if (result.alerts?.needsAttention) {
        console.log(`   🚨 Alertas: ${result.alerts.reasons.join(', ')}`)
      }
    } else {
      console.error(`[${timestamp}] ❌ Error en validación:`, response.data)
    }
    
  } catch (error) {
    console.error(`[${timestamp}] 💥 Error crítico:`, error.message)
  }
}

async function checkSystemHealth() {
  try {
    const response = await makeRequest(
      `${config.baseUrl}/api/admin/webhook-monitor?action=health`,
      { method: 'GET' }
    )
    
    if (response.status === 200 && response.data.success) {
      const health = response.data.health
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] 🏥 Estado del sistema: ${health.status} (${health.score}/100)`)
      
      if (health.issues && health.issues.length > 0) {
        console.log(`[${timestamp}] ⚠️  Problemas detectados: ${health.issues.length}`)
        health.issues.forEach((issue, index) => {
          console.log(`   ${index + 1}. [${issue.severity}] ${issue.description}`)
        })
      }
    }
  } catch (error) {
    console.error('Error verificando salud del sistema:', error.message)
  }
}

function startAutoValidation() {
  console.log('🚀 Iniciando validación automática de pagos...')
  console.log(`📍 URL: ${config.baseUrl}`)
  console.log(`⏰ Intervalo: ${config.interval / 1000 / 60} minutos`)
  console.log(`📅 Edad máxima: ${config.maxAge} horas`)
  console.log('---')
  
  // Ejecutar inmediatamente
  validatePayments()
  
  // Verificar salud del sistema cada 30 minutos
  setInterval(checkSystemHealth, 30 * 60 * 1000)
  
  // Ejecutar validación cada 5 minutos
  setInterval(validatePayments, config.interval)
  
  // Manejar señales de terminación
  process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo validación automática...')
    process.exit(0)
  })
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Deteniendo validación automática...')
    process.exit(0)
  })
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  startAutoValidation()
}

module.exports = {
  validatePayments,
  checkSystemHealth,
  startAutoValidation
}