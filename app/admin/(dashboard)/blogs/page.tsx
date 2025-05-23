"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Edit, Trash2, Loader2, ChevronLeft, ChevronRight, Eye, AlertTriangle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { format } from "date-fns"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type Blog = {
  id: number
  title: string
  slug: string
  excerpt: string
  cover_image: string
  created_at: string
  is_published: boolean
  category: { name: string }
}

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchBlogs()
  }, [currentPage, searchTerm])

  async function fetchBlogs() {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from("blogs")
        .select("id, title, slug, excerpt, cover_image, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1)

      if (searchTerm) {
        query = query.ilike("title", `%${searchTerm}%`)
      }

      const { data, count, error } = await query

      if (error) {
        console.error("Error al cargar blogs:", error)
        setError(`Error al cargar blogs: ${error.message}`)
        return
      }

      setBlogs(data || [])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error: any) {
      console.error("Error al cargar blogs:", error)
      setError(`Error al cargar blogs: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteBlog(id: number) {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este blog?")) {
      return
    }

    try {
      const { error } = await supabase.from("blogs").delete().eq("id", id)
      if (error) throw error

      // Actualizar la lista de blogs
      setBlogs(blogs.filter((blog) => blog.id !== id))
    } catch (error: any) {
      console.error("Error al eliminar el blog:", error)
      alert(`Error al eliminar el blog: ${error.message}`)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Blogs</h1>
        <div className="flex space-x-2">
          <Link href="/admin/blogs/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Blog
            </Button>
          </Link>
          <Link href="/admin/add-blog-columns">
            <Button variant="outline">Añadir Columnas</Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-2">
              <Link href="/admin/add-blog-columns">
                <Button variant="outline" size="sm">
                  Añadir Columnas Faltantes
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar blogs..."
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
              <TableHead>Título</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
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
            ) : blogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                  No se encontraron blogs
                </TableCell>
              </TableRow>
            ) : (
              blogs.map((blog) => (
                <TableRow key={blog.id}>
                  <TableCell>
                    <div className="relative h-10 w-10 overflow-hidden rounded-md">
                      <Image
                        src={blog.cover_image || "/placeholder.svg"}
                        alt={blog.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{blog.title}</TableCell>
                  <TableCell>{blog.category?.name || "Sin categoría"}</TableCell>
                  <TableCell>
                    {blog.created_at ? format(new Date(blog.created_at), "dd/MM/yyyy") : "Sin fecha"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800">
                      Creado
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Link href={`/blog/${blog.slug}`} target="_blank">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/blogs/${blog.id}`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleDeleteBlog(blog.id)}
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
