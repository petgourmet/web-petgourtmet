"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export default function EnableRLS() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleEnableRLS = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/enable-rls")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al habilitar RLS")
      }

      setResults(data.results)
    } catch (err: any) {
      setError(err.message || "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Habilitar Row Level Security (RLS)</CardTitle>
        <CardDescription>
          Habilita RLS en las tablas de productos y crea políticas permisivas para mantener la funcionalidad actual
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Esta herramienta habilitará RLS en las siguientes tablas:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>public.product_features</li>
            <li>public.product_images</li>
            <li>public.product_sizes</li>
          </ul>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {results && (
          <div className="border rounded-md divide-y">
            {results.map((result, index) => (
              <div key={index} className="p-3 flex items-start gap-3">
                {result.status === "success" ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">{result.table}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{result.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleEnableRLS} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Habilitando RLS...
            </>
          ) : (
            "Habilitar RLS y crear políticas"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
