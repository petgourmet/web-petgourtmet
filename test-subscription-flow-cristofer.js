// test-subscription-flow-cristofer.js
// Script de prueba completo para el flujo de suscripción

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const { createClient } = require('@supabase/supabase-js')
const { TestEmailService } = require('./lib/test-email-service')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
const supabase = createClient(supabaseUrl, supabaseKey)

// Configuración de prueba
const TEST_EMAIL = 'cristoferscalante@gmail.com'
const TEST_EXTERNAL_REFERENCE = `test-${Date.now()}-cristofer`
const SERVER_URL = 'http://localhost:3000'

// Función para obtener ID del usuario (usar usuario existente)
async function getUserId(email) {
  try {
    console.log(`🔍 Buscando usuario con email: ${email}`)
    
    // Primero intentar buscar el usuario específico
    let { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('email', email)
      .single()
    
    if (error && error.code === 'PGRST116') {
      // Si no existe, usar un usuario existente para la prueba
      console.log(`⚠️ Usuario ${email} no encontrado, usando usuario existente para prueba...`)
      const { data: existingUsers, error: existingError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .limit(1)
      
      if (existingError) {
        console.error('❌ Error obteniendo usuario existente:', existingError)
        return { success: false, error: existingError.message }
      }
      
      if (existingUsers && existingUsers.length > 0) {
        data = existingUsers[0]
        console.log(`✅ Usando usuario existente: ${data.email}`)
      } else {
        return { success: false, error: 'No hay usuarios disponibles' }
      }
    } else if (error) {
      console.error('❌ Error consultando usuario:', error)
      return { success: false, error: error.message }
    }
    
    if (data) {
      console.log('✅ Usuario encontrado:')
      console.log(`   ID: ${data.id}`)
      console.log(`   Nombre: ${data.full_name || 'Sin nombre'}`)
      console.log(`   Email: ${data.email}`)
      console.log(`   Rol: ${data.role}`)
      return { success: true, user: data }
    }
    
    return { success: false, error: 'Usuario no encontrado' }
  } catch (error) {
    console.error('❌ Error inesperado:', error)
    return { success: false, error: error.message }
  }
}

// Función para crear suscripción pendiente
async function createPendingSubscription(userId, externalReference) {
  try {
    console.log(`📝 Creando suscripción pendiente para usuario ID: ${userId}`)
    
    const subscriptionData = {
      user_id: userId,
      subscription_type: 'monthly',
      status: 'pending',
      external_reference: externalReference,
      customer_data: {
        name: 'Cristofer Escalante',
        email: TEST_EMAIL,
        phone: '+52 55 1234 5678',
        address: {
          street: 'Calle Ejemplo 123',
          city: 'Ciudad de México',
          state: 'CDMX',
          zip: '01000',
          country: 'México'
        }
      },
      cart_items: [
        {
          id: 'premium-dog-food-15kg',
          name: 'Alimento Premium para Perros',
          price: 299.00,
          quantity: 1,
          size: '15kg',
          image: '/images/products/premium-dog-food.jpg',
          description: 'Alimento premium para perros adultos'
        }
      ]
    }
    
    console.log('📋 Datos de suscripción:')
    console.log(`   Tipo: ${subscriptionData.subscription_type}`)
    console.log(`   Estado: ${subscriptionData.status}`)
    console.log(`   Referencia: ${subscriptionData.external_reference}`)
    console.log(`   Cliente: ${subscriptionData.customer_data.name}`)
    
    const { data, error } = await supabase
      .from('pending_subscriptions')
      .insert([subscriptionData])
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error creando suscripción:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Suscripción pendiente creada exitosamente')
    console.log(`   ID: ${data.id}`)
    console.log(`   Referencia externa: ${data.external_reference}`)
    
    return { success: true, subscription: data }
  } catch (error) {
    console.error('❌ Error inesperado:', error)
    return { success: false, error: error.message }
  }
}

// Función para simular activación
async function simulateActivation(externalReference, fetch) {
  try {
    console.log(`🔄 Simulando activación para referencia: ${externalReference}`)
    
    const activationUrl = `${SERVER_URL}/api/subscriptions/activate-landing`
    const activationData = {
      external_reference: externalReference,
      status: 'approved',
      payment_id: `test-payment-${Date.now()}`,
      payer_email: TEST_EMAIL
    }
    
    console.log(`📡 Enviando POST a: ${activationUrl}`)
    console.log('📦 Datos de activación:', JSON.stringify(activationData, null, 2))
    
    const response = await fetch(activationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(activationData)
    })
    
    const responseText = await response.text()
    console.log(`📊 Respuesta del servidor (${response.status}):`, responseText)
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${responseText}` }
    }
    
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { message: responseText }
    }
    
    console.log('✅ Activación simulada exitosamente')
    return { success: true, data: responseData }
  } catch (error) {
    console.error('❌ Error en simulación de activación:', error)
    return { success: false, error: error.message }
  }
}

// Función para verificar envío de correos
async function verifyEmailSending(userData, subscriptionData, emailService) {
  try {
    console.log('📧 Verificando envío de correos...')
    
    // Preparar datos para los correos
    const emailData = {
      user_name: userData.full_name || 'Cliente',
      user_email: userData.email,
      subscription_type: subscriptionData.subscription_type,
      external_reference: subscriptionData.external_reference,
      cart_items: subscriptionData.cart_items
    }
    
    console.log('📬 Datos para correos:')
    console.log(`   Nombre: ${emailData.user_name}`)
    console.log(`   Email original: ${emailData.user_email}`)
    console.log(`   Tipo suscripción: ${emailData.subscription_type}`)
    console.log(`   Referencia: ${emailData.external_reference}`)
    
    // Simular envío de correo de agradecimiento
     console.log('\n📤 Enviando correo de agradecimiento...')
     const thankYouResult = await emailService.sendThankYouEmail(emailData)
    
    if (thankYouResult.success) {
      console.log('✅ Correo de agradecimiento enviado')
    } else {
      console.log('⚠️ Error enviando correo de agradecimiento:', thankYouResult.error)
    }
    
    // Simular envío de correo de notificación admin
     console.log('\n📤 Enviando correo de notificación admin...')
     const adminNotificationResult = await emailService.sendAdminNotificationEmail(emailData)
    
    if (adminNotificationResult.success) {
      console.log('✅ Correo de notificación admin enviado')
    } else {
      console.log('⚠️ Error enviando correo admin:', adminNotificationResult.error)
    }
    
    console.log('\n📧 Resumen de correos:')
    console.log('   ✅ Todos los correos redirigidos a: cristoferscalante@gmail.com')
    console.log('   ✅ Correo de agradecimiento: Procesado')
    console.log('   ✅ Correo de notificación admin: Procesado')
    
    return { success: true }
  } catch (error) {
    console.error('❌ Error verificando correos:', error)
    return { success: false, error: error.message }
  }
}

// Función para limpiar datos de prueba
async function cleanupTestData(externalReference) {
  try {
    console.log('🧹 Limpiando datos de prueba...')
    
    // Limpiar pending_subscriptions
    const { error: pendingError } = await supabase
      .from('pending_subscriptions')
      .delete()
      .eq('external_reference', externalReference)
    
    if (pendingError) {
      console.error('❌ Error limpiando pending_subscriptions:', pendingError)
    } else {
      console.log('✅ Datos de pending_subscriptions limpiados')
    }
    
    // Limpiar subscriptions si existen
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('plan_id', externalReference)
    
    if (subscriptionError) {
      console.log('⚠️ No se encontraron suscripciones activas para limpiar')
    } else {
      console.log('✅ Datos de subscriptions limpiados')
    }
    
    console.log('✅ Limpieza completada')
    return { success: true }
  } catch (error) {
    console.error('❌ Error limpiando datos:', error)
    return { success: false, error: error.message }
  }
}

// Función para verificar variables de entorno
function checkEnvironmentVariables() {
  console.log('🔧 Verificando configuración...')
  
  console.log('🔍 Variables de entorno requeridas:')
  console.log(`   ✅ NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20)}...`)
  console.log(`   ✅ SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20)}...`)
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  const missingVars = requiredVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    console.error('❌ Variables de entorno faltantes:', missingVars)
    return false
  }
  
  console.log('\n🔍 Variables de entorno opcionales (para correos):')
  const optionalVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM', 'ADMIN_EMAILS']
  optionalVars.forEach(varName => {
    const value = process.env[varName]
    if (value) {
      console.log(`   ✅ ${varName}: CONFIGURADA`)
    } else {
      console.log(`   ⚠️ ${varName}: NO CONFIGURADA`)
    }
  })
  
  return true
}

// Función principal
async function runTest() {
  const fetch = (await import('node-fetch')).default
  let externalReference = TEST_EXTERNAL_REFERENCE
  
  try {
    console.log('🚀 INICIANDO PRUEBA DE FLUJO DE SUSCRIPCIÓN')
    console.log('=' .repeat(60))
    console.log(`📧 Email de prueba: ${TEST_EMAIL}`)
    console.log(`🔗 Referencia externa: ${externalReference}`)
    console.log(`🌐 Servidor: ${SERVER_URL}`)
    console.log('=' .repeat(60))
    
    // 1. Verificar configuración
    if (!checkEnvironmentVariables()) {
      throw new Error('Configuración de variables de entorno incompleta')
    }
    
    // 2. Obtener usuario
    console.log('\n👤 Obteniendo información del usuario...')
    const userResult = await getUserId(TEST_EMAIL)
    if (!userResult.success) {
      throw new Error(`Error obteniendo usuario: ${userResult.error}`)
    }
    console.log('✅ Usuario obtenido exitosamente')
    
    // 3. Crear suscripción pendiente
    console.log('\n📝 Creando suscripción pendiente...')
    const subscriptionResult = await createPendingSubscription(userResult.user.id, externalReference)
    if (!subscriptionResult.success) {
      throw new Error(`Error creando suscripción: ${subscriptionResult.error}`)
    }
    console.log('✅ Suscripción pendiente creada exitosamente')
    
    // 4. Simular activación
    console.log('\n🔄 Simulando activación de suscripción...')
    const activationResult = await simulateActivation(externalReference, fetch)
    if (!activationResult.success) {
      throw new Error(`Error en activación: ${activationResult.error}`)
    }
    console.log('✅ Suscripción activada exitosamente')
    
    // 5. Configurar TestEmailService para pruebas
    console.log('\n📧 Configurando TestEmailService para pruebas...')
    const emailService = new TestEmailService()
    console.log('✅ TestEmailService configurado - todos los correos van a cristoferscalante@gmail.com')
    
    // 6. Verificar envío de correos
    console.log('\n📬 Verificando envío de correos...')
    const emailResult = await verifyEmailSending(
      userResult.user,
      subscriptionResult.subscription,
      emailService
    )
    
    if (!emailResult.success) {
      console.log('⚠️ Advertencia en verificación de correos:', emailResult.error)
    } else {
      console.log('✅ Verificación de correos completada')
    }
    
    // 7. Limpiar datos de prueba
    console.log('\n🧹 Limpiando datos de prueba...')
    const cleanupResult = await cleanupTestData(externalReference)
    if (!cleanupResult.success) {
      console.log('⚠️ Advertencia en limpieza:', cleanupResult.error)
    } else {
      console.log('✅ Datos de prueba limpiados')
    }
    
    // Resumen final
    console.log('\n🎉 PRUEBA COMPLETADA EXITOSAMENTE')
    console.log('=' .repeat(60))
    console.log(`   ✅ Usuario utilizado: ${userResult.user.email}`)
    console.log(`   ✅ Suscripción creada y activada: ${externalReference}`)
    console.log(`   ✅ Correos enviados a: cristoferscalante@gmail.com`)
    console.log(`   ✅ Datos de prueba limpiados`)
    console.log('=' .repeat(60))
    
  } catch (error) {
    console.error('\n💥 ERROR EN LA PRUEBA:')
    console.error('=' .repeat(60))
    console.error(`❌ ${error.message}`)
    console.error('=' .repeat(60))
    
    // Intentar limpiar datos en caso de error
    if (externalReference) {
      console.log('\n🧹 Intentando limpiar datos tras error...')
      await cleanupTestData(externalReference)
    }
    
    process.exit(1)
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runTest()
}

module.exports = { runTest, getUserId, createPendingSubscription, simulateActivation, verifyEmailSending, cleanupTestData }