"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

export function FixProductTables() {
  const [loading, setLoading] = useState(false)

  const handleFixTables = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/fix-product-tables")
      const data = await response.json()

      if (data.success) {
        toast({
          title: "Éxito",
          description: "Las tablas de productos se han actualizado correctamente.",
        })
      } else {
        throw new Error(data.error || "Error desconocido")
      }
    } catch (error: any) {
      console.error("Error al arreglar las tablas:", error)
      toast({
        title: "Error",
        description: `No se pudieron arreglar las tablas: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleFixTables} disabled={loading}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Arreglar tablas de productos
    </Button>
  )
}
