"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, RefreshCw, ExternalLink } from "lucide-react"

export function CloudinaryVerifier() {
  const [verification, setVerification] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const runVerification = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/cloudinary-verify")
      const result = await response.json()
      setVerification(result)
      console.log("Verificación completa:", result)
    } catch (error) {
      console.error("Error en verificación:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (exists: boolean, isValid?: boolean) => {
    if (!exists) return <XCircle className="h-4 w-4 text-red-500" />
    if (isValid === false) return <AlertCircle className="h-4 w-4 text-yellow-500" />
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  const getStatusBadge = (exists: boolean, isValid?: boolean) => {
    if (!exists) return <Badge variant="destructive">No configurado</Badge>
    if (isValid === false) return <Badge variant="secondary">Verificar</Badge>
    return <Badge variant="default">Configurado</Badge>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Verificación de Cloudinary</span>
            <Button onClick={runVerification} disabled={isLoading} size="sm" variant="outline">
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Verificar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!verification && (
            <p className="text-gray-500">Haz clic en "Verificar" para comprobar la configuración de Cloudinary.</p>
          )}

          {verification && (
            <>
              {/* Variables de entorno */}
              <div className="space-y-3">
                <h3 className="font-medium">Variables de entorno:</h3>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(verification.verification.cloudName.exists)}
                    <span className="font-mono text-sm">NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {verification.verification.cloudName.value || "NO CONFIGURADO"}
                    </code>
                    {getStatusBadge(verification.verification.cloudName.exists)}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(verification.verification.apiKey.exists)}
                    <span className="font-mono text-sm">NEXT_PUBLIC_CLOUDINARY_API_KEY</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {verification.verification.apiKey.value || "NO CONFIGURADO"}
                    </code>
                    {getStatusBadge(verification.verification.apiKey.exists)}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(verification.verification.apiSecret.exists)}
                    <span className="font-mono text-sm">CLOUDINARY_API_SECRET</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {verification.verification.apiSecret.value}
                    </code>
                    {getStatusBadge(verification.verification.apiSecret.exists)}
                  </div>
                </div>
              </div>

              {/* Test de conectividad */}
              {verification.connectivityTest && (
                <div className="space-y-3">
                  <h3 className="font-medium">Test de conectividad:</h3>
                  <div className="p-3 border rounded bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(true, verification.connectivityTest.cloudExists)}
                      <span className="font-medium">
                        {verification.connectivityTest.cloudExists ? "Cloud encontrado" : "Cloud no encontrado"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">Status: {verification.connectivityTest.status}</div>
                    {verification.connectivityTest.response && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-blue-600">Ver respuesta completa</summary>
                        <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto">
                          {verification.connectivityTest.response}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              )}

              {/* Recomendaciones */}
              <div className="space-y-3">
                <h3 className="font-medium">Recomendaciones:</h3>
                <div className="space-y-2">
                  {verification.recommendations.map((rec: string, index: number) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enlaces útiles */}
              <div className="space-y-2 pt-4 border-t">
                <h3 className="font-medium">Enlaces útiles:</h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://cloudinary.com/console" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Cloudinary Console
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href="https://cloudinary.com/documentation/how_to_integrate_cloudinary"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Documentación
                    </a>
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
