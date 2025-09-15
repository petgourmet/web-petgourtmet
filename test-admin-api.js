// Test script para verificar la API de admin subscriptions
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

async function testAdminAPI() {
  const fetch = (await import('node-fetch')).default
  try {
    console.log('🔍 Probando API /api/admin/subscriptions...')
    
    const response = await fetch('http://localhost:3000/api/admin/subscriptions', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📊 Status:', response.status)
    console.log('📊 Status Text:', response.statusText)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error response:', errorText)
      return
    }
    
    const data = await response.json()
    console.log('✅ Response success:', data.success)
    console.log('📊 Data count:', data.count)
    console.log('📊 First 3 subscriptions:')
    
    if (data.data && data.data.length > 0) {
      data.data.slice(0, 3).forEach((sub, index) => {
        console.log(`  ${index + 1}. ID: ${sub.id}, User: ${sub.user_id}, Status: ${sub.status}, Product: ${sub.product_id}`)
        if (sub.user_profile) {
          console.log(`     Profile: ${sub.user_profile.full_name} (${sub.user_profile.email})`)
        }
      })
    } else {
      console.log('❌ No hay datos en la respuesta')
    }
    
  } catch (error) {
    console.error('💥 Error al probar API:', error.message)
  }
}

testAdminAPI()