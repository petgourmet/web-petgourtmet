"use client"

import type React from "react"
import { use } from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft, Upload, ShieldAlert, AlertTriangle } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SecureFileUpload } from "@/components/admin/secure-file-upload"
import type { Blog, BlogCategory } from "@/lib/supabase/types"
import ReactMarkdown from "react-markdown"

export default function BlogForm({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const isNew = resolvedParams.id === "new"
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [blog, setBlog] = useState<Partial<Blog>>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    cover_image: "",
    category_id: null,
    published: false,
    author_id: null,
    meta_description: "",
    read_time: 0,
  })
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Verificar autenticación y permisos
  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("Error al verificar sesión:", error)
          setIsAuthenticated(false)
          setIsAdmin(false)
          return
        }

        if (!session) {
          console.warn("No hay sesión activa")
          setIsAuthenticated(false)
          setIsAdmin(false)
          return
        }

        setIsAuthenticated(true)

        // Verificar si el usuario es administrador
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()

        if (profileError) {
          console.error("Error al verificar rol:", profileError)
          setIsAdmin(false)
          return
        }

        setIsAdmin(profileData?.role === "admin")
        console.log("Estado de autenticación:", { isAuthenticated: true, isAdmin: profileData?.role === "admin" })
      } catch (error) {
        console.error("Error inesperado al verificar autenticación:", error)
        setIsAuthenticated(false)
        setIsAdmin(false)
      }
    }

    checkAuth()
  }, [])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        // Cargar categorías
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("blog_categories")
          .select("*")
          .order("name")

        if (categoriesError) {
          throw categoriesError
        }

        setCategories(categoriesData || [])

        // Si no es un nuevo blog, cargar datos del blog
        if (!isNew) {
          const blogId = Number.parseInt(resolvedParams.id)

          // Cargar blog
          const { data: blogData, error: blogError } = await supabase
            .from("blogs")
            .select("*")
            .eq("id", blogId)
            .single()

          if (blogError) throw blogError
          setBlog(blogData || {})
        }
      } catch (error: any) {
        console.error("Error al cargar datos:", error)
        setError(`Error al cargar datos: ${error.message}`)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del blog. Por favor, inténtalo de nuevo.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isNew, resolvedParams.id])

  const handleBlogChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setBlog({
      ...blog,
      [name]: value,
    })
  }

  const handleCheckboxChange = (checked: boolean) => {
    setBlog({
      ...blog,
      published: checked,
    })
  }

  const handleSlugGeneration = () => {
    if (blog.title) {
      const slug = blog.title
        .toLowerCase()
        .replace(/[^\w\s]/gi, "")
        .replace(/\s+/g, "-")

      setBlog({
        ...blog,
        slug,
      })
    }
  }

  const handleFileUploaded = (url: string) => {
    console.log("Archivo subido exitosamente:", url)
    setUploadedImageUrl(url)
    setBlog({
      ...blog,
      cover_image: url,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Verificar autenticación antes de continuar
      if (!isAuthenticated) {
        toast({
          title: "Error de autenticación",
          description: "Debes iniciar sesión para guardar blogs.",
          variant: "destructive",
        })
        setSaving(false)
        return
      }

      if (!isAdmin) {
        toast({
          title: "Error de permisos",
          description: "No tienes permisos para guardar blogs. Se requiere rol de administrador.",
          variant: "destructive",
        })
        setSaving(false)
        return
      }

      // Obtener el usuario actual para el author_id
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        toast({
          title: "Error de autenticación",
          description: "No se pudo obtener la información del usuario.",
          variant: "destructive",
        })
        setSaving(false)
        return
      }

      // Usar la imagen subida o la existente
      const imageUrl = uploadedImageUrl || blog.cover_image

      // Crear objeto de datos básico solo con columnas que sabemos que existen
      const blogData = {
        title: blog.title,
        slug: blog.slug,
        excerpt: blog.excerpt,
        content: blog.content,
        cover_image: imageUrl,
        updated_at: new Date().toISOString(),
        published: blog.published,
        category_id: blog.category_id,
        author_id: session.user.id, // Usar el ID del usuario autenticado
        meta_description: blog.meta_description,
        read_time: blog.read_time,
      }

      if (isNew) {
        // Crear nuevo blog
        const { data, error } = await supabase.from("blogs").insert([blogData]).select()

        if (error) throw error
      } else {
        // Actualizar blog existente
        const blogId = Number.parseInt(resolvedParams.id)
        const { error } = await supabase.from("blogs").update(blogData).eq("id", blogId)

        if (error) throw error
      }

      toast({
        title: "Éxito",
        description: isNew ? "Blog creado correctamente" : "Blog actualizado correctamente",
      })

      router.push("/admin/blogs")
    } catch (error: any) {
      console.error("Error al guardar blog:", error)
      setError(`Error al guardar blog: ${error.message}`)
      toast({
        title: "Error",
        description: `No se pudo guardar el blog: ${error.message || "Error desconocido"}`,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center">
        <Link href="/admin/blogs" className="mr-4">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{isNew ? "Nuevo Blog" : "Editar Blog"}</h1>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-2">
              <Link href="/admin/initialize-blog-tables">
                <Button variant="outline" size="sm">
                  Inicializar Tablas de Blogs
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!isAuthenticated && (
        <Alert variant="destructive" className="mb-6">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>No has iniciado sesión</AlertTitle>
          <AlertDescription>
            Debes iniciar sesión para poder crear o editar blogs.
            <div className="mt-2">
              <Link href="/admin/login">
                <Button variant="outline" size="sm">
                  Ir a iniciar sesión
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {isAuthenticated && !isAdmin && (
        <Alert variant="destructive" className="mb-6">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Permisos insuficientes</AlertTitle>
          <AlertDescription>
            No tienes permisos de administrador para crear o editar blogs. Contacta al administrador del sistema para
            solicitar acceso.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" name="title" value={blog.title} onChange={handleBlogChange} required />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <div className="flex space-x-2">
                  <Input id="slug" name="slug" value={blog.slug} onChange={handleBlogChange} required />
                  <Button type="button" variant="outline" onClick={handleSlugGeneration}>
                    Generar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id">Categoría</Label>
                <Select
                  value={blog.category_id?.toString() || ""}
                  onValueChange={(value) => setBlog({ ...blog, category_id: value ? Number.parseInt(value) : null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sin categoría</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Extracto</Label>
              <Textarea
                id="excerpt"
                name="excerpt"
                value={blog.excerpt || ""}
                onChange={handleBlogChange}
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">Contenido (Markdown)</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                  {showPreview ? "Editar" : "Vista Previa"}
                </Button>
              </div>
              {showPreview ? (
                <div className="min-h-[240px] p-4 border rounded-md bg-gray-50 dark:bg-gray-800">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{blog.content || "Sin contenido para mostrar"}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <Textarea
                  id="content"
                  name="content"
                  value={blog.content || ""}
                  onChange={handleBlogChange}
                  rows={10}
                  required
                  placeholder="Escribe tu contenido en Markdown aquí..."
                />
              )}
              <p className="text-xs text-gray-500">
                Puedes usar Markdown: **negrita**, *cursiva*, # títulos, - listas, [enlaces](url), etc.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="meta_description">Meta Description</Label>
                <Input
                  id="meta_description"
                  name="meta_description"
                  value={blog.meta_description || ""}
                  onChange={handleBlogChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="read_time">Read Time</Label>
                <Input
                  id="read_time"
                  name="read_time"
                  type="number"
                  value={blog.read_time || 0}
                  onChange={handleBlogChange}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="published" checked={blog.published || false} onCheckedChange={handleCheckboxChange} />
              <Label htmlFor="published">Publicado</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Imagen de Portada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <div className="relative h-40 w-full overflow-hidden rounded-md border">
                {uploadedImageUrl || blog.cover_image ? (
                  <Image
                    src={uploadedImageUrl || blog.cover_image || ""}
                    alt="Vista previa"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-100">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>

              {isAuthenticated && isAdmin && (
                <div className="w-full max-w-md">
                  <SecureFileUpload
                    bucket="images"
                    path="blogs"
                    maxSize={500} // 500KB
                    acceptedFileTypes="image/*"
                    onUploadComplete={handleFileUploaded}
                    buttonText="Subir imagen de portada"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Formatos recomendados: JPG, PNG, WebP. Tamaño máximo: 500KB.
                  </p>
                </div>
              )}

              {(!isAuthenticated || !isAdmin) && (
                <p className="mt-2 text-xs text-red-500">
                  {!isAuthenticated
                    ? "Debes iniciar sesión para subir imágenes"
                    : "No tienes permisos para subir imágenes"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Link href="/admin/blogs">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={saving || !isAuthenticated || !isAdmin}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isNew ? "Crear Blog" : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  )
}
