"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react"

/**
 * 🔧 PÁGINA MOCK DE CHECKOUT DE MERCADOPAGO
 * 
 * Esta página simula el flujo de checkout de MercadoPago cuando estamos en modo MOCK.
 * Permite probar el flujo completo de suscripción sin necesitar credenciales TEST.
 * 
 * USO: Solo para desarrollo cuando usas credenciales de producción desde otro país.
 * 
 * RECOMENDACIÓN: Obtén credenciales TEST- para testing real de MercadoPago.
 */
export default function MockCheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref')
  
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [loading, setLoading] = useState(false)

  const handleApprove = async () => {
    setLoading(true)
    
    // Simular delay de procesamiento
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setStatus('approved')
    setLoading(false)
    
    // Redirigir a la página de éxito después de 2 segundos
    setTimeout(() => {
      router.push('/suscripcion?status=success')
    }, 2000)
  }

  const handleReject = async () => {
    setLoading(true)
    
    // Simular delay de procesamiento
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setStatus('rejected')
    setLoading(false)
    
    // Redirigir a la página de error después de 2 segundos
    setTimeout(() => {
      router.push('/error-pago?reason=rejected')
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-2xl text-white">🔧</span>
          </div>
          <CardTitle className="text-2xl">Mock Checkout - MercadoPago</CardTitle>
          <CardDescription>
            Esta es una simulación del checkout de MercadoPago para desarrollo
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Información del Mock */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-900 mb-1">Modo de Desarrollo Activo</h4>
                <p className="text-sm text-yellow-800">
                  Estás viendo esta página porque tu aplicación detectó credenciales de producción 
                  en modo desarrollo. Para testing real, obtén credenciales TEST- desde el panel de MercadoPago.
                </p>
              </div>
            </div>
          </div>

          {/* Detalles de la suscripción */}
          {ref && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Detalles de la Suscripción</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">External Reference:</span>
                  <span className="font-mono text-xs">{ref}</span>
                </div>
              </div>
            </div>
          )}

          {/* Estado del pago */}
          {status === 'pending' && (
            <div className="space-y-4">
              <p className="text-center text-gray-600">
                Simula el resultado del pago seleccionando una opción:
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={handleApprove}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Aprobar Pago
                </Button>
                
                <Button
                  onClick={handleReject}
                  disabled={loading}
                  variant="destructive"
                  size="lg"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Rechazar Pago
                </Button>
              </div>

              {loading && (
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="text-sm text-gray-600 mt-2">Procesando...</p>
                </div>
              )}
            </div>
          )}

          {status === 'approved' && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-green-900">¡Pago Aprobado!</h3>
                <p className="text-gray-600 mt-1">Redirigiendo...</p>
              </div>
            </div>
          )}

          {status === 'rejected' && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-red-900">Pago Rechazado</h3>
                <p className="text-gray-600 mt-1">Redirigiendo...</p>
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2 text-sm">💡 Para Testing Real:</h4>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Ve a tu panel de MercadoPago México</li>
              <li>Busca "Credenciales de prueba" (TEST-)</li>
              <li>Actualiza tu archivo .env con esas credenciales</li>
              <li>Reinicia el servidor</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
