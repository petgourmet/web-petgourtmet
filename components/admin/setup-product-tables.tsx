"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Database, Check, AlertTriangle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function SetupProductTables() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null)

  async function handleSetup() {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/setup-product-tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al configurar tablas")
      }

      setResult({
        success: true,
        message: data.message || "Tablas configuradas correctamente",
      })

      toast({
        title: "Éxito",
        description: "Tablas de productos configuradas correctamente",
      })
    } catch (error: any) {
      console.error("Error:", error)
      setResult({
        success: false,
        error: error.message || "Ocurrió un error al configurar las tablas",
      })

      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al configurar las tablas",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Configuración de Tablas de Productos
        </CardTitle>
        <CardDescription>
          Configura todas las tablas necesarias para la gestión de productos, incluyendo tamaños, imágenes y
          características.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Este proceso creará o actualizará las siguientes tablas:</p>
          <ul className="list-disc pl-5 text-sm text-gray-500">
            <li>products - Tabla principal de productos</li>
            <li>categories - Categorías de productos</li>
            <li>product_sizes - Tamaños y variantes de productos</li>
            <li>product_images - Imágenes adicionales de productos</li>
            <li>product_features - Características destacadas de productos</li>
            <li>product_reviews - Reseñas de productos</li>
          </ul>

          <p className="text-sm text-gray-500">
            También configurará las políticas de seguridad (RLS) para cada tabla, permitiendo que solo los
            administradores puedan gestionar los productos.
          </p>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"} className="mt-4">
              {result.success ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertTitle>{result.success ? "Configuración exitosa" : "Error"}</AlertTitle>
              <AlertDescription>{result.success ? result.message : result.error}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSetup} disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
          {isLoading ? "Configurando tablas..." : "Configurar Tablas de Productos"}
        </Button>
      </CardFooter>
    </Card>
  )
}
