"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MercadoPagoButton } from "@/components/mercadopago-button"

export default function TestMercadoPagoPage() {
  const [testResults, setTestResults] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [preferenceId, setPreferenceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    addResult(`🌍 Ambiente detectado: ${process.env.NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT || 'no configurado'}`)
  }, [])

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  // Test 1: Verificar configuración del SDK
  const testSDKConfig = async () => {
    setIsLoading(true)
    addResult('🧪 Verificando configuración del SDK...')

    try {
      const response = await fetch('/api/test-mercadopago-config')
      const data = await response.json()

      if (response.ok) {
        addResult('✅ Verificación completada')
        addResult(`🌍 Ambiente: ${data.environment}`)
        addResult(`🔑 Access Token: ${data.hasAccessToken ? 'Configurado' : 'Faltante'}`)
        addResult(`� Public Key: ${data.hasPublicKey ? 'Configurado' : 'Faltante'}`)
        addResult(`📝 Formato Access Token: ${data.accessTokenFormat ? 'Correcto' : 'Incorrecto'}`)
        addResult(`📝 Formato Public Key: ${data.publicKeyFormat ? 'Correcto' : 'Incorrecto'}`)
        
        if (data.recommendations && data.recommendations.length > 0) {
          addResult('📋 Recomendaciones:')
          data.recommendations.forEach((rec: string) => addResult(`   ${rec}`))
        }
      } else {
        addResult(`❌ Error en verificación: ${data.error}`)
      }
    } catch (error) {
      addResult(`❌ Error al verificar configuración: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Test 2: Crear preferencia de pago (versión simplificada)
  const createTestPreference = async () => {
    setIsLoading(true)
    setError(null)
    addResult('🧪 Creando preferencia de pago de prueba (versión simplificada)...')

    try {
      const response = await fetch("/api/mercadopago/test-preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseUrl: window.location.origin
        }),
      })

      const responseText = await response.text()
      addResult(`📡 Respuesta HTTP: ${response.status}`)
      
      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        addResult(`❌ Error parseando respuesta: ${responseText}`)
        throw new Error(`Invalid JSON response: ${responseText}`)
      }

      if (!response.ok) {
        addResult(`❌ Error HTTP ${response.status}: ${JSON.stringify(data, null, 2)}`)
        throw new Error(data.error || "Error al crear preferencia")
      }

      setPreferenceId(data.preferenceId)
      addResult(`✅ Preferencia creada exitosamente: ${data.preferenceId}`)
      addResult(`🔗 URL de pago: ${data.initPoint}`)
      if (data.sandboxInitPoint) {
        addResult(`🧪 URL sandbox: ${data.sandboxInitPoint}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      setError(errorMessage)
      addResult(`❌ Error al crear preferencia: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Test 2b: Crear preferencia con URLs válidas
  const createTestPreferenceWithValidUrls = async () => {
    setIsLoading(true)
    setError(null)
    addResult('🧪 Creando preferencia con URLs válidas externas...')

    try {
      const response = await fetch("/api/mercadopago/test-preference-full", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseUrl: window.location.origin
        }),
      })

      const responseText = await response.text()
      addResult(`📡 Respuesta HTTP: ${response.status}`)
      
      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        addResult(`❌ Error parseando respuesta: ${responseText}`)
        throw new Error(`Invalid JSON response: ${responseText}`)
      }

      if (!response.ok) {
        addResult(`❌ Error HTTP ${response.status}: ${JSON.stringify(data, null, 2)}`)
        throw new Error(data.error || "Error al crear preferencia")
      }

      setPreferenceId(data.preferenceId)
      addResult(`✅ Preferencia creada exitosamente: ${data.preferenceId}`)
      addResult(`🔗 URL de pago: ${data.initPoint}`)
      addResult(`✅ ${data.message}`)
      if (data.sandboxInitPoint) {
        addResult(`🧪 URL sandbox: ${data.sandboxInitPoint}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      setError(errorMessage)
      addResult(`❌ Error al crear preferencia: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Test 3: Simular webhook
  const testWebhook = async () => {
    setIsLoading(true)
    addResult('🧪 Simulando webhook de MercadoPago...')

    try {
      const response = await fetch('/api/mercadopago/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 'test-payment-123',
          live_mode: false,
          type: 'payment',
          date_created: new Date().toISOString(),
          application_id: 'test-app',
          user_id: 'test-user',
          version: 1,
          api_version: 'v1',
          action: 'payment.created',
          data: {
            id: 'test-payment-123'
          }
        })
      })

      if (response.ok) {
        addResult('✅ Webhook procesado correctamente')
      } else {
        addResult(`❌ Error al procesar webhook: ${response.statusText}`)
      }
    } catch (error) {
      addResult(`❌ Error en webhook: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  // Verificar parámetros de URL para resultados
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const result = urlParams.get('result')
    if (result) {
      switch (result) {
        case 'success':
          addResult('🎉 ¡Pago exitoso! El usuario completó el pago')
          break
        case 'failure':
          addResult('❌ Pago fallido. El usuario canceló o hubo un error')
          break
        case 'pending':
          addResult('⏳ Pago pendiente. Esperando confirmación')
          break
      }
    }
  }, [])

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">🧪 Pruebas de MercadoPago</h1>
        <p className="text-gray-600 mb-4">
          Esta página te permite probar la integración de MercadoPago desde localhost
        </p>
        
        {/* Indicador de ambiente */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-blue-600 font-semibold">🌍 Ambiente actual:</span>
            <span className="font-mono bg-blue-100 px-2 py-1 rounded text-sm">
              {process.env.NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT || 'no configurado'}
            </span>
          </div>
          <p className="text-sm text-blue-600 mt-2">
            {process.env.NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT === 'sandbox' 
              ? '✅ Perfecto para pruebas - usa tarjetas de prueba'
              : '⚠️ Cuidado: ambiente de producción - usa tarjetas reales'
            }
          </p>
        </div>
      </div>

      {/* Botones de prueba */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Button
          onClick={testSDKConfig}
          disabled={isLoading}
          className="p-6 h-auto flex flex-col items-center gap-2"
        >
          <span className="text-2xl">🔧</span>
          <span className="font-semibold">Verificar SDK</span>
        </Button>
        
        <Button
          onClick={createTestPreference}
          disabled={isLoading}
          className="p-6 h-auto flex flex-col items-center gap-2"
        >
          <span className="text-2xl">💳</span>
          <span className="font-semibold">Pago Simple</span>
        </Button>

        <Button
          onClick={createTestPreferenceWithValidUrls}
          disabled={isLoading}
          className="p-6 h-auto flex flex-col items-center gap-2"
        >
          <span className="text-2xl">🌐</span>
          <span className="font-semibold">Pago URLs Válidas</span>
        </Button>
        
        <Button
          onClick={testWebhook}
          disabled={isLoading}
          className="p-6 h-auto flex flex-col items-center gap-2"
        >
          <span className="text-2xl">🔔</span>
          <span className="font-semibold">Probar Webhook</span>
        </Button>
      </div>

      {/* Explicación de botones */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
        <h3 className="font-semibold mb-2">💡 Explicación de Pruebas</h3>
        <div className="text-sm space-y-1">
          <p><strong>🔧 Verificar SDK:</strong> Valida configuración de credenciales</p>
          <p><strong>💳 Pago Simple:</strong> Crea preferencia sin URLs de retorno</p>
          <p><strong>🌐 Pago URLs Válidas:</strong> Crea preferencia con URLs externas válidas</p>
          <p><strong>🔔 Probar Webhook:</strong> Simula notificación de pago</p>
        </div>
      </div>

      {/* Botón de MercadoPago si hay preferencia */}
      {preferenceId && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>💳 Producto de Prueba</CardTitle>
            <CardDescription>Usa el botón de abajo para ir al checkout de MercadoPago</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">
                🐕
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Alimento Premium para Perro - Prueba</h3>
                <p className="text-gray-600">Producto de prueba para verificar MercadoPago</p>
                <p className="text-2xl font-bold text-green-600">$100 MXN</p>
              </div>
              <div>
                <MercadoPagoButton
                  preferenceId={preferenceId}
                  onSuccess={() => {
                    addResult('🎉 ¡Pago exitoso desde el botón!')
                  }}
                  onError={(error) => {
                    addResult(`❌ Error en el pago: ${error.message}`)
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tarjetas de prueba */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>💳 Tarjetas de Prueba (Sandbox)</CardTitle>
          <CardDescription>Usa estas tarjetas solo en ambiente sandbox</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-green-600">✅ Pago Aprobado</h3>
              <p className="font-mono text-sm">4170 0688 1010 8020</p>
              <p className="text-sm text-gray-600">CVV: 123 | Venc: 12/25</p>
            </div>
            <div>
              <h3 className="font-semibold text-red-600">❌ Pago Rechazado</h3>
              <p className="font-mono text-sm">4013 5406 8274 6260</p>
              <p className="text-sm text-gray-600">CVV: 123 | Venc: 12/25</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>📊 Resultados de Pruebas</CardTitle>
            <Button onClick={clearResults} variant="outline" size="sm">
              🗑️ Limpiar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500">No hay resultados aún. Ejecuta una prueba arriba.</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Indicadores de estado */}
      {isLoading && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg">
          ⏳ Ejecutando prueba...
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 left-4 bg-red-500 text-white px-4 py-2 rounded-lg max-w-md">
          ❌ {error}
        </div>
      )}
    </div>
  )
}
