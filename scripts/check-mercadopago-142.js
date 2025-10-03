/**
 * Script para consultar directamente la API de MercadoPago
 * para verificar el estado de la suscripción ID 142
 * External Reference: SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de
 * Usuario: cristoferscalante@gmail.com
 */

const https = require('https')

// Configuración
const EXTERNAL_REFERENCE = 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de'
const USER_EMAIL = 'cristoferscalante@gmail.com'
const USER_ID = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
const ACCESS_TOKEN = 'APP_USR-2271891404255560-093016-4e05cc1d735c0e291a75a9109319ddf7-2718057813' // Token de prueba

// Función para hacer peticiones HTTPS
function makeHttpsRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'PetGourmet/1.0'
      }
    }

    const req = https.request(options, (res) => {
      let responseData = ''

      res.on('data', (chunk) => {
        responseData += chunk
      })

      res.on('end', () => {
        try {
          const body = JSON.parse(responseData)
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          })
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: responseData
          })
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    if (data) {
      req.write(JSON.stringify(data))
    }

    req.end()
  })
}

async function checkMercadoPagoSubscription() {
  console.log('🔍 === CONSULTA DIRECTA A MERCADO PAGO ===')
  console.log(`📋 Suscripción ID: 142`)
  console.log(`📋 External Reference: ${EXTERNAL_REFERENCE}`)
  console.log(`📧 Email: ${USER_EMAIL}`)
  console.log(`👤 User ID: ${USER_ID}`)
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
          return { hasAuthorized: true, subscriptions: authorizedSubs }
        }
        
        return { hasAuthorized: false, subscriptions: subscriptions }
        
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
      const subscriptions = emailResponse.body.results
      console.log(`📋 Suscripciones del usuario: ${subscriptions.length}`)
      
      if (subscriptions.length > 0) {
        // Filtrar suscripciones relacionadas con nuestro external_reference
        const relatedSubs = subscriptions.filter(sub => 
          sub.external_reference && sub.external_reference.includes(USER_ID)
        )
        
        console.log(`📋 Suscripciones relacionadas: ${relatedSubs.length}`)
        
        relatedSubs.forEach((sub, index) => {
          console.log(`\n   ${index + 1}. Suscripción relacionada:`)
          console.log(`      ID: ${sub.id}`)
          console.log(`      Estado: ${sub.status}`)
          console.log(`      External Ref: ${sub.external_reference}`)
          console.log(`      Creada: ${sub.date_created}`)
          console.log(`      Monto: ${sub.transaction_amount} ${sub.currency_id}`)
          
          if (sub.external_reference === EXTERNAL_REFERENCE) {
            console.log(`      🎯 COINCIDE CON NUESTRA SUSCRIPCIÓN`)
            if (sub.status === 'authorized') {
              console.log(`      ✅ AUTORIZADA EN MERCADOPAGO`)
            }
          }
        })
      }
    }

    // 3. Buscar pagos relacionados
    console.log('\n🔍 3. BÚSQUEDA DE PAGOS RELACIONADOS')
    console.log('-' .repeat(50))
    
    const paymentsUrl = `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(EXTERNAL_REFERENCE)}`
    console.log(`🌐 URL: ${paymentsUrl}`)
    
    const paymentsResponse = await makeHttpsRequest(paymentsUrl)
    
    console.log(`📊 Status: ${paymentsResponse.status}`)
    
    if (paymentsResponse.status === 200 && paymentsResponse.body.results) {
      const payments = paymentsResponse.body.results
      console.log(`💳 Pagos encontrados: ${payments.length}`)
      
      if (payments.length > 0) {
        payments.forEach((payment, index) => {
          console.log(`\n   ${index + 1}. Pago:`)
          console.log(`      ID: ${payment.id}`)
          console.log(`      Estado: ${payment.status}`)
          console.log(`      Monto: ${payment.transaction_amount} ${payment.currency_id}`)
          console.log(`      Fecha: ${payment.date_created}`)
          console.log(`      External Ref: ${payment.external_reference}`)
          
          if (payment.status === 'approved') {
            console.log(`      ✅ PAGO APROBADO`)
          }
        })
      }
    }

    return { hasAuthorized: false, subscriptions: [] }

  } catch (error) {
    console.error('❌ Error en la consulta:', error.message)
    throw error
  }
}

// Ejecutar consulta
async function main() {
  try {
    console.log('🚀 INICIANDO CONSULTA A MERCADOPAGO PARA SUSCRIPCIÓN 142')
    console.log('📅 Fecha:', new Date().toLocaleString())
    console.log('=' .repeat(80))
    
    const result = await checkMercadoPagoSubscription()
    
    console.log('\n\n🎯 === CONCLUSIONES ===')
    console.log('=' .repeat(50))
    
    if (result.hasAuthorized) {
      console.log('✅ SUSCRIPCIÓN AUTORIZADA EN MERCADOPAGO')
      console.log('🚨 ACCIÓN REQUERIDA: Activar suscripción en base de datos')
      console.log('📋 Usar sistema de sincronización automática')
    } else {
      console.log('❌ SUSCRIPCIÓN NO AUTORIZADA O NO ENCONTRADA')
      console.log('📋 Verificar si el usuario completó el proceso de pago')
      console.log('📋 Considerar cancelar suscripción pendiente')
    }
    
    console.log('\n📊 RECOMENDACIONES:')
    console.log('1. Si está autorizada → Activar automáticamente')
    console.log('2. Si está pendiente → Verificar proceso de pago')
    console.log('3. Si no existe → Investigar creación fallida')
    console.log('4. Verificar webhooks perdidos o no procesados')
    
  } catch (error) {
    console.error('❌ Error en la consulta:', error.message)
    process.exit(1)
  }
}

main().then(() => {
  console.log('\n✅ Consulta completada')
  process.exit(0)
}).catch(error => {
  console.error('❌ Error ejecutando consulta:', error.message)
  process.exit(1)
})