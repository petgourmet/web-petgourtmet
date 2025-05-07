"use client"

import { useState, useRef, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Upload, Check, AlertCircle, ImageIcon } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface AlternativeFileUploadProps {
  onFileUpload: (url: string) => void
  initialUrl?: string
  label?: string
  accept?: string
  className?: string
}

export function AlternativeFileUpload({
  onFileUpload,
  initialUrl = "",
  label = "Imagen",
  accept = "image/*",
  className = "",
}: AlternativeFileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(initialUrl)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      // Crear una URL temporal para la vista previa
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)

      // Simular una carga exitosa
      // En un entorno real, aquí subirías el archivo a un servicio como Cloudinary, AWS S3, etc.
      setTimeout(() => {
        // Usar la URL temporal como la URL final
        // Nota: En producción, esto debería ser reemplazado por la URL real del servicio de almacenamiento
        onFileUpload(objectUrl)

        toast({
          title: "Archivo cargado",
          description: "El archivo se ha cargado correctamente (URL temporal).",
        })

        setIsUploading(false)
      }, 1000)
    } catch (error: any) {
      console.error("Error al cargar archivo:", error)
      setError(error.message || "Error al cargar el archivo")
      setIsUploading(false)

      toast({
        title: "Error",
        description: "No se pudo cargar el archivo.",
        variant: "destructive",
      })
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={className}>
      <Label htmlFor="file-upload">{label}</Label>

      <div className="mt-2">
        <Input
          ref={fileInputRef}
          id="file-upload"
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          {previewUrl ? (
            <Card className="overflow-hidden w-full max-w-xs">
              <CardContent className="p-0">
                {accept.includes("image/") ? (
                  <img
                    src={previewUrl || "/placeholder.svg"}
                    alt="Vista previa"
                    className="w-full h-auto object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center p-6 bg-gray-100">
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center w-full">
              <div className="flex flex-col items-center">
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Haz clic para seleccionar un archivo</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleButtonClick}
              disabled={isUploading}
              variant={previewUrl ? "outline" : "default"}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando...
                </>
              ) : previewUrl ? (
                "Cambiar archivo"
              ) : (
                "Seleccionar archivo"
              )}
            </Button>

            {previewUrl && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setPreviewUrl("")
                  onFileUpload("")
                }}
                disabled={isUploading}
              >
                Eliminar
              </Button>
            )}
          </div>

          {previewUrl && !isUploading && (
            <div className="flex items-center text-sm text-green-600">
              <Check className="mr-1 h-4 w-4" /> Archivo cargado (URL temporal)
            </div>
          )}

          {error && (
            <div className="flex items-center text-sm text-red-600">
              <AlertCircle className="mr-1 h-4 w-4" /> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
