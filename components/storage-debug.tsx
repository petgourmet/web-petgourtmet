"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export function StorageDebug() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [buckets, setBuckets] = useState<any[]>([])
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null)
  const [bucketDetails, setBucketDetails] = useState<any | null>(null)
  const [bucketFiles, setBucketFiles] = useState<any[]>([])
  const [clientInfo, setClientInfo] = useState<any | null>(null)
  const [supabaseUrl, setSupabaseUrl] = useState<string>("")

  useEffect(() => {
    // Obtener información del cliente Supabase
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "No disponible"
    setSupabaseUrl(url)

    // Verificar si podemos acceder a la API de Supabase
    checkSupabaseConnection()

    // Listar buckets
    listBuckets()
  }, [])

  useEffect(() => {
    if (selectedBucket) {
      getBucketDetails(selectedBucket)
      listBucketFiles(selectedBucket)
    }
  }, [selectedBucket])

  const checkSupabaseConnection = async () => {
    try {
      // Intentar una operación simple para verificar la conexión
      const { data, error } = await supabase.auth.getSession()

      setClientInfo({
        connected: !error,
        session: data?.session ? "Activa" : "No activa",
        error: error ? error.message : null,
      })
    } catch (err: any) {
      setClientInfo({
        connected: false,
        session: "Error",
        error: err.message,
      })
    }
  }

  const listBuckets = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("Listando buckets...")
      const { data, error } = await supabase.storage.listBuckets()

      if (error) {
        console.error("Error al listar buckets:", error)
        setError(`Error al listar buckets: ${error.message}`)
        return
      }

      console.log("Buckets encontrados:", data)
      setBuckets(data || [])

      // Seleccionar automáticamente el bucket 'images' si existe
      const imagesBucket = data?.find((bucket) => bucket.name === "images")
      if (imagesBucket) {
        setSelectedBucket("images")
      }
    } catch (err: any) {
      console.error("Error inesperado al listar buckets:", err)
      setError(`Error inesperado: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getBucketDetails = async (bucketName: string) => {
    try {
      console.log(`Obteniendo detalles del bucket ${bucketName}...`)
      const { data, error } = await supabase.storage.getBucket(bucketName)

      if (error) {
        console.error(`Error al obtener detalles del bucket ${bucketName}:`, error)
        return
      }

      console.log(`Detalles del bucket ${bucketName}:`, data)
      setBucketDetails(data)
    } catch (err: any) {
      console.error(`Error inesperado al obtener detalles del bucket ${bucketName}:`, err)
    }
  }

  const listBucketFiles = async (bucketName: string, folderPath = "") => {
    try {
      console.log(`Listando archivos en ${bucketName}/${folderPath}...`)
      const { data, error } = await supabase.storage.from(bucketName).list(folderPath)

      if (error) {
        console.error(`Error al listar archivos en ${bucketName}/${folderPath}:`, error)
        return
      }

      console.log(`Archivos en ${bucketName}/${folderPath}:`, data)
      setBucketFiles(data || [])
    } catch (err: any) {
      console.error(`Error inesperado al listar archivos en ${bucketName}/${folderPath}:`, err)
    }
  }

  const testUpload = async () => {
    if (!selectedBucket) return

    try {
      // Crear un pequeño archivo de texto para probar
      const testFile = new File(["Archivo de prueba de Supabase Storage"], "test-file.txt", {
        type: "text/plain",
      })

      console.log(`Subiendo archivo de prueba a ${selectedBucket}...`)
      const { data, error } = await supabase.storage.from(selectedBucket).upload(`test-${Date.now()}.txt`, testFile)

      if (error) {
        console.error("Error al subir archivo de prueba:", error)
        alert(`Error al subir archivo de prueba: ${error.message}`)
        return
      }

      console.log("Archivo de prueba subido exitosamente:", data)
      alert("Archivo de prueba subido exitosamente")

      // Actualizar la lista de archivos
      listBucketFiles(selectedBucket)
    } catch (err: any) {
      console.error("Error inesperado al subir archivo de prueba:", err)
      alert(`Error inesperado al subir archivo de prueba: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Diagnóstico de Supabase Storage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Conexión a Supabase</h3>
              <p className="text-sm text-muted-foreground">URL: {supabaseUrl}</p>
              {clientInfo ? (
                <div className="mt-2">
                  <p>Estado: {clientInfo.connected ? "✅ Conectado" : "❌ No conectado"}</p>
                  <p>Sesión: {clientInfo.session}</p>
                  {clientInfo.error && <p className="text-red-500">Error: {clientInfo.error}</p>}
                </div>
              ) : (
                <p>Verificando conexión...</p>
              )}
            </div>

            <div>
              <h3 className="font-medium">Buckets de almacenamiento</h3>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
              ) : buckets.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {buckets.map((bucket) => (
                    <div
                      key={bucket.id}
                      className={`cursor-pointer rounded-md p-2 ${selectedBucket === bucket.name ? "bg-primary/10" : "hover:bg-muted"}`}
                      onClick={() => setSelectedBucket(bucket.name)}
                    >
                      <p className="font-medium">{bucket.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {bucket.public ? "Público" : "Privado"} • Creado: {new Date(bucket.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-2 text-muted-foreground">No se encontraron buckets.</p>
              )}

              <Button variant="outline" size="sm" className="mt-2" onClick={listBuckets}>
                Actualizar lista
              </Button>
            </div>

            {selectedBucket && (
              <div>
                <h3 className="font-medium">Detalles del bucket: {selectedBucket}</h3>
                {bucketDetails ? (
                  <div className="mt-2 rounded-md bg-muted p-3 text-sm">
                    <p>ID: {bucketDetails.id}</p>
                    <p>Nombre: {bucketDetails.name}</p>
                    <p>Público: {bucketDetails.public ? "Sí" : "No"}</p>
                    <p>Creado: {new Date(bucketDetails.created_at).toLocaleString()}</p>
                    <p>Actualizado: {new Date(bucketDetails.updated_at).toLocaleString()}</p>
                  </div>
                ) : (
                  <p>Cargando detalles...</p>
                )}

                <h3 className="mt-4 font-medium">Archivos en {selectedBucket}</h3>
                {bucketFiles.length > 0 ? (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-md bg-muted p-3 text-sm">
                    <ul className="list-inside list-disc">
                      {bucketFiles.map((file, index) => (
                        <li key={index}>
                          {file.name} {file.id.endsWith("/") ? "(carpeta)" : `(${file.metadata?.size || "N/A"} bytes)`}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p>No hay archivos en este bucket.</p>
                )}

                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => listBucketFiles(selectedBucket)}>
                    Actualizar archivos
                  </Button>

                  <Button variant="default" size="sm" onClick={testUpload}>
                    Probar subida
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
