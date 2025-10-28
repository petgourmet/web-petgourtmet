/**
 * Script de Prueba del Sistema Anti-Spam
 * 
 * Este script ayuda a verificar que todas las capas de protección
 * anti-spam están funcionando correctamente.
 * 
 * Ejecutar: node scripts/test-anti-spam.js
 */

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Test 1: Honeypot - Debería devolver éxito falso
async function testHoneypot() {
  log('\n📝 Test 1: Honeypot (campo oculto)', 'cyan')
  log('Esperado: Devolver éxito falso sin enviar email real', 'yellow')
  
  try {
    const response = await fetch(`${API_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Bot',
        email: 'bot@test.com',
        message: 'This is a bot message',
        honeypot: 'I am a bot!', // ← Campo honeypot activado
      })
    })
    
    const data = await response.json()
    
    if (response.ok && data.success) {
      log('✅ PASS: Bot fue engañado (respuesta de éxito falso)', 'green')
      return true
    } else {
      log('❌ FAIL: Respuesta inesperada', 'red')
      console.log(data)
      return false
    }
  } catch (error) {
    log(`❌ ERROR: ${error.message}`, 'red')
    return false
  }
}

// Test 2: reCAPTCHA ausente - Debería rechazar
async function testMissingRecaptcha() {
  log('\n📝 Test 2: Sin token de reCAPTCHA', 'cyan')
  log('Esperado: Rechazar con error 400', 'yellow')
  
  try {
    const response = await fetch(`${API_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Test message',
        // Sin recaptchaToken
      })
    })
    
    const data = await response.json()
    
    if (response.status === 400 && data.error) {
      log('✅ PASS: Solicitud rechazada correctamente', 'green')
      return true
    } else {
      log('❌ FAIL: Debería rechazar sin reCAPTCHA', 'red')
      console.log(data)
      return false
    }
  } catch (error) {
    log(`❌ ERROR: ${error.message}`, 'red')
    return false
  }
}

// Test 3: Contenido spam - Debería rechazar
async function testSpamContent() {
  log('\n📝 Test 3: Contenido identificado como spam', 'cyan')
  log('Esperado: Rechazar con error de contenido no permitido', 'yellow')
  
  try {
    const response = await fetch(`${API_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Click here to win free viagra and casino money!', // ← Spam obvio
        recaptchaToken: 'fake_token' // Solo para pasar la primera validación
      })
    })
    
    const data = await response.json()
    
    if (response.status === 400 && data.error?.includes('contenido')) {
      log('✅ PASS: Contenido spam detectado correctamente', 'green')
      return true
    } else {
      log('❌ FAIL: Debería detectar el spam', 'red')
      console.log(data)
      return false
    }
  } catch (error) {
    log(`❌ ERROR: ${error.message}`, 'red')
    return false
  }
}

// Test 4: Email temporal - Debería rechazar
async function testDisposableEmail() {
  log('\n📝 Test 4: Email temporal/desechable', 'cyan')
  log('Esperado: Rechazar email de dominio sospechoso', 'yellow')
  
  try {
    const response = await fetch(`${API_URL}/api/newsletter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@tempmail.com', // ← Dominio bloqueado
        recaptchaToken: 'fake_token'
      })
    })
    
    const data = await response.json()
    
    if (response.status === 400 && data.error) {
      log('✅ PASS: Email temporal rechazado', 'green')
      return true
    } else {
      log('❌ FAIL: Debería rechazar emails temporales', 'red')
      console.log(data)
      return false
    }
  } catch (error) {
    log(`❌ ERROR: ${error.message}`, 'red')
    return false
  }
}

// Test 5: Rate Limiting - Debería bloquear después de muchos intentos
async function testRateLimiting() {
  log('\n📝 Test 5: Rate Limiting', 'cyan')
  log('Esperado: Bloquear después de múltiples intentos rápidos', 'yellow')
  
  try {
    let blockedCount = 0
    const attempts = 12 // Más del límite configurado (10)
    
    for (let i = 0; i < attempts; i++) {
      const response = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Test ${i}`,
          email: `test${i}@example.com`,
          message: 'Test message',
          recaptchaToken: 'fake_token'
        })
      })
      
      if (response.status === 429) {
        blockedCount++
      }
      
      await sleep(100) // Pequeña pausa entre requests
    }
    
    if (blockedCount > 0) {
      log(`✅ PASS: Rate limiting activo (${blockedCount} requests bloqueados de ${attempts})`, 'green')
      return true
    } else {
      log('❌ FAIL: Rate limiting no está bloqueando', 'red')
      return false
    }
  } catch (error) {
    log(`❌ ERROR: ${error.message}`, 'red')
    return false
  }
}

// Ejecutar todos los tests
async function runAllTests() {
  log('\n🚀 Iniciando Tests del Sistema Anti-Spam', 'blue')
  log('=' .repeat(60), 'blue')
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  }
  
  const tests = [
    { name: 'Honeypot', fn: testHoneypot },
    { name: 'Missing reCAPTCHA', fn: testMissingRecaptcha },
    { name: 'Spam Content', fn: testSpamContent },
    { name: 'Disposable Email', fn: testDisposableEmail },
    { name: 'Rate Limiting', fn: testRateLimiting },
  ]
  
  for (const test of tests) {
    results.total++
    const passed = await test.fn()
    
    if (passed) {
      results.passed++
    } else {
      results.failed++
    }
    
    await sleep(1000) // Pausa entre tests
  }
  
  // Resumen
  log('\n' + '='.repeat(60), 'blue')
  log('📊 RESUMEN DE TESTS', 'blue')
  log('='.repeat(60), 'blue')
  log(`Total: ${results.total}`, 'cyan')
  log(`Pasados: ${results.passed}`, 'green')
  log(`Fallidos: ${results.failed}`, results.failed > 0 ? 'red' : 'green')
  
  const percentage = ((results.passed / results.total) * 100).toFixed(1)
  log(`\nÉxito: ${percentage}%`, percentage === '100.0' ? 'green' : 'yellow')
  
  if (results.failed === 0) {
    log('\n✨ ¡Todos los tests pasaron! El sistema anti-spam está funcionando correctamente.', 'green')
  } else {
    log('\n⚠️  Algunos tests fallaron. Revisa la configuración.', 'yellow')
  }
}

// Iniciar tests
runAllTests().catch(error => {
  log(`\n❌ Error fatal: ${error.message}`, 'red')
  console.error(error)
})
