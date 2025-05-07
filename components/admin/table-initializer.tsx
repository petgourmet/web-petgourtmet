"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export function TableInitializer() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const initializeTables = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/create-product-tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al inicializar tablas")
      }

      setResults(data.results)
    } catch (err: any) {
      setError(err.message || "Error desconocido al inicializar tablas")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Inicializar Tablas de Productos</CardTitle>
        <CardDescription>
          Este proceso creará o actualizará las tablas necesarias para la gestión de productos y configurará los
          permisos adecuados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {results && (
          <div className="space-y-4">
            <Alert variant="default" className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Proceso completado</AlertTitle>
              <AlertDescription>
                El proceso de inicialización ha finalizado. Revisa los resultados a continuación.
              </AlertDescription>
            </Alert>

            <div className="border rounded-md divide-y">
              {results.map((result, index) => (
                <div key={index} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{result.table}</p>
                    <p className="text-sm text-gray-500">{result.message}</p>
                  </div>
                  <div>
                    {result.status === "created" || result.status === "updated" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : result.status === "partial" ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={initializeTables} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Inicializando...
            </>
          ) : (
            "Inicializar Tablas"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
