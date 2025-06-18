"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Loader2, Info } from "lucide-react"

export function CloudinaryDiagnostic() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)

  const runDiagnostic = async () => {
    setIsLoading(true)
    setResults(null)

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

      if (!cloudName) {
        setResults({
          error: "CLOUDINARY_CLOUD_NAME no está configurado",
          details: "Verifica que la variable de entorno esté configurada correctamente",
        })
        return
      }

      // Probar conectividad básica
      console.log("Probando conectividad con Cloudinary...")

      const testResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: new FormData(), // FormData vacío para probar la respuesta
      })

      const testText = await testResponse.text()
      console.log("Respuesta de prueba:", testText)

      let testData
      try {
        testData = JSON.parse(testText)
      } catch {
        testData = { raw: testText }
      }

      setResults({
        cloudName,
        connectivity: !testResponse.ok ? "Error de conectividad" : "Conectividad OK",
        response: testData,
        status: testResponse.status,
        uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        recommendation: getRecommendation(testData, testResponse.status),
      })
    } catch (error: any) {
      setResults({
        error: error.message,
        details: "Error de red o configuración",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getRecommendation = (data: any, status: number) => {
    if (status === 400 && data.error?.message?.includes("Must supply upload_preset")) {
      return "Necesitas configurar un upload preset. Ve a tu dashboard de Cloudinary y crea un preset unsigned."
    }
    if (data.error?.message?.includes("API key")) {
      return "Problema con API key. Para unsigned uploads, no debes enviar API key."
    }
    if (status === 401) {
      return "Problema de autenticación. Verifica tu configuración de Cloudinary."
    }
    return "Configuración parece correcta para unsigned uploads."
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Diagnóstico de Cloudinary
        </CardTitle>
        <CardDescription>Verifica la configuración y conectividad con Cloudinary</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostic} disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Ejecutar Diagnóstico"}
        </Button>

        {results && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <strong>Cloud Name:</strong>
              </div>
              <div className="font-mono">{results.cloudName || "No configurado"}</div>

              <div>
                <strong>URL de Upload:</strong>
              </div>
              <div className="font-mono text-xs break-all">{results.uploadUrl}</div>

              <div>
                <strong>Status:</strong>
              </div>
              <div className={results.status === 200 ? "text-green-600" : "text-red-600"}>{results.status}</div>

              <div>
                <strong>Conectividad:</strong>
              </div>
              <div className={results.connectivity === "Conectividad OK" ? "text-green-600" : "text-red-600"}>
                {results.connectivity}
              </div>
            </div>

            {results.recommendation && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">{results.recommendation}</div>
                </div>
              </div>
            )}

            {results.response && (
              <details className="text-xs">
                <summary className="cursor-pointer font-medium">Ver respuesta completa</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                  {JSON.stringify(results.response, null, 2)}
                </pre>
              </details>
            )}

            {results.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-red-800">{results.error}</div>
                    {results.details && <div className="text-xs text-red-600 mt-1">{results.details}</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>
            <strong>Variables configuradas:</strong>
          </p>
          <p>CLOUDINARY_CLOUD_NAME: {process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ? "✅" : "❌"}</p>
          <p>CLOUDINARY_API_KEY: {process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ? "✅" : "❌"}</p>
        </div>
      </CardContent>
    </Card>
  )
}
