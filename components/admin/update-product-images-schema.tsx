"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

export function UpdateProductImagesSchema() {
  const [isUpdating, setIsUpdating] = useState(false)

  async function handleUpdateSchema() {
    setIsUpdating(true)
    try {
      const response = await fetch("/api/admin/update-product-images-schema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar el esquema")
      }

      toast({
        title: "Éxito",
        description: "Esquema de imágenes de productos actualizado correctamente",
      })
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al actualizar el esquema",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-lg font-medium">Actualizar Esquema de Imágenes</h2>
      <p className="mt-2 text-sm text-gray-500">
        Añade la columna 'display_order' a la tabla 'product_images' para permitir el ordenamiento de imágenes
        adicionales.
      </p>
      <Button onClick={handleUpdateSchema} disabled={isUpdating} className="mt-4">
        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {isUpdating ? "Actualizando..." : "Actualizar Esquema"}
      </Button>
    </div>
  )
}
