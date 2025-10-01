"use client"

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useClientAuth } from "@/hooks/use-client-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { XCircle, AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react"
import Link from "next/link"

function FalloSuscripcionContent() {
  const { user, loading } = useClientAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const externalReference = searchParams.get('external_reference')
  const preapprovalId = searchParams.get('preapproval_id')
  const status = searchParams.get('status')

  useEffect(() => {
    if (!loading && !user) {
      const currentUrl = `/suscripcion/fallo?${searchParams.toString()}`
      router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`)
      return
    }
  }, [user, loading, router, searchParams])

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
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-800">
              Error en la Suscripción
            </CardTitle>
            <CardDescription className="text-red-700">
              No se pudo completar tu suscripción
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-white p-4 rounded-lg border border-red-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿Qué pasó?
              </h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  El pago no pudo ser procesado correctamente
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  Esto puede deberse a fondos insuficientes o problemas con la tarjeta
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  También puede ser un problema temporal del banco
                </li>
              </ul>
            </div>

            {externalReference && (
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-2">
                  Referencia del intento:
                </h4>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {externalReference}
                </code>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">
                ¿Qué puedes hacer?
              </h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Verificar que tu tarjeta tenga fondos suficientes</li>
                <li>• Asegurarte de que los datos de la tarjeta sean correctos</li>
                <li>• Intentar con otro método de pago</li>
                <li>• Contactar a tu banco si el problema persiste</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="flex-1">
                <Link href="/suscripcion">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Intentar de Nuevo
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="flex-1">
                <Link href="/perfil/suscripciones">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Ver Mis Suscripciones
                </Link>
              </Button>
            </div>

            <div className="text-center text-sm text-gray-500">
              <p>
                Si necesitas ayuda, puedes{" "}
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

export default function FalloSuscripcionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    }>
      <FalloSuscripcionContent />
    </Suspense>
  )
}