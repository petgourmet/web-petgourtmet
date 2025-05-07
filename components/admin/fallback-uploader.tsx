"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Upload } from "lucide-react"
import Image from "next/image"

interface FallbackUploaderProps {
  onImageUploaded: (url: string) => void
  maxSizeKB?: number
  className?: string
  currentImageUrl?: string
}

export function FallbackUploader({
  onImageUploaded,
  maxSizeKB = 100,
  className = "",
  currentImageUrl,
}: FallbackUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)

    if (!e.target.files || e.target.files.length === 0) {
      setFile(null)
      setPreview(null)
      return
    }

    const selectedFile = e.target.files[0]
    console.log("File selected:", {
      name: selectedFile.name,
      type: selectedFile.type,
      size: `${(selectedFile.size / 1024).toFixed(2)}KB`,
    })

    // Verificar tamaño
    if (selectedFile.size > maxSizeKB * 1024) {
      setError(`El archivo es demasiado grande. Máximo: ${maxSizeKB}KB`)
      return
    }

    setFile(selectedFile)

    // Crear preview y data URL
    if (selectedFile.type.startsWith("image/")) {
      const objectUrl = URL.createObjectURL(selectedFile)
      setPreview(objectUrl)

      // Convertir a data URL
      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = reader.result as string
        if (onImageUploaded) {
          onImageUploaded(dataUrl)
        }
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {(preview || currentImageUrl) && (
        <div className="relative h-40 w-40 overflow-hidden rounded-md border mx-auto">
          <Image src={preview || currentImageUrl || ""} alt="Vista previa" fill className="object-cover" />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="fallback-upload">Seleccionar imagen (modo alternativo)</Label>
        <div className="flex items-center gap-2">
          <Input id="fallback-upload" type="file" accept="image/*" onChange={handleFileChange} className="flex-1" />
          <Button type="button" variant="outline" disabled={true}>
            <Upload className="mr-2 h-4 w-4" />
            Automático
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          Este modo convierte la imagen directamente a un formato de datos. Máximo: {maxSizeKB}KB.
        </p>
      </div>

      {file && (
        <div className="text-sm text-gray-500">
          Archivo: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(2)}KB)
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  )
}
