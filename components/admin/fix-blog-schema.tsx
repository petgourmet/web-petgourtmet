"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, AlertCircle, Database } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function FixBlogSchema() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)

  const handleFix = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/fix-blog-schema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message || "Esquema de blogs corregido exitosamente" })
        // Recargar la página después de 2 segundos para refrescar el esquema
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setResult({
          success: false,
          error: data.error || "Error al corregir el esquema de blogs",
        })
      }
    } catch (error) {
      console.error("Error al corregir esquema de blogs:", error)
      setResult({
        success: false,
        error: "Error de conexión al intentar corregir el esquema de blogs",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Corregir Esquema de Blogs
        </CardTitle>
        <CardDescription>
          Crea las tablas y columnas necesarias para el sistema de blogs en la base de datos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">Esta herramienta creará automáticamente:</p>
        <ul className="text-sm text-gray-600 mb-4 list-disc list-inside space-y-1">
          <li>
            Tabla <code>blogs</code> con todas las columnas necesarias
          </li>
          <li>
            Tabla <code>blog_categories</code> para categorías
          </li>
          <li>
            Columnas faltantes: <code>author</code>, <code>is_published</code>, <code>published_at</code>
          </li>
          <li>Categorías por defecto: General, Nutrición, Cuidado</li>
        </ul>

        {result && (
          <Alert variant={result.success ? "default" : "destructive"} className="mb-4">
            {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{result.success ? "Éxito" : "Error"}</AlertTitle>
            <AlertDescription>
              {result.success ? result.message : result.error}
              {result.success && (
                <div className="mt-2 text-sm">La página se recargará automáticamente en unos segundos...</div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleFix} disabled={loading} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Corrigiendo esquema..." : "Corregir Esquema de Blogs"}
        </Button>
      </CardFooter>
    </Card>
  )
}
