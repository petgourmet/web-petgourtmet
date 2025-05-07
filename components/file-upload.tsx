"use client"

import type React from "react"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Upload, X, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Image from "next/image"
import { toast } from "@/components/ui/use-toast"

interface FileUploadProps {
  bucketName: string
  folderPath?: string
  onUploadComplete: (url: string) => void
  accept?: string
  maxSizeMB?: number
  currentFileUrl?: string
  className?: string
}

export function FileUpload({
  bucketName,
  folderPath = "",
  onUploadComplete,
  accept = "image/*",
  maxSizeMB = 5,
  currentFileUrl,
  className = "",
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bucketExists, setBucketExists] = useState<boolean | null>(null)

  // Verificar si el bucket existe al cargar el componente
  useState(() => {
    async function checkBucket() {
      try {
        const { data: buckets, error } = await supabase.storage.listBuckets()
        if (error) {
          console.error("Error al verificar buckets:", error)
          setBucketExists(false)
          return
        }

        const foundBucket = buckets?.find((bucket) => bucket.name === bucketName)
        setBucketExists(!!foundBucket)
      } catch (error) {
        console.error("Error al verificar buckets:", error)
        setBucketExists(false)
      }
    }

    checkBucket()
  }, [bucketName])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]

      // Validar tamaño del archivo
      if (selectedFile.size > maxSizeMB * 1024 * 1024) {
        setError(`El archivo es demasiado grande. El tamaño máximo es ${maxSizeMB}MB.`)
        return
      }

      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    if (!bucketExists) {
      setError(`El bucket "${bucketName}" no existe. Contacta al administrador.`)
      return
    }

    setUploading(true)
    setError(null)

    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName

      const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath)

      onUploadComplete(data.publicUrl)
      toast({
        title: "Archivo subido",
        description: "El archivo se ha subido correctamente.",
      })
    } catch (error: any) {
      console.error("Error al subir archivo:", error)
      setError(`Error al subir archivo: ${error.message || "Error desconocido"}`)
      toast({
        title: "Error",
        description: `No se pudo subir el archivo: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    setPreview(null)
  }

  const isImage = accept.includes("image/") || accept === "image/*"

  return (
    <div className={`space-y-4 ${className}`}>
      {bucketExists === false && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Bucket no encontrado</AlertTitle>
          <AlertDescription>
            El bucket "{bucketName}" no existe en Supabase. No podrás subir archivos hasta que se cree.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isImage && (preview || currentFileUrl) && (
        <div className="relative h-40 w-40 overflow-hidden rounded-md border">
          <Image src={preview || currentFileUrl || ""} alt="Vista previa" fill className="object-cover" />
          {preview && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute right-1 top-1 h-6 w-6"
              onClick={clearFile}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="file-upload" className={bucketExists === false ? "opacity-50" : ""}>
          {file ? file.name : "Seleccionar archivo"}
        </Label>
        <Input
          id="file-upload"
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={bucketExists === false || uploading}
          className={bucketExists === false ? "opacity-50 cursor-not-allowed" : ""}
        />
      </div>

      <div className="flex space-x-2">
        <Button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading || bucketExists === false}
          className="flex-1"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" /> Subir archivo
            </>
          )}
        </Button>

        {file && (
          <Button type="button" variant="outline" onClick={clearFile} disabled={uploading}>
            <X className="mr-2 h-4 w-4" /> Cancelar
          </Button>
        )}
      </div>
    </div>
  )
}
