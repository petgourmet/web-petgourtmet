const https = require('https')
const { URL } = require('url')

// Configuración
const SUBSCRIPTION_ID = 134
const EXTERNAL_REFERENCE = 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de'
const USER_EMAIL = 'cristoferscalante@gmail.com'

// Función para hacer requests HTTPS
function makeHttpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    }

    const req = https.request(requestOptions, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonData
          })
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          })
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    if (options.body) {
      req.write(JSON.stringify(options.body))
    }

    req.end()
  })
}

async function checkMercadoPagoSubscription() {
  console.log('🔍 === CONSULTA DIRECTA A MERCADO PAGO ===')
  console.log(`📋 External Reference: ${EXTERNAL_REFERENCE}`)
  console.log(`📧 Email: ${USER_EMAIL}`)
  console.log('=' .repeat(60))

  try {
    // 1. Buscar suscripciones por external_reference
    console.log('\n🔍 1. BÚSQUEDA POR EXTERNAL REFERENCE')
    console.log('-' .repeat(50))
    
    const searchUrl = `https://api.mercadopago.com/preapproval/search?external_reference=${encodeURIComponent(EXTERNAL_REFERENCE)}`
    console.log(`🌐 URL: ${searchUrl}`)
    
    const searchResponse = await makeHttpsRequest(searchUrl)
    
    console.log(`📊 Status: ${searchResponse.status}`)
    
    if (searchResponse.status === 200 && searchResponse.body.results) {
      const subscriptions = searchResponse.body.results
      console.log(`📋 Suscripciones encontradas: ${subscriptions.length}`)
      
      if (subscriptions.length > 0) {
        subscriptions.forEach((sub, index) => {
          console.log(`\n   ${index + 1}. Suscripción MP:`)
          console.log(`      ID: ${sub.id}`)
          console.log(`      Estado: ${sub.status}`)
          console.log(`      External Ref: ${sub.external_reference}`)
          console.log(`      Email: ${sub.payer_email}`)
          console.log(`      Creada: ${sub.date_created}`)
          console.log(`      Actualizada: ${sub.last_modified}`)
          console.log(`      Razón: ${sub.reason}`)
          console.log(`      Monto: ${sub.transaction_amount} ${sub.currency_id}`)
          
          if (sub.status === 'authorized') {
            console.log(`      ✅ SUSCRIPCIÓN AUTORIZADA EN MERCADOPAGO`)
          } else if (sub.status === 'pending') {
            console.log(`      ⏳ Suscripción pendiente en MercadoPago`)
          } else {
            console.log(`      ❌ Estado: ${sub.status}`)
          }
        })
        
        // Verificar si hay suscripciones autorizadas
        const authorizedSubs = subscriptions.filter(sub => sub.status === 'authorized')
        if (authorizedSubs.length > 0) {
          console.log(`\n✅ ENCONTRADAS ${authorizedSubs.length} SUSCRIPCIONES AUTORIZADAS`)
          console.log('🚨 LA SUSCRIPCIÓN DEBERÍA ESTAR ACTIVA EN LA BD')
        }
        
      } else {
        console.log('❌ No se encontraron suscripciones con este external_reference')
      }
    } else {
      console.log(`❌ Error en la búsqueda: ${searchResponse.status}`)
      console.log(`📄 Respuesta: ${JSON.stringify(searchResponse.body, null, 2)}`)
    }

    // 2. Buscar por email del pagador
    console.log('\n🔍 2. BÚSQUEDA POR EMAIL DEL PAGADOR')
    console.log('-' .repeat(50))
    
    const emailSearchUrl = `https://api.mercadopago.com/preapproval/search?payer_email=${encodeURIComponent(USER_EMAIL)}`
    console.log(`🌐 URL: ${emailSearchUrl}`)
    
    const emailResponse = await makeHttpsRequest(emailSearchUrl)
    
    console.log(`📊 Status: ${emailResponse.status}`)
    
    if (emailResponse.status === 200 && emailResponse.body.results) {
      const emailSubs = emailResponse.body.results
      console.log(`📋 Suscripciones por email: ${emailSubs.length}`)
      
      if (emailSubs.length > 0) {
        // Filtrar suscripciones recientes (últimas 48 horas)
        const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
        const recentSubs = emailSubs.filter(sub => {
          const created = new Date(sub.date_created)
          return created >= twoDaysAgo
        })
        
        console.log(`📅 Suscripciones recientes (48h): ${recentSubs.length}`)
        
        recentSubs.forEach((sub, index) => {
          console.log(`\n   ${index + 1}. Suscripción reciente:`)
          console.log(`      ID: ${sub.id}`)
          console.log(`      Estado: ${sub.status}`)
          console.log(`      External Ref: ${sub.external_reference}`)
          console.log(`      Creada: ${sub.date_created}`)
          console.log(`      Razón: ${sub.reason}`)
          
          // Verificar si coincide con nuestra suscripción
          if (sub.external_reference === EXTERNAL_REFERENCE) {
            console.log(`      🎯 COINCIDE CON SUSCRIPCIÓN 134`)
          }
        })
      }
    } else {
      console.log(`❌ Error buscando por email: ${emailResponse.status}`)
    }

    // 3. Resumen y diagnóstico
    console.log('\n🔍 3. DIAGNÓSTICO FINAL')
    console.log('-' .repeat(50))
    
    if (searchResponse.status === 200 && searchResponse.body.results) {
      const subs = searchResponse.body.results
      const authorizedSubs = subs.filter(sub => sub.status === 'authorized')
      
      if (authorizedSubs.length > 0) {
        console.log('🚨 PROBLEMA IDENTIFICADO:')
        console.log('   ✅ Suscripción AUTORIZADA en MercadoPago')
        console.log('   ❌ Suscripción PENDIENTE en base de datos local')
        console.log('   🔧 SOLUCIÓN: Activar suscripción en BD basándose en estado MP')
        
        const mpSub = authorizedSubs[0]
        console.log('\n💡 DATOS PARA ACTUALIZACIÓN:')
        console.log(`   MP Subscription ID: ${mpSub.id}`)
        console.log(`   Estado MP: ${mpSub.status}`)
        console.log(`   Fecha autorización: ${mpSub.last_modified}`)
        
      } else if (subs.length > 0) {
        const sub = subs[0]
        console.log('⚠️ ESTADO CONSISTENTE:')
        console.log(`   📊 Estado MP: ${sub.status}`)
        console.log('   📊 Estado BD: pending')
        console.log('   ✅ Ambos estados coinciden (pending)')
        
      } else {
        console.log('❌ PROBLEMA GRAVE:')
        console.log('   ❌ No existe suscripción en MercadoPago')
        console.log('   ✅ Existe suscripción en BD (pending)')
        console.log('   🔧 SOLUCIÓN: Crear suscripción en MercadoPago o eliminar de BD')
      }
    } else {
      console.log('❌ No se pudo consultar MercadoPago API')
    }

  } catch (error) {
    console.log('❌ Error durante la consulta:', error.message)
    console.log(error)
  }
}

// Verificar variables de entorno
if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  console.log('❌ MERCADOPAGO_ACCESS_TOKEN no configurado')
  process.exit(1)
}

// Ejecutar
checkMercadoPagoSubscription()
  .then(() => {
    console.log('\n✅ Consulta completada')
  })
  .catch(error => {
    console.log('❌ Error:', error.message)
    process.exit(1)
  })