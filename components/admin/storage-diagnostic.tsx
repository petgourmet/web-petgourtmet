"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export function StorageDiagnostic() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const runDiagnostic = async () => {
    setLoading(true)
    setError(null)

    try {
      const diagnosticResults: any = {
        session: null,
        buckets: null,
        images: null,
        testUpload: null,
      }

      // Verificar sesión
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      diagnosticResults.session = {
        data: sessionData,
        error: sessionError ? sessionError.message : null,
      }

      // Listar buckets
      const { data: bucketsData, error: bucketsError } = await supabase.storage.listBuckets()
      diagnosticResults.buckets = {
        data: bucketsData,
        error: bucketsError ? bucketsError.message : null,
      }

      // Listar archivos en el bucket 'images'
      const { data: imagesData, error: imagesError } = await supabase.storage.from("images").list()
      diagnosticResults.images = {
        data: imagesData,
        error: imagesError ? imagesError.message : null,
      }

      // Intentar una carga de prueba
      const testBlob = new Blob(["test"], { type: "text/plain" })
      const testFile = new File([testBlob], "test.txt", { type: "text/plain" })

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("images")
        .upload(`test/diagnostic-${Date.now()}.txt`, testFile, {
          cacheControl: "3600",
          upsert: true,
        })

      diagnosticResults.testUpload = {
        data: uploadData,
        error: uploadError ? uploadError.message : null,
      }

      setResults(diagnosticResults)
    } catch (err: any) {
      setError(`Error al ejecutar diagnóstico: ${err.message}`)
      console.error("Error en diagnóstico:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diagnóstico de Supabase Storage</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={runDiagnostic} disabled={loading} className="mb-4">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ejecutando diagnóstico...
            </>
          ) : (
            "Ejecutar diagnóstico"
          )}
        </Button>

        {error && <div className="mb-4 rounded-md bg-red-50 p-4 text-red-600">{error}</div>}

        {results && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Sesión:</h3>
              <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-gray-100 p-2 text-xs">
                {JSON.stringify(results.session, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-medium">Buckets:</h3>
              <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-gray-100 p-2 text-xs">
                {JSON.stringify(results.buckets, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-medium">Archivos en 'images':</h3>
              <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-gray-100 p-2 text-xs">
                {JSON.stringify(results.images, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-medium">Prueba de carga:</h3>
              <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-gray-100 p-2 text-xs">
                {JSON.stringify(results.testUpload, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
