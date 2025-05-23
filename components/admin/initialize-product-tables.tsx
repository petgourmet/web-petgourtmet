"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

export function InitializeProductTables() {
  const [loading, setLoading] = useState(false)

  const handleInitializeTables = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/create-product-tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Éxito",
          description: "Las tablas de productos se han creado correctamente",
        })
      } else {
        throw new Error(data.error || "Error desconocido")
      }
    } catch (error: any) {
      console.error("Error initializing product tables:", error)
      toast({
        title: "Error",
        description: `No se pudieron crear las tablas: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleInitializeTables} disabled={loading} className="w-full">
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Inicializar Tablas de Productos
    </Button>
  )
}
