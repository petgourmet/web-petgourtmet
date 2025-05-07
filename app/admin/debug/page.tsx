"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import DebugStorage from "../debug-storage"

export default function DebugPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [sqlQuery, setSqlQuery] = useState<string>(
    `-- Crear políticas para el bucket images
CREATE POLICY "Lectura pública de imágenes" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'images');

-- Política para permitir escritura a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden subir imágenes" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'images');

-- Política para permitir actualización a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden actualizar sus imágenes" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'images');

-- Política para permitir eliminación a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden eliminar sus imágenes" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'images');`,
  )

  const executeSQL = async () => {
    if (!sqlQuery.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Ejecutar SQL usando la API de Supabase
      const { data, error } = await supabase.rpc("exec_sql", { sql: sqlQuery })

      if (error) {
        console.error("Error al ejecutar SQL:", error)
        setError(error.message)
      } else {
        console.log("SQL ejecutado correctamente:", data)
        setResult(data)
      }
    } catch (e: any) {
      console.error("Error inesperado:", e)
      setError(`Error inesperado: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Herramientas de Depuración</h1>

      <Tabs defaultValue="storage">
        <TabsList className="mb-4">
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="sql">SQL</TabsTrigger>
        </TabsList>

        <TabsContent value="storage">
          <DebugStorage />
        </TabsContent>

        <TabsContent value="sql">
          <Card>
            <CardHeader>
              <CardTitle>Ejecutar SQL</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  rows={10}
                  placeholder="Ingresa tu consulta SQL aquí..."
                  className="font-mono"
                />

                <Button onClick={executeSQL} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ejecutando...
                    </>
                  ) : (
                    "Ejecutar SQL"
                  )}
                </Button>

                {error && (
                  <div className="bg-red-50 p-4 rounded-md border border-red-200">
                    <h3 className="text-red-800 font-medium">Error</h3>
                    <pre className="text-red-700 text-sm mt-2 whitespace-pre-wrap">{error}</pre>
                  </div>
                )}

                {result && (
                  <div className="bg-green-50 p-4 rounded-md border border-green-200">
                    <h3 className="text-green-800 font-medium">Resultado</h3>
                    <pre className="text-green-700 text-sm mt-2 whitespace-pre-wrap">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
