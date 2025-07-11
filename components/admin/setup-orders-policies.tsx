"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ShieldCheck, Check, AlertTriangle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface SetupResult {
  success: boolean
  message?: string
  error?: string
}

export function SetupOrdersPolicies() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<SetupResult | null>(null)

  async function handleSetup() {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/setup-orders-policies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al configurar políticas")
      }

      setResult({
        success: true,
        message: data.message,
      })

      toast({
        title: "Configuración exitosa",
        description: "Las políticas RLS para pedidos han sido configuradas correctamente.",
      })
    } catch (error: any) {
      console.error("Error al configurar políticas:", error)

      setResult({
        success: false,
        error: error.message,
      })

      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al configurar las políticas",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Configurar Políticas de Pedidos
        </CardTitle>
        <CardDescription>
          Configura las políticas de Row Level Security (RLS) para las tablas de pedidos en Supabase.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">Esta herramienta configurará automáticamente:</p>
        <ul className="text-sm text-gray-600 mb-4 list-disc list-inside space-y-1">
          <li>orders - Tabla principal de pedidos</li>
          <li>order_items - Items de cada pedido</li>
          <li>order_metadata - Metadatos adicionales de pedidos</li>
        </ul>

        <p className="text-sm text-gray-500">
          También configurará las políticas de seguridad (RLS) para cada tabla, permitiendo la creación de pedidos
          desde la API mientras mantiene la seguridad para operaciones de administración.
        </p>

        {result && (
          <Alert variant={result.success ? "default" : "destructive"} className="mt-4">
            {result.success ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <AlertTitle>{result.success ? "Configuración exitosa" : "Error"}</AlertTitle>
            <AlertDescription>{result.success ? result.message : result.error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSetup} disabled={isLoading} className="w-full">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? "Configurando..." : "Configurar Políticas RLS"}
        </Button>
      </CardFooter>
    </Card>
  )
}
