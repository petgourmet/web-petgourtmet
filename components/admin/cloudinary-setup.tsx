"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, AlertCircle, Loader2, Settings } from "lucide-react"

export function CloudinarySetup() {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const setupCloudinary = async () => {
    setIsLoading(true)
    setStatus("idle")
    setMessage("")

    try {
      const response = await fetch("/api/setup-cloudinary", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setStatus("success")
        setMessage(data.message || "Cloudinary configurado exitosamente")
      } else {
        setStatus("error")
        setMessage(data.error || "Error al configurar Cloudinary")
      }
    } catch (error: any) {
      setStatus("error")
      setMessage(error.message || "Error de conexión")
    } finally {
      setIsLoading(false)
    }
  }

  const checkConfiguration = async () => {
    setIsLoading(true)
    setStatus("idle")
    setMessage("")

    try {
      const response = await fetch("/api/setup-cloudinary")
      const data = await response.json()

      if (response.ok) {
        setStatus("success")
        setMessage(`Configuración verificada: ${data.message}`)
      } else {
        setStatus("error")
        setMessage(data.error || "Error en la configuración")
      }
    } catch (error: any) {
      setStatus("error")
      setMessage(error.message || "Error de conexión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuración de Cloudinary
        </CardTitle>
        <CardDescription>Configura el upload preset para subir imágenes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={checkConfiguration} disabled={isLoading} variant="outline" className="flex-1">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar"}
          </Button>
          <Button onClick={setupCloudinary} disabled={isLoading} className="flex-1">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Configurar"}
          </Button>
        </div>

        {message && (
          <div
            className={`flex items-center gap-2 text-sm ${status === "success" ? "text-green-600" : "text-red-600"}`}
          >
            {status === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message}
          </div>
        )}

        <div className="text-xs text-gray-500">
          <p>
            <strong>Cloud Name:</strong> {process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "No configurado"}
          </p>
          <p>
            <strong>Preset:</strong> petgourmet_unsigned
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
