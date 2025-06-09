"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, AlertCircle, Loader2, ImageIcon, X, CheckCircle } from "lucide-react"
import Image from "next/image"

interface CloudinaryUploaderProps {
  onImageUploaded: (url: string) => void
  folder?: string
  maxSizeKB?: number
  className?: string
  currentImageUrl?: string
  existingImage?: string
  aspectRatio?: "square" | "landscape" | "portrait"
  buttonText?: string
}

export function CloudinaryUploader({
  onImageUploaded,
  folder = "general",
  maxSizeKB = 2048,
  className = "",
  currentImageUrl,
  existingImage,
  aspectRatio = "square",
  buttonText = "Subir imagen",
}: CloudinaryUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayImage = uploadedUrl || existingImage || currentImageUrl

  const getImageDimensions = () => {
    switch (aspectRatio) {
      case "landscape":
        return { width: 320, height: 180 }
      case "portrait":
        return { width: 180, height: 320 }
      case "square":
      default:
        return { width: 250, height: 250 }
    }
  }

  const { width, height } = getImageDimensions()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setSuccess(null)

    if (!e.target.files || e.target.files.length === 0) {
      setFile(null)
      setPreview(null)
      return
    }

    const selectedFile = e.target.files[0]

    if (!selectedFile.type.startsWith("image/")) {
      setError("El archivo seleccionado no es una imagen")
      return
    }

    if (selectedFile.size > maxSizeKB * 1024) {
      setError(`El archivo es demasiado grande. Máximo: ${maxSizeKB}KB`)
      return
    }

    setFile(selectedFile)
    const objectUrl = URL.createObjectURL(selectedFile)
    setPreview(objectUrl)
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Por favor, selecciona una imagen primero")
      return
    }

    setIsUploading(true)
    setProgress(0)
    setError(null)
    setSuccess(null)

    try {
      console.log("=== INICIO UPLOAD CON API ROUTE ===")
      console.log("Archivo:", file.name, file.type, `${(file.size / 1024).toFixed(2)}KB`)

      setProgress(20)

      // Crear FormData para nuestra API route
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", folder)

      console.log("Enviando a API route /api/upload-image...")

      setProgress(40)

      // Usar nuestra API route que maneja la autenticación
      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      })

      setProgress(70)

      console.log("Respuesta de API:", response.status, response.statusText)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error de API:", errorData)
        throw new Error(errorData.error || `Error HTTP ${response.status}`)
      }

      const result = await response.json()
      setProgress(100)

      console.log("Upload exitoso:", result.secure_url)

      setUploadedUrl(result.secure_url)
      setSuccess("Imagen subida exitosamente")
      onImageUploaded(result.secure_url)

      // Limpiar
      setPreview(null)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error("Error al subir:", err)
      setError(err.message || "Error al subir la imagen")
    } finally {
      setIsUploading(false)
      setProgress(0)
    }
  }

  const handleRemoveImage = () => {
    setUploadedUrl(null)
    setPreview(null)
    setFile(null)
    setSuccess(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onImageUploaded("")
  }

  const triggerFileInput = () => {
    if (fileInputRef.current && !isUploading) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Información de debug */}
      <div className="text-xs bg-green-50 p-2 rounded border border-green-200">
        <div className="font-medium mb-1 text-green-700">✅ Configuración Cloudinary:</div>
        <div>Cloud Name: dn7unepxa</div>
        <div>Endpoint: /api/upload-image</div>
        <div>Folder: petgourmet/{folder}</div>
        <div>Autenticación: Server-side ✅</div>
      </div>

      {/* Vista previa de la imagen */}
      <div
        className={`relative mx-auto overflow-hidden rounded-md border bg-gray-50 flex items-center justify-center transition-colors ${
          !isUploading ? "cursor-pointer hover:bg-gray-100" : ""
        }`}
        style={{ width, height }}
        onClick={triggerFileInput}
      >
        {preview || displayImage ? (
          <>
            <Image
              src={preview || displayImage || ""}
              alt="Vista previa"
              fill
              className="object-cover"
              onError={() => console.error("Error al cargar imagen")}
            />
            {(uploadedUrl || displayImage) && !isUploading && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveImage()
                }}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <ImageIcon className="h-12 w-12 mb-2" />
            <span className="text-sm text-center">Haz clic para seleccionar imagen</span>
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button type="button" onClick={triggerFileInput} variant="outline" disabled={isUploading} className="flex-1">
            {displayImage ? "Cambiar imagen" : "Seleccionar imagen"}
          </Button>
          {file && (
            <Button type="button" onClick={handleUpload} disabled={isUploading} className="flex-1">
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
          )}
        </div>
      </div>

      {file && (
        <div className="text-sm text-gray-500">
          Archivo: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(2)}KB)
        </div>
      )}

      {isUploading && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2 w-full" />
          <p className="text-xs text-gray-500 text-right">{progress}%</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          {success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Formatos: JPG, PNG, WebP. Tamaño máximo: {maxSizeKB}KB.
        <br />
        Upload autenticado con cloud "dn7unepxa" ✅
      </p>
    </div>
  )
}
