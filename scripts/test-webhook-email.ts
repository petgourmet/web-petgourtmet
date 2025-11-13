/**
 * Script para probar webhooks de Stripe localmente
 * 
 * Este script simula un evento checkout.session.completed 
 * para verificar que el flujo de envío de emails funciona
 * 
 * Uso:
 *   npx tsx scripts/test-webhook-email.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof COLORS = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`)
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60))
  log(title, 'bright')
  console.log('='.repeat(60) + '\n')
}

async function testWebhookEmail() {
  logSection('🧪 PRUEBA DE WEBHOOK Y ENVÍO DE EMAIL')
  
  // Verificar configuración
  const config = {
    apiUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    smtpHost: process.env.SMTP_HOST,
    smtpUser: process.env.SMTP_USER,
    emailFrom: process.env.EMAIL_FROM,
    hasSmtpPass: !!process.env.SMTP_PASS
  }

  log('Configuración:', 'cyan')
  log(`  API URL: ${config.apiUrl}`, 'cyan')
  log(`  SMTP Host: ${config.smtpHost || '❌ NO CONFIGURADO'}`, config.smtpHost ? 'green' : 'red')
  log(`  SMTP User: ${config.smtpUser || '❌ NO CONFIGURADO'}`, config.smtpUser ? 'green' : 'red')
  log(`  Email From: ${config.emailFrom || '❌ NO CONFIGURADO'}`, config.emailFrom ? 'green' : 'red')
  log(`  SMTP Pass: ${config.hasSmtpPass ? '✅ Configurado' : '❌ NO CONFIGURADO'}`, config.hasSmtpPass ? 'green' : 'red')

  if (!config.smtpHost || !config.smtpUser || !config.hasSmtpPass) {
    log('\n❌ ERROR: Configuración SMTP incompleta', 'red')
    process.exit(1)
  }

  logSection('📦 SIMULANDO ORDEN DE COMPRA')
  
  const testOrderData = {
    id: 99999,
    total: 1299.00,
    products: [
      {
        name: 'Alimento Premium para Perro 3kg',
        quantity: 1,
        price: 899.00
      },
      {
        name: 'Snacks Naturales para Gato',
        quantity: 2,
        price: 200.00
      }
    ],
    shipping_address: {
      line1: 'Calle Test 123',
      city: 'Ciudad de México',
      state: 'CDMX',
      postal_code: '01234',
      country: 'MX'
    }
  }

  log('Orden de prueba:', 'cyan')
  log(`  Order ID: ${testOrderData.id}`, 'cyan')
  log(`  Total: $${testOrderData.total}`, 'cyan')
  log(`  Productos: ${testOrderData.products.length}`, 'cyan')

  logSection('📧 PROBANDO ENVÍO DE EMAIL')
  
  const testEmail = 'cristoferscalante@gmail.com'
  log(`Destinatario: ${testEmail}`, 'cyan')

  try {
    // Importar dinámicamente el servicio de email
    const { sendOrderStatusEmail } = await import('../lib/email-service')
    
    log('Enviando email de prueba...', 'yellow')
    
    const result = await sendOrderStatusEmail('pending', testEmail, testOrderData, 3)
    
    if (result && result.success) {
      log('\n✅ EMAIL ENVIADO CORRECTAMENTE', 'green')
      log(`\nDetalles:`, 'cyan')
      log(`  Message ID: ${result.messageId}`, 'cyan')
      log(`  Intentos: ${result.attempts || 1}`, 'cyan')
      log(`  Destinatario: ${testEmail}`, 'cyan')
      log(`  Orden ID: ${testOrderData.id}`, 'cyan')
      
      logSection('✅ PRUEBA EXITOSA')
      log('El sistema de emails está funcionando correctamente', 'green')
      log(`Revisa la bandeja de ${testEmail}`, 'green')
      log('También revisa SPAM por si acaso', 'yellow')
      
    } else {
      log('\n❌ ERROR AL ENVIAR EMAIL', 'red')
      log(`Error: ${result?.error || 'Unknown error'}`, 'red')
      process.exit(1)
    }
    
  } catch (error: any) {
    log('\n❌ ERROR CRÍTICO', 'red')
    log(`\nTipo: ${error.name || 'Unknown'}`, 'red')
    log(`Mensaje: ${error.message || 'No message'}`, 'red')
    
    if (error.code) {
      log(`Código: ${error.code}`, 'red')
    }
    
    if (error.stack) {
      log(`\nStack trace:`, 'red')
      console.error(error.stack)
    }

    log('\n📋 POSIBLES CAUSAS:', 'yellow')
    
    if (error.code === 'EAUTH') {
      log('  • Credenciales SMTP incorrectas', 'yellow')
      log('  • Verifica SMTP_USER y SMTP_PASS en .env.local', 'yellow')
    } else if (error.code === 'ECONNREFUSED') {
      log('  • No se puede conectar al servidor SMTP', 'yellow')
      log('  • Verifica SMTP_HOST y SMTP_PORT', 'yellow')
    } else if (error.message.includes('email-service')) {
      log('  • Módulo email-service no se pudo cargar', 'yellow')
      log('  • Verifica que lib/email-service.ts exista', 'yellow')
    } else {
      log('  • Error desconocido en el proceso de envío', 'yellow')
      log('  • Revisa los logs arriba para más detalles', 'yellow')
    }
    
    process.exit(1)
  }
}

// Ejecutar prueba
testWebhookEmail().catch((error) => {
  log('\n❌ ERROR FATAL', 'red')
  console.error(error)
  process.exit(1)
})
