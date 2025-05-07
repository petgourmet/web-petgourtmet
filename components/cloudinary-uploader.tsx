"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, AlertCircle, Loader2, ImageIcon } from "lucide-react"
import Image from "next/image"
import { uploadImage } from "@/lib/cloudinary-service"

interface CloudinaryUploaderProps {
  onImageUploaded: (url: string) => void
  folder?: string
  maxSizeKB?: number
  className?: string
  currentImageUrl?: string
  aspectRatio?: "square" | "landscape" | "portrait"
  buttonText?: string
}

export function CloudinaryUploader({
  onImageUploaded,
  folder = "general",
  maxSizeKB = 1024, // 1MB por defecto
  className = "",
  currentImageUrl,
  aspectRatio = "square",
  buttonText = "Subir imagen",
}: CloudinaryUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Calcular dimensiones según relación de aspecto
  const getImageDimensions = () => {
    switch (aspectRatio) {
      case "landscape":
        return { width: 320, height: 180 } // 16:9
      case "portrait":
        return { width: 180, height: 320 } // 9:16
      case "square":
      default:
        return { width: 250, height: 250 } // 1:1
    }
  }

  const { width, height } = getImageDimensions()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)

    if (!e.target.files || e.target.files.length === 0) {
      setFile(null)
      setPreview(null)
      return
    }

    const selectedFile = e.target.files[0]
    console.log("Archivo seleccionado:", {
      nombre: selectedFile.name,
      tipo: selectedFile.type,
      tamaño: `${(selectedFile.size / 1024).toFixed(2)}KB`,
    })

    // Verificar tipo de archivo
    if (!selectedFile.type.startsWith("image/")) {
      setError("El archivo seleccionado no es una imagen")
      return
    }

    // Verificar tamaño
    if (selectedFile.size > maxSizeKB * 1024) {
      setError(`El archivo es demasiado grande. Máximo: ${maxSizeKB}KB`)
      return
    }

    setFile(selectedFile)

    // Crear preview
    const objectUrl = URL.createObjectURL(selectedFile)
    setPreview(objectUrl)

    // Limpiar el objeto URL cuando ya no se necesite
    return () => URL.revokeObjectURL(objectUrl)
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Por favor, selecciona una imagen primero")
      return
    }

    setIsUploading(true)
    setProgress(0)
    setError(null)

    try {
      // Subir imagen a Cloudinary
      const imageUrl = await uploadImage(file, folder, (progress) => {
        setProgress(progress)
      })

      console.log("Imagen subida exitosamente:", imageUrl)

      // Notificar al componente padre
      if (onImageUploaded) {
        onImageUploaded(imageUrl)
      }

      // Limpiar el input de archivo para permitir subir el mismo archivo nuevamente
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (err: any) {
      console.error("Error al subir imagen:", err)
      setError(err.message || "Error al subir la imagen")
    } finally {
      setIsUploading(false)
    }
  }

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Vista previa de la imagen */}
      <div
        className={`relative mx-auto overflow-hidden rounded-md border bg-gray-50 flex items-center justify-center cursor-pointer`}
        style={{ width, height }}
        onClick={triggerFileInput}
      >
        {preview || currentImageUrl ? (
          <Image src={preview || currentImageUrl || ""} alt="Vista previa" fill className="object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <ImageIcon className="h-12 w-12 mb-2" />
            <span className="text-sm">Haz clic para seleccionar</span>
          </div>
        )}
      </div>

      {/* Input de archivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />

      {/* Controles visibles */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button type="button" onClick={triggerFileInput} variant="outline" disabled={isUploading} className="flex-1">
            Seleccionar imagen
          </Button>
          <Button type="button" onClick={handleUpload} disabled={!file || isUploading} className="flex-1">
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {buttonText}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Información del archivo */}
      {file && (
        <div className="text-sm text-gray-500">
          Archivo: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(2)}KB)
        </div>
      )}

      {/* Barra de progreso */}
      {isUploading && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2 w-full" />
          <p className="text-xs text-gray-500 text-right">{progress}%</p>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Instrucciones */}
      <p className="text-xs text-gray-500">Formatos recomendados: JPG, PNG, WebP. Tamaño máximo: {maxSizeKB}KB.</p>
    </div>
  )
}
