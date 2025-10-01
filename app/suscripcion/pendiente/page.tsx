"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useClientAuth } from "@/hooks/use-client-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, AlertCircle, ArrowLeft, RefreshCw } from "lucide-react"
import Link from "next/link"

function PendienteSuscripcionContent() {
  const { user, loading } = useClientAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isChecking, setIsChecking] = useState(false)

  const externalReference = searchParams.get('external_reference')
  const preapprovalId = searchParams.get('preapproval_id')

  useEffect(() => {
    if (!loading && !user) {
      const currentUrl = `/suscripcion/pendiente?${searchParams.toString()}`
      router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`)
      return
    }
  }, [user, loading, router, searchParams])

  const handleCheckStatus = async () => {
    if (!externalReference) return
    
    setIsChecking(true)
    try {
      // Verificar el estado de la suscripción
      const response = await fetch('/api/subscriptions/verify-return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          external_reference: externalReference,
          user_id: user?.id,
          status: 'pending'
        })
      })

      const result = await response.json()
      
      if (result.success && result.subscription?.status === 'active') {
        // Redirigir a página de éxito
        router.push(`/suscripcion/exito?external_reference=${externalReference}`)
      } else {
        // Mantener en pendiente
        console.log('Suscripción aún pendiente')
      }
    } catch (error) {
      console.error('Error verificando estado:', error)
    } finally {
      setIsChecking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl text-yellow-800">
              Suscripción Pendiente
            </CardTitle>
            <CardDescription className="text-yellow-700">
              Tu suscripción está siendo procesada
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-white p-4 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿Qué significa esto?
              </h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  Tu suscripción ha sido creada pero el pago aún no se ha completado
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  Esto puede deberse a que el banco está procesando la transacción
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  El proceso puede tomar unos minutos
                </li>
              </ul>
            </div>

            {externalReference && (
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-2">
                  Referencia de tu suscripción:
                </h4>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {externalReference}
                </code>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleCheckStatus}
                disabled={isChecking || !externalReference}
                className="flex-1"
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Verificar Estado
                  </>
                )}
              </Button>
              
              <Button variant="outline" asChild className="flex-1">
                <Link href="/suscripcion">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver a Suscripciones
                </Link>
              </Button>
            </div>

            <div className="text-center text-sm text-gray-500">
              <p>
                Si el problema persiste, puedes{" "}
                <Link href="/contacto" className="text-blue-600 hover:underline">
                  contactar soporte
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function PendienteSuscripcionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    }>
      <PendienteSuscripcionContent />
    </Suspense>
  )
}