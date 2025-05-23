"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"

export default function SimulacionPagoPage() {
  const [loading, setLoading] = useState(true)
  const [orderRef, setOrderRef] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Recuperar información del pedido del localStorage
    const orderInfo = localStorage.getItem("lastOrderInfo")
    if (orderInfo) {
      const parsedInfo = JSON.parse(orderInfo)
      setOrderRef(parsedInfo.orderReference)
    }

    // Simular tiempo de procesamiento
    const timer = setTimeout(() => {
      setLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const handleSimulateSuccess = () => {
    // Redirigir a la página de agradecimiento con el orderRef
    router.push(`/gracias-por-tu-compra?order_ref=${orderRef}`)
  }

  const handleSimulateFailure = () => {
    router.push("/error-pago")
  }

  const handleSimulatePending = () => {
    router.push("/pago-pendiente")
  }

  return (
    <div className="container max-w-4xl py-12">
      <div className="bg-white rounded-3xl shadow-md p-8 text-center">
        <h1 className="text-2xl font-bold mb-6">Simulación de Pago</h1>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <p className="text-lg">Procesando tu pago...</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <p className="text-lg mb-4">
                Esta es una página de simulación para probar los diferentes resultados de pago.
              </p>
              <p className="text-sm text-gray-500 mb-8">Referencia de pedido: {orderRef || "No disponible"}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className="border rounded-xl p-4 flex flex-col items-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="font-semibold mb-2">Pago Exitoso</h3>
                  <p className="text-sm text-gray-500 mb-4">Simula un pago completado correctamente</p>
                  <Button onClick={handleSimulateSuccess} className="w-full bg-green-500 hover:bg-green-600">
                    Simular Éxito
                  </Button>
                </div>

                <div className="border rounded-xl p-4 flex flex-col items-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                  <h3 className="font-semibold mb-2">Pago Fallido</h3>
                  <p className="text-sm text-gray-500 mb-4">Simula un error en el proceso de pago</p>
                  <Button onClick={handleSimulateFailure} className="w-full bg-red-500 hover:bg-red-600">
                    Simular Error
                  </Button>
                </div>

                <div className="border rounded-xl p-4 flex flex-col items-center">
                  <Loader2 className="h-12 w-12 text-yellow-500 mb-4" />
                  <h3 className="font-semibold mb-2">Pago Pendiente</h3>
                  <p className="text-sm text-gray-500 mb-4">Simula un pago en proceso de verificación</p>
                  <Button onClick={handleSimulatePending} className="w-full bg-yellow-500 hover:bg-yellow-600">
                    Simular Pendiente
                  </Button>
                </div>
              </div>
            </div>

            <Button onClick={() => router.push("/")} variant="outline" className="mt-4">
              Volver a la tienda
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
