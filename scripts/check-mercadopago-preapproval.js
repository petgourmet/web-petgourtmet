/**
 * Script para consultar directamente la API de MercadoPago
 * para verificar el estado del preapproval_id: 271804c66ace41499fe81348f35e184b
 * Suscripción ID: 135
 */

const https = require('https')

// Configuración
const PREAPPROVAL_ID = '271804c66ace41499fe81348f35e184b'
const ACCESS_TOKEN = 'APP_USR-2271891404255560-093016-4e05cc1d735c0e291a75a9109319ddf7-2718057813' // Token de prueba

async function checkMercadoPagoPreapproval() {
  console.log('🔍 Consultando estado del preapproval en MercadoPago...')
  console.log(`📋 Preapproval ID: ${PREAPPROVAL_ID}`)
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.mercadopago.com',
      port: 443,
      path: `/preapproval/${PREAPPROVAL_ID}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'PetGourmet/1.0'
      }
    }

    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        console.log(`📊 Status Code: ${res.statusCode}`)
        console.log(`📋 Headers:`, res.headers)
        
        try {
          const response = JSON.parse(data)
          console.log('\n📄 Respuesta de MercadoPago:')
          console.log(JSON.stringify(response, null, 2))
          
          if (res.statusCode === 200) {
            console.log('\n✅ INFORMACIÓN DEL PREAPPROVAL:')
            console.log(`   ID: ${response.id}`)
            console.log(`   Estado: ${response.status}`)
            console.log(`   Razón: ${response.reason || 'N/A'}`)
            console.log(`   Email del pagador: ${response.payer_email}`)
            console.log(`   External Reference: ${response.external_reference || 'N/A'}`)
            console.log(`   Fecha de creación: ${response.date_created}`)
            console.log(`   Última actualización: ${response.last_modified}`)
            console.log(`   Próximo pago: ${response.next_payment_date || 'N/A'}`)
            
            if (response.auto_recurring) {
              console.log('\n💰 INFORMACIÓN DE FACTURACIÓN:')
              console.log(`   Monto: ${response.auto_recurring.transaction_amount} ${response.auto_recurring.currency_id}`)
              console.log(`   Frecuencia: ${response.auto_recurring.frequency} ${response.auto_recurring.frequency_type}`)
            }
            
            // Análisis del estado
            console.log('\n🎯 ANÁLISIS:')
            if (response.status === 'authorized') {
              console.log('   ✅ El preapproval está AUTORIZADO')
              console.log('   ✅ La suscripción debería estar activa')
              console.log('   ❌ PROBLEMA: La suscripción local sigue en "pending"')
            } else if (response.status === 'pending') {
              console.log('   ⏳ El preapproval está PENDIENTE de autorización')
              console.log('   ℹ️ El usuario aún no ha completado el proceso')
            } else if (response.status === 'cancelled') {
              console.log('   ❌ El preapproval fue CANCELADO')
            } else {
              console.log(`   ❓ Estado desconocido: ${response.status}`)
            }
            
          } else {
            console.log('\n❌ ERROR EN LA CONSULTA:')
            console.log(`   Código: ${res.statusCode}`)
            console.log(`   Mensaje: ${response.message || 'Error desconocido'}`)
            
            if (res.statusCode === 404) {
              console.log('   ℹ️ El preapproval_id no existe o no es válido')
            } else if (res.statusCode === 401) {
              console.log('   ℹ️ Token de acceso inválido o expirado')
            }
          }
          
          resolve(response)
        } catch (error) {
          console.log('\n❌ Error parseando respuesta JSON:')
          console.log(data)
          reject(error)
        }
      })
    })

    req.on('error', (error) => {
      console.error('❌ Error en la petición:', error.message)
      reject(error)
    })

    req.setTimeout(10000, () => {
      console.error('❌ Timeout en la petición')
      req.destroy()
      reject(new Error('Timeout'))
    })

    req.end()
  })
}

// Función adicional para consultar pagos relacionados
async function checkRelatedPayments() {
  console.log('\n\n🔍 Consultando pagos relacionados...')
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.mercadopago.com',
      port: 443,
      path: `/v1/payments/search?external_reference=SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-bea44606`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'PetGourmet/1.0'
      }
    }

    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        console.log(`📊 Status Code: ${res.statusCode}`)
        
        try {
          const response = JSON.parse(data)
          console.log('\n📄 Pagos encontrados:')
          
          if (response.results && response.results.length > 0) {
            response.results.forEach((payment, index) => {
              console.log(`\n   ${index + 1}. Pago ID: ${payment.id}`)
              console.log(`      Estado: ${payment.status}`)
              console.log(`      Monto: ${payment.transaction_amount} ${payment.currency_id}`)
              console.log(`      Fecha: ${payment.date_created}`)
              console.log(`      External Reference: ${payment.external_reference}`)
            })
          } else {
            console.log('   ℹ️ No se encontraron pagos para esta external_reference')
          }
          
          resolve(response)
        } catch (error) {
          console.log('\n❌ Error parseando respuesta de pagos:')
          console.log(data)
          reject(error)
        }
      })
    })

    req.on('error', (error) => {
      console.error('❌ Error consultando pagos:', error.message)
      reject(error)
    })

    req.setTimeout(10000, () => {
      console.error('❌ Timeout consultando pagos')
      req.destroy()
      reject(new Error('Timeout'))
    })

    req.end()
  })
}

// Ejecutar consultas
async function main() {
  try {
    await checkMercadoPagoPreapproval()
    await checkRelatedPayments()
    
    console.log('\n\n🎯 === CONCLUSIONES ===')
    console.log('1. Si el preapproval está "authorized", la suscripción debería activarse')
    console.log('2. Si está "pending", el usuario no ha completado el proceso')
    console.log('3. Verificar si hay webhooks perdidos o no procesados')
    console.log('4. Considerar activación manual si MercadoPago confirma autorización')
    
  } catch (error) {
    console.error('❌ Error en la consulta:', error.message)
  }
}

main().then(() => {
  console.log('\n✅ Consulta completada')
  process.exit(0)
}).catch(error => {
  console.error('❌ Error ejecutando consulta:', error.message)
  process.exit(1)
})