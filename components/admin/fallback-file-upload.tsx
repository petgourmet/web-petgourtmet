"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Upload, Check, AlertCircle, Loader2, Link } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import Image from "next/image"

interface FallbackFileUploadProps {
  onUploadComplete?: (url: string) => void
  buttonText?: string
  className?: string
  currentImageUrl?: string
  maxSize?: number // en KB
  acceptedFileTypes?: string
}

export function FallbackFileUpload({
  onUploadComplete,
  buttonText = "Subir archivo",
  className = "",
  currentImageUrl,
  maxSize = 2000, // 2MB por defecto
  acceptedFileTypes = "*",
}: FallbackFileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [tempUrl, setTempUrl] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setSuccess(false)
    setTempUrl(null)

    if (!e.target.files || e.target.files.length === 0) {
      setFile(null)
      setPreview(null)
      return
    }

    const selectedFile = e.target.files[0]
    console.log(`[FallbackFileUpload] Archivo seleccionado:`, {
      nombre: selectedFile.name,
      tipo: selectedFile.type,
      tamaño: `${(selectedFile.size / 1024).toFixed(2)}KB`,
    })

    // Verificar tamaño del archivo
    if (selectedFile.size > maxSize * 1024) {
      const errorMsg = `El archivo es demasiado grande. El tamaño máximo permitido es ${maxSize}KB.`
      console.error(`[FallbackFileUpload] ${errorMsg}`)
      setError(errorMsg)
      setFile(null)
      setPreview(null)
      return
    }

    setFile(selectedFile)

    // Crear preview para imágenes
    if (selectedFile.type.startsWith("image/")) {
      const objectUrl = URL.createObjectURL(selectedFile)
      setPreview(objectUrl)
      setTempUrl(objectUrl)
      console.log(`[FallbackFileUpload] Vista previa creada`)
    } else {
      setPreview(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Por favor, selecciona un archivo primero.")
      return
    }

    setIsUploading(true)
    setProgress(10)
    setError(null)
    setSuccess(false)

    try {
      // Simular carga
      for (let i = 10; i <= 90; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200))
        setProgress(i)
      }

      // Usar URL temporal
      const objectUrl = URL.createObjectURL(file)
      setTempUrl(objectUrl)

      setProgress(100)
      setSuccess(true)

      if (onUploadComplete) {
        // Usar URL temporal como fallback
        onUploadComplete(objectUrl)
      }

      toast({
        title: "Archivo procesado correctamente",
        description: "Se está usando una URL temporal para la imagen.",
      })
    } catch (err: any) {
      console.error(`[FallbackFileUpload] Error inesperado al procesar archivo:`, err)
      setError(`Error inesperado: ${err.message || "Error desconocido"}`)
      setProgress(0)
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
        <Label htmlFor="file-upload-fallback" className="block">
          {buttonText}
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="file-upload-fallback"
            type="file"
            accept={acceptedFileTypes}
            onChange={handleFileChange}
            disabled={isUploading}
            className="flex-1"
          />
          <Button type="button" onClick={handleUpload} disabled={!file || isUploading} className="whitespace-nowrap">
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {isUploading ? "Procesando..." : "Procesar"}
          </Button>
        </div>
      </div>

      {file && (
        <div className="text-sm text-gray-500">
          Archivo seleccionado: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(2)}KB)
        </div>
      )}

      {isUploading && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2 w-full" />
          <p className="text-xs text-gray-500">Procesando... {progress}%</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex flex-col gap-2 text-sm text-green-500">
          <div className="flex items-center">
            <Check className="h-4 w-4 mr-2" />
            Archivo procesado correctamente
          </div>
          {tempUrl && (
            <div className="flex items-center text-blue-500">
              <Link className="h-4 w-4 mr-2" />
              <span className="text-xs">Usando URL temporal</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
