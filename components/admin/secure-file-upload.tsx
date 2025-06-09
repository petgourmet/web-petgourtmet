"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Upload, Check, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import Image from "next/image"

interface SecureFileUploadProps {
  bucket: string
  path?: string
  maxSize?: number // en KB
  acceptedFileTypes?: string
  onUploadComplete?: (url: string) => void
  buttonText?: string
  className?: string
  currentImageUrl?: string
}

export function SecureFileUpload({
  bucket,
  path = "",
  maxSize = 2000, // 2MB por defecto
  acceptedFileTypes = "*",
  onUploadComplete,
  buttonText = "Subir archivo",
  className = "",
  currentImageUrl,
}: SecureFileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setSuccess(false)

    if (!e.target.files || e.target.files.length === 0) {
      setFile(null)
      setPreview(null)
      return
    }

    const selectedFile = e.target.files[0]
    console.log(`[SecureFileUpload] Archivo seleccionado:`, {
      nombre: selectedFile.name,
      tipo: selectedFile.type,
      tamaño: `${(selectedFile.size / 1024).toFixed(2)}KB`,
    })

    // Verificar tamaño del archivo
    if (selectedFile.size > maxSize * 1024) {
      const errorMsg = `El archivo es demasiado grande. El tamaño máximo permitido es ${maxSize}KB.`
      console.error(`[SecureFileUpload] ${errorMsg}`)
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
      console.log(`[SecureFileUpload] Vista previa creada`)
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

    console.log(`[SecureFileUpload] Iniciando carga de archivo a bucket '${bucket}'...`)

    try {
      // Crear FormData para enviar el archivo
      const formData = new FormData()
      formData.append("file", file)
      formData.append("bucket", bucket)
      formData.append("path", path)

      setProgress(30)

      // Usar la API route para subir el archivo
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      setProgress(70)

      // Verificar si la respuesta es JSON válida
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text()
        console.error(`[SecureFileUpload] Respuesta no-JSON recibida:`, textResponse)
        throw new Error(`El servidor devolvió una respuesta inválida: ${textResponse.substring(0, 100)}...`)
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Error HTTP ${response.status}`)
      }

      console.log(`[SecureFileUpload] Archivo subido exitosamente:`, data)

      setProgress(100)
      setSuccess(true)

      if (onUploadComplete && data.url) {
        onUploadComplete(data.url)
      }

      toast({
        title: "Archivo subido correctamente",
        description: "El archivo se ha subido correctamente a Supabase Storage.",
      })
    } catch (err: any) {
      console.error(`[SecureFileUpload] Error al subir archivo:`, err)
      setError(`Error: ${err.message || "Error desconocido"}`)
      setProgress(0)

      toast({
        title: "Error al subir archivo",
        description: err.message || "Ocurrió un error inesperado",
        variant: "destructive",
      })
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
        <Label htmlFor="file-upload" className="block">
          {buttonText}
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="file-upload"
            type="file"
            accept={acceptedFileTypes}
            onChange={handleFileChange}
            disabled={isUploading}
            className="flex-1"
          />
          <Button type="button" onClick={handleUpload} disabled={!file || isUploading} className="whitespace-nowrap">
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {isUploading ? "Subiendo..." : "Subir"}
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
          <p className="text-xs text-gray-500">Subiendo... {progress}%</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-500">
          <Check className="h-4 w-4" />
          Archivo subido correctamente
        </div>
      )}
    </div>
  )
}
