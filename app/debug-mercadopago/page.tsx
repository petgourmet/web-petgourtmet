"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export default function DebugMercadoPago() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [configStatus, setConfigStatus] = useState<any>(null)

  // Verificar el estado de la configuración al cargar
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const response = await fetch("/api/mercadopago/config")
        const data = await response.json()
        setConfigStatus({
          publicKeyConfigured: !!data.publicKey,
          accessTokenConfigured: data.accessTokenConfigured,
          appUrlConfigured: data.appUrlConfigured,
        })
      } catch (error) {
        console.error("Error al verificar configuración:", error)
      }
    }

    checkConfig()
  }, [])

  const testPreference = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/debug-mercadopago", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al crear la preferencia de prueba")
      }

      setResult(data)
    } catch (error) {
      console.error("Error:", error)
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Diagnóstico de Mercado Pago</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Probar Creación de Preferencia</h2>
        <p className="mb-4">
          Esta herramienta crea una preferencia de prueba en Mercado Pago para verificar que la integración funciona
          correctamente.
        </p>

        <Button onClick={testPreference} disabled={isLoading} className="mb-4">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Probando...
            </>
          ) : (
            "Crear Preferencia de Prueba"
          )}
        </Button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4">
            <h3 className="font-semibold">Error:</h3>
            <p className="whitespace-pre-wrap">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md">
            <h3 className="font-semibold">Resultado:</h3>
            <pre className="whitespace-pre-wrap overflow-auto max-h-96 mt-2 text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
            {result.initPoint && (
              <div className="mt-4">
                <a
                  href={result.initPoint}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md inline-block"
                >
                  Ir a la página de pago
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Estado de la Configuración</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="access-token">Access Token</Label>
            <Input
              id="access-token"
              value={configStatus?.accessTokenConfigured ? "✅ Configurado" : "❌ No configurado"}
              disabled
              className={configStatus?.accessTokenConfigured ? "text-green-600" : "text-red-600"}
            />
          </div>
          <div>
            <Label htmlFor="public-key">Public Key</Label>
            <Input
              id="public-key"
              value={configStatus?.publicKeyConfigured ? "✅ Configurado" : "❌ No configurado"}
              disabled
              className={configStatus?.publicKeyConfigured ? "text-green-600" : "text-red-600"}
            />
          </div>
          <div>
            <Label htmlFor="app-url">URL de la Aplicación</Label>
            <Input
              id="app-url"
              value={configStatus?.appUrlConfigured ? "✅ Configurado" : "❌ No configurado"}
              disabled
              className={configStatus?.appUrlConfigured ? "text-green-600" : "text-red-600"}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
