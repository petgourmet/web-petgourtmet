"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function InitializeBlogTables() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)

  const handleInitialize = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/create-blog-tables")
      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message || "Tablas de blogs inicializadas correctamente" })
      } else {
        setResult({
          success: false,
          error: data.error || "Error al inicializar tablas de blogs",
        })
      }
    } catch (error) {
      console.error("Error al inicializar tablas de blogs:", error)
      setResult({
        success: false,
        error: "Error de conexión al intentar inicializar las tablas de blogs",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inicializar Tablas de Blogs</CardTitle>
        <CardDescription>
          Crea o actualiza las tablas necesarias para el sistema de blogs en la base de datos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          Esta herramienta verificará si las tablas de blogs existen y creará las que falten. También añadirá columnas
          faltantes si es necesario.
        </p>

        {result && (
          <Alert variant={result.success ? "default" : "destructive"} className="mb-4">
            {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{result.success ? "Éxito" : "Error"}</AlertTitle>
            <AlertDescription>{result.success ? result.message : result.error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleInitialize} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Inicializando..." : "Inicializar Tablas de Blogs"}
        </Button>
      </CardFooter>
    </Card>
  )
}
