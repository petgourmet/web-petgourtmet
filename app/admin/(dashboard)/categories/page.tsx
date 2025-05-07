"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Category } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Edit, Trash2, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchCategories()
  }, [searchTerm])

  async function fetchCategories() {
    setLoading(true)
    try {
      let query = supabase.from("categories").select("*").order("name")

      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`)
      }

      const { data, error } = await query

      if (error) throw error

      setCategories(data || [])
    } catch (error) {
      console.error("Error al cargar categorías:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteCategory(id: number) {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta categoría?")) {
      return
    }

    try {
      const { error } = await supabase.from("categories").delete().eq("id", id)

      if (error) {
        if (error.code === "23503") {
          // Foreign key violation
          throw new Error("No se puede eliminar esta categoría porque tiene productos asociados.")
        }
        throw error
      }

      // Actualizar la lista de categorías
      setCategories(categories.filter((category) => category.id !== id))
    } catch (error: any) {
      console.error("Error al eliminar la categoría:", error)
      alert(error.message || "Error al eliminar la categoría")
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categorías</h1>
        <Link href="/admin/categories/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nueva Categoría
          </Button>
        </Link>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar categorías..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Imagen</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Color</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                </TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                  No se encontraron categorías
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="relative h-10 w-10 overflow-hidden rounded-md">
                      {category.image ? (
                        <Image
                          src={category.image || "/placeholder.svg"}
                          alt={category.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center bg-gray-100 text-gray-400">
                          <span className="text-xs">Sin imagen</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.description}</TableCell>
                  <TableCell>
                    <div className="h-6 w-6 rounded-full" style={{ backgroundColor: category.color }} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Link href={`/admin/categories/${category.id}`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
