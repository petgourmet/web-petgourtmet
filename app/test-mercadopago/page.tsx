"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MercadoPagoButton } from "@/components/mercadopago-button"

export default function TestMercadoPagoPage() {
  const [preferenceId, setPreferenceId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createTestPreference = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              id: "test-item-1",
              title: "Producto de prueba",
              description: "Producto de prueba para verificar MercadoPago",
              picture_url: "https://via.placeholder.com/150",
              quantity: 1,
              unit_price: 100,
            },
          ],
          customerData: {
            firstName: "Juan",
            lastName: "Pérez",
            email: "test@test.com",
            phone: "1234567890",
            address: {
              street_name: "Calle de prueba",
              street_number: "123",
              zip_code: "12345",
              city: "Ciudad de México",
              state: "CDMX",
              country: "México",
            },
          },
          externalReference: `test-${Date.now()}`,
          backUrls: {
            success: `${window.location.origin}/test-success`,
            failure: `${window.location.origin}/test-failure`,
            pending: `${window.location.origin}/test-pending`,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al crear preferencia")
      }

      const data = await response.json()
      setPreferenceId(data.preferenceId)
    } catch (error) {
      console.error("Error:", error)
      setError(error instanceof Error ? error.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>🧪 Prueba de MercadoPago SDK</CardTitle>
          <CardDescription>
            Esta página te permite probar la integración con MercadoPago
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Paso 1: Crear Preferencia de Pago</h3>
            <Button onClick={createTestPreference} disabled={isLoading} className="w-full">
              {isLoading ? "Creando preferencia..." : "Crear Preferencia de Prueba"}
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">❌ Error: {error}</p>
            </div>
          )}

          {preferenceId && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm">
                  ✅ Preferencia creada exitosamente
                </p>
                <p className="text-xs text-gray-600 mt-1">ID: {preferenceId}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Paso 2: Botón de Pago</h3>
                <MercadoPagoButton
                  preferenceId={preferenceId}
                  onSuccess={() => {
                    alert("¡Pago exitoso!")
                  }}
                  onError={(error) => {
                    alert("Error en el pago: " + error.message)
                  }}
                />
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Instrucciones:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Haz clic en "Crear Preferencia de Prueba" para generar una preferencia de pago</li>
              <li>Una vez creada, aparecerá el botón de MercadoPago</li>
              <li>El botón te llevará al checkout de MercadoPago</li>
              <li>Usa las credenciales de prueba para simular un pago</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
