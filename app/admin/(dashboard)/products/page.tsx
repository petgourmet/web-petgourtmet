"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Product } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Edit, Trash2, Copy, Loader2, ChevronLeft, ChevronRight, Package, Layers } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchProducts()
  }, [currentPage, searchTerm])

  async function fetchProducts() {
    setLoading(true)
    try {
      let query = supabase
        .from("products")
        .select(`
          *,
          variants:product_variants(count)
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1)

      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`)
      }

      const { data, count, error } = await query

      if (error) throw error

      // Agregar conteo de variantes
      const productsWithVariantCount = (data || []).map(product => ({
        ...product,
        variant_count: product.variants?.[0]?.count || 0
      }))

      setProducts(productsWithVariantCount || [])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error("Error al cargar productos:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteProduct(id: number) {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este producto?")) {
      return
    }

    // Mostrar mensaje de eliminando
    const deletingAlert = setTimeout(() => {
      alert("Eliminando producto...")
    }, 100)

    try {
      const { error } = await supabase.from("products").delete().eq("id", id)
      if (error) throw error

      // Limpiar el mensaje de eliminando
      clearTimeout(deletingAlert)

      // Actualizar la lista de productos
      setProducts(products.filter((product) => product.id !== id))
      
      alert("¡Producto eliminado exitosamente!")
    } catch (error) {
      // Limpiar el mensaje de eliminando en caso de error
      clearTimeout(deletingAlert)
      console.error("Error al eliminar el producto:", error)
      alert("Error al eliminar el producto. Por favor, inténtalo de nuevo.")
    }
  }

  async function handleDuplicateProduct(id: number) {
    if (!window.confirm("¿Deseas duplicar este producto?")) {
      return
    }

    // Mostrar mensaje de duplicando
    const duplicatingAlert = setTimeout(() => {
      alert("Duplicando producto...")
    }, 100)

    try {
      const response = await fetch("/api/admin/duplicate-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId: id }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al duplicar el producto")
      }

      // Limpiar el mensaje de duplicando
      clearTimeout(duplicatingAlert)

      // Recargar la lista de productos para mostrar el duplicado
      await fetchProducts()
      
      alert("¡Producto duplicado exitosamente!")
    } catch (error: any) {
      // Limpiar el mensaje de duplicando en caso de error
      clearTimeout(duplicatingAlert)
      console.error("Error al duplicar el producto:", error)
      alert("Error al duplicar el producto: " + error.message)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Productos</h1>
        <Link href="/admin/products/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
          </Button>
        </Link>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar productos..."
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
              <TableHead>Tipo</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                  No se encontraron productos
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="relative h-10 w-10 overflow-hidden rounded-md">
                      <Image
                        src={product.image || "/placeholder.svg"}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    {product.product_type === 'variable' ? (
                      <div className="flex flex-col gap-1">
                        <Badge variant="default" className="w-fit">
                          <Layers className="h-3 w-3 mr-1" />
                          Con Variantes
                        </Badge>
                        {product.variant_count > 0 && (
                          <span className="text-xs text-gray-500">
                            {product.variant_count} variante{product.variant_count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Badge variant="secondary" className="w-fit">
                        <Package className="h-3 w-3 mr-1" />
                        Simple
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{product.category_id}</TableCell>
                  <TableCell>${product.price.toFixed(2)}</TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Link href={`/admin/products/${product.id}`}>
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                          <Edit className="h-4 w-4" />
                          <span>Editar</span>
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-500 hover:bg-blue-50 hover:text-blue-600"
                        onClick={() => handleDuplicateProduct(product.id)}
                        title="Duplicar producto"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleDeleteProduct(product.id)}
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

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
