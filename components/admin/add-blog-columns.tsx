"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, AlertCircle, Plus } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function AddBlogColumns() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)

  const handleAddColumns = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/add-blog-columns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message || "Columnas añadidas exitosamente" })
        // Recargar la página después de 2 segundos
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setResult({
          success: false,
          error: data.error || "Error al añadir columnas",
        })
      }
    } catch (error) {
      console.error("Error al añadir columnas:", error)
      setResult({
        success: false,
        error: "Error de conexión al intentar añadir columnas",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Añadir Columnas de Blog
        </CardTitle>
        <CardDescription>
          Añade las columnas faltantes (is_published, published_at, author) a la tabla blogs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {result && (
          <Alert variant={result.success ? "default" : "destructive"} className="mb-4">
            {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{result.success ? "Éxito" : "Error"}</AlertTitle>
            <AlertDescription>
              {result.success ? result.message : result.error}
              {result.success && <div className="mt-2 text-sm">La página se recargará automáticamente...</div>}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleAddColumns} disabled={loading} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Añadiendo columnas..." : "Añadir Columnas Faltantes"}
        </Button>
      </CardFooter>
    </Card>
  )
}
