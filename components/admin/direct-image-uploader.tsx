"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Upload, AlertCircle, Loader2 } from "lucide-react"
import Image from "next/image"

interface DirectImageUploaderProps {
  onImageUploaded: (url: string) => void
  folder?: string
  maxSizeKB?: number
  className?: string
  currentImageUrl?: string
}

export function DirectImageUploader({
  onImageUploaded,
  folder = "products",
  maxSizeKB = 500,
  className = "",
  currentImageUrl,
}: DirectImageUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
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

    // Crear preview
    if (selectedFile.type.startsWith("image/")) {
      const objectUrl = URL.createObjectURL(selectedFile)
      setPreview(objectUrl)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Por favor, selecciona un archivo primero")
      return
    }

    setIsUploading(true)
    setProgress(10)
    setError(null)

    try {
      // Obtener URL firmada para subida directa
      const response = await fetch(`/api/upload-url?folder=${folder}`)
      const { uploadUrl, uploadPreset, timestamp } = await response.json()

      if (!uploadUrl) {
        throw new Error("No se pudo obtener la URL de subida")
      }

      setProgress(30)

      // Preparar el formulario para subida directa
      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", uploadPreset)
      formData.append("folder", folder)
      formData.append("timestamp", timestamp.toString())

      // Subir directamente a Cloudinary
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      })

      setProgress(70)

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error?.message || "Error al subir la imagen")
      }

      const data = await uploadResponse.json()
      console.log("Upload successful:", data)

      setProgress(100)

      // Usar URL segura (https)
      const secureUrl = data.secure_url

      if (onImageUploaded) {
        onImageUploaded(secureUrl)
      }
    } catch (err: any) {
      console.error("Error uploading:", err)
      setError(err.message || "Error al subir la imagen")

      // Solución alternativa: usar URL de datos para imágenes pequeñas
      if (file && file.size < 100 * 1024) {
        // Menos de 100KB
        try {
          const reader = new FileReader()
          reader.onloadend = () => {
            const dataUrl = reader.result as string
            console.log("Using data URL as fallback")
            if (onImageUploaded) {
              onImageUploaded(dataUrl)
            }
          }
          reader.readAsDataURL(file)
        } catch (dataUrlError) {
          console.error("Error creating data URL:", dataUrlError)
        }
      }
    } finally {
      setIsUploading(false)
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
        <Label htmlFor="image-upload">Seleccionar imagen</Label>
        <div className="flex items-center gap-2">
          <Input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
            className="flex-1"
          />
          <Button type="button" onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Subir
              </>
            )}
          </Button>
        </div>
      </div>

      {file && (
        <div className="text-sm text-gray-500">
          Archivo: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(2)}KB)
        </div>
      )}

      {isUploading && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2 w-full" />
          <p className="text-xs text-gray-500">Subiendo... {progress}%</p>
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
