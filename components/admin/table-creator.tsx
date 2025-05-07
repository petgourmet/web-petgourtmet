"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle, Database } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"

interface TableStatus {
  name: string
  exists: boolean
  creating: boolean
  error: string | null
}

export function TableCreator() {
  const [tables, setTables] = useState<TableStatus[]>([
    { name: "product_features", exists: false, creating: false, error: null },
    { name: "product_reviews", exists: false, creating: false, error: null },
  ])
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkTables()
  }, [])

  const checkTables = async () => {
    setChecking(true)

    const updatedTables = [...tables]

    for (let i = 0; i < updatedTables.length; i++) {
      const table = updatedTables[i]

      try {
        const { error } = await supabase.from(table.name).select("id").limit(1).maybeSingle()

        updatedTables[i] = {
          ...table,
          exists: !error,
          error: error ? error.message : null,
        }
      } catch (error) {
        console.error(`Error al verificar tabla ${table.name}:`, error)
        updatedTables[i] = {
          ...table,
          exists: false,
          error: "Error al verificar tabla",
        }
      }
    }

    setTables(updatedTables)
    setChecking(false)
  }

  const createTable = async (tableName: string, index: number) => {
    const updatedTables = [...tables]
    updatedTables[index] = {
      ...updatedTables[index],
      creating: true,
      error: null,
    }
    setTables(updatedTables)

    try {
      const response = await fetch("/api/admin/create-tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ table: tableName }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al crear tabla")
      }

      toast({
        title: "Éxito",
        description: `Tabla ${tableName} creada correctamente`,
      })

      // Actualizar estado
      updatedTables[index] = {
        ...updatedTables[index],
        exists: true,
        creating: false,
        error: null,
      }
    } catch (error: any) {
      console.error(`Error al crear tabla ${tableName}:`, error)

      toast({
        title: "Error",
        description: `No se pudo crear la tabla ${tableName}: ${error.message}`,
        variant: "destructive",
      })

      // Actualizar estado con error
      updatedTables[index] = {
        ...updatedTables[index],
        creating: false,
        error: error.message,
      }
    }

    setTables(updatedTables)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verificación de Tablas</CardTitle>
        <CardDescription>
          Verifica y crea las tablas necesarias para el funcionamiento completo del sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {checking ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Verificando tablas...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {tables.map((table, index) => (
              <div key={table.name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Database className="h-5 w-5 mr-2 text-primary" />
                    <span className="font-medium">{table.name}</span>
                  </div>
                  <div className="flex items-center">
                    {table.exists ? (
                      <span className="flex items-center text-green-600">
                        <CheckCircle className="h-5 w-5 mr-1" /> Existe
                      </span>
                    ) : (
                      <span className="flex items-center text-amber-600">
                        <AlertCircle className="h-5 w-5 mr-1" /> No existe
                      </span>
                    )}
                  </div>
                </div>

                {table.error && !table.exists && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{table.error}</AlertDescription>
                  </Alert>
                )}

                {!table.exists && (
                  <div className="mt-2">
                    <Button onClick={() => createTable(table.name, index)} disabled={table.creating} size="sm">
                      {table.creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Crear tabla
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={checkTables} variant="outline" disabled={checking}>
          {checking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verificar de nuevo
        </Button>
      </CardFooter>
    </Card>
  )
}
