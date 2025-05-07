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
import { Loader2, ArrowLeft, Upload, ShieldAlert } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SecureFileUpload } from "@/components/admin/secure-file-upload"
import type { Blog, BlogCategory } from "@/lib/supabase/types"

export default function BlogForm({ params }: { params: { id: string } }) {
  // Usar React.use para desenvolver los parámetros
  const unwrappedParams = use(params)
  const router = useRouter()
  const isNew = unwrappedParams.id === "new"
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [blog, setBlog] = useState<Partial<Blog>>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    cover_image: "",
    author: "",
    category_id: null,
    is_published: false,
  })
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)

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
      try {
        // Cargar categorías
        const { data: categoriesData } = await supabase.from("blog_categories").select("*").order("name")

        setCategories(categoriesData || [])

        // Si no es un nuevo blog, cargar datos del blog
        if (!isNew) {
          const blogId = Number.parseInt(unwrappedParams.id)

          // Cargar blog
          const { data: blogData, error: blogError } = await supabase
            .from("blogs")
            .select("*")
            .eq("id", blogId)
            .single()

          if (blogError) throw blogError
          setBlog(blogData || {})
        }
      } catch (error) {
        console.error("Error al cargar datos:", error)
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
  }, [isNew, unwrappedParams.id])

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
      is_published: checked,
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

      // Usar la imagen subida o la existente
      const imageUrl = uploadedImageUrl || blog.cover_image

      const blogData = {
        ...blog,
        cover_image: imageUrl,
        published_at: blog.is_published ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }

      if (isNew) {
        // Crear nuevo blog
        const { data, error } = await supabase.from("blogs").insert([blogData]).select()

        if (error) throw error
      } else {
        // Actualizar blog existente
        const blogId = Number.parseInt(unwrappedParams.id)
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
                <Label htmlFor="category">Categoría</Label>
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
              <Label htmlFor="content">Contenido</Label>
              <Textarea
                id="content"
                name="content"
                value={blog.content || ""}
                onChange={handleBlogChange}
                rows={10}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Autor</Label>
              <Input id="author" name="author" value={blog.author || ""} onChange={handleBlogChange} />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="is_published" checked={blog.is_published || false} onCheckedChange={handleCheckboxChange} />
              <Label htmlFor="is_published">Publicado</Label>
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
