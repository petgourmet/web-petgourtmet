"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function DebugStorage() {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkStorage() {
      setLoading(true)
      setError(null)
      try {
        // Intentar obtener el bucket directamente
        console.log("Intentando obtener bucket 'images'...")
        const { data: bucketData, error: bucketError } = await supabase.storage.getBucket("images")

        if (bucketError) {
          console.error("Error al obtener bucket:", bucketError)
          setError(`Error al obtener bucket: ${bucketError.message}`)

          // Si falla, intentar listar todos los buckets
          console.log("Intentando listar todos los buckets...")
          const { data: bucketsData, error: listError } = await supabase.storage.listBuckets()

          if (listError) {
            console.error("Error al listar buckets:", listError)
            setError(`${error}\nError al listar buckets: ${listError.message}`)
          } else {
            console.log("Buckets encontrados:", bucketsData)
            setResult({
              method: "listBuckets",
              buckets: bucketsData,
              hasBucket: bucketsData?.some((b) => b.name === "images") || false,
            })
          }
        } else {
          console.log("Bucket encontrado:", bucketData)
          setResult({
            method: "getBucket",
            bucket: bucketData,
            exists: true,
          })

          // Intentar listar archivos en el bucket
          console.log("Intentando listar archivos en el bucket 'images'...")
          const { data: filesData, error: filesError } = await supabase.storage.from("images").list()

          if (filesError) {
            console.error("Error al listar archivos:", filesError)
            setError(`Error al listar archivos: ${filesError.message}`)
          } else {
            console.log("Archivos encontrados:", filesData)
            setResult((prev) => ({
              ...prev,
              files: filesData,
            }))
          }
        }
      } catch (e: any) {
        console.error("Error inesperado:", e)
        setError(`Error inesperado: ${e.message}`)
      } finally {
        setLoading(false)
      }
    }

    checkStorage()
  }, [])

  const testUpload = async () => {
    try {
      setLoading(true)
      // Crear un archivo de prueba
      const testBlob = new Blob(["test content"], { type: "text/plain" })
      const testFile = new File([testBlob], "test-file.txt", { type: "text/plain" })

      // Intentar subir el archivo
      console.log("Intentando subir archivo de prueba...")
      const { data, error } = await supabase.storage.from("images").upload(`test-${Date.now()}.txt`, testFile)

      if (error) {
        console.error("Error al subir archivo:", error)
        setError(`Error al subir archivo: ${error.message}`)
      } else {
        console.log("Archivo subido correctamente:", data)
        setResult((prev) => ({
          ...prev,
          uploadTest: {
            success: true,
            data,
          },
        }))
      }
    } catch (e: any) {
      console.error("Error inesperado en upload:", e)
      setError(`Error inesperado en upload: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Diagnóstico de Storage</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Verificando storage...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 p-4 rounded-md border border-red-200">
                <h3 className="text-red-800 font-medium">Error</h3>
                <pre className="text-red-700 text-sm mt-2 whitespace-pre-wrap">{error}</pre>
              </div>
            )}

            {result && (
              <div className="bg-green-50 p-4 rounded-md border border-green-200">
                <h3 className="text-green-800 font-medium">Resultado</h3>
                <pre className="text-green-700 text-sm mt-2 whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
              </div>
            )}

            <Button onClick={testUpload} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Probando...
                </>
              ) : (
                "Probar subida de archivo"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
