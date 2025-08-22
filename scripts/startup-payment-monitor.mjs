import fetch from 'node-fetch'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '..', '.env.local') })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function startPaymentMonitor() {
  console.log('🚀 Iniciando monitor de pagos automático...')
  
  try {
    // Esperar un poco para que el servidor esté listo
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Verificar estado del monitor
    const statusResponse = await fetch(`${APP_URL}/api/auto-payment-monitor`)
    
    if (statusResponse.ok) {
      const status = await statusResponse.json()
      
      if (status.status === 'stopped') {
        console.log('📋 Monitor detenido, iniciando...')
        
        // Iniciar el monitor
        const startResponse = await fetch(`${APP_URL}/api/auto-payment-monitor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'start' })
        })
        
        if (startResponse.ok) {
          const result = await startResponse.json()
          console.log('✅ Monitor iniciado exitosamente:', result.message)
        } else {
          console.error('❌ Error iniciando monitor:', startResponse.status)
        }
      } else {
        console.log('✅ Monitor ya está activo')
      }
    } else {
      console.error('❌ No se pudo verificar estado del monitor:', statusResponse.status)
    }
    
    // Ejecutar validación inicial
    console.log('🔄 Ejecutando validación inicial de pagos...')
    
    const validationResponse = await fetch(`${APP_URL}/api/cron/auto-validate-payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (validationResponse.ok) {
      const result = await validationResponse.json()
      console.log('✅ Validación inicial completada:', {
        orders_updated: result.results?.orders_updated || 0,
        subscriptions_updated: result.results?.subscriptions_updated || 0
      })
    } else {
      console.error('❌ Error en validación inicial:', validationResponse.status)
    }
    
  } catch (error) {
    console.error('❌ Error configurando monitor de pagos:', error.message)
  }
}

// Ejecutar el script
startPaymentMonitor()
  .then(() => {
    console.log('🎉 Configuración de monitor completada')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  })