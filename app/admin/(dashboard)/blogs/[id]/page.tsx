"use client"

import type React from "react"

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
import { Loader2, ArrowLeft, Upload, Eye } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"

// Importar el editor de Markdown dinámicamente para evitar errores de SSR
const MDEditor = dynamic(() => import("@uiw/react-md-editor").then((mod) => mod.default), { ssr: false })
const MDPreview = dynamic(() => import("@uiw/react-md-editor").then((mod) => mod.MDPreview), { ssr: false })

type BlogCategory = {
  id: number
  name: string
}

type Blog = {
  id?: number
  title: string
  slug?: string
  excerpt: string
  content: string
  cover_image: string
  category_id: number | null
  is_published: boolean
}

export default function BlogForm({ params }: { params: { id: string } }) {
  const router = useRouter()
  const isNew = params.id === "new"
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [blog, setBlog] = useState<Blog>({
    title: "",
    excerpt: "",
    content: "",
    cover_image: "",
    category_id: null,
    is_published: false,
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        // Cargar categorías
        const { data: categoriesData } = await supabase.from("blog_categories").select("*").order("name")
        setCategories(categoriesData || [])

        // Si no es un nuevo blog, cargar datos del blog
        if (!isNew) {
          const blogId = Number.parseInt(params.id)
          const { data: blogData, error: blogError } = await supabase
            .from("blogs")
            .select("*")
            .eq("id", blogId)
            .single()

          if (blogError) throw blogError
          setBlog(
            blogData || {
              title: "",
              excerpt: "",
              content: "",
              cover_image: "",
              category_id: null,
              is_published: false,
            },
          )
        }
      } catch (error) {
        console.error("Error al cargar datos:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isNew, params.id])

  const handleBlogChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setBlog({
      ...blog,
      [name]: value,
    })
  }

  const handleContentChange = (value?: string) => {
    setBlog({
      ...blog,
      content: value || "",
    })
  }

  const handleCheckboxChange = (checked: boolean) => {
    setBlog({
      ...blog,
      is_published: checked,
    })
  }

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `blogs/${fileName}`

    const { error: uploadError } = await supabase.storage.from("images").upload(filePath, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from("images").getPublicUrl(filePath)
    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Subir imagen principal si hay una nueva
      let imageUrl = blog.cover_image
      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
      }

      const blogData = {
        ...blog,
        cover_image: imageUrl,
      }

      if (isNew) {
        // Crear nuevo blog
        const { data, error } = await supabase.from("blogs").insert([blogData]).select()

        if (error) throw error
      } else {
        // Actualizar blog existente
        const { error } = await supabase.from("blogs").update(blogData).eq("id", params.id)

        if (error) throw error
      }

      router.push("/admin/blogs")
    } catch (error) {
      console.error("Error al guardar blog:", error)
      alert("Error al guardar el blog. Por favor, inténtalo de nuevo.")
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

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" name="title" value={blog.title} onChange={handleBlogChange} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={blog.category_id?.toString() || ""}
                  onValueChange={(value) => setBlog({ ...blog, category_id: Number.parseInt(value) || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-1">Sin categoría</SelectItem>
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
                placeholder="Breve descripción del blog (aparecerá en las tarjetas de previsualización)"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="is_published" checked={blog.is_published} onCheckedChange={handleCheckboxChange} />
              <Label htmlFor="is_published">Publicar inmediatamente</Label>
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
                {imagePreview || blog.cover_image ? (
                  <Image
                    src={imagePreview || blog.cover_image || ""}
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
              <div>
                <Label htmlFor="main-image" className="cursor-pointer">
                  <div className="flex items-center space-x-2 rounded-md border px-4 py-2 hover:bg-gray-50">
                    <Upload className="h-4 w-4" />
                    <span>Subir imagen de portada</span>
                  </div>
                  <Input
                    id="main-image"
                    type="file"
                    accept="image/*"
                    onChange={handleMainImageChange}
                    className="hidden"
                  />
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Contenido</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setPreviewMode(!previewMode)}>
              <Eye className="mr-2 h-4 w-4" /> {previewMode ? "Editar" : "Vista previa"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="min-h-[400px]" data-color-mode="light">
              {previewMode ? (
                <div className="border p-4 rounded-md">
                  <MDPreview source={blog.content} />
                </div>
              ) : (
                <MDEditor value={blog.content} onChange={handleContentChange} height={400} preview="edit" />
              )}
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <p>Consejos para el editor:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>
                  Usa <code># Título</code> para títulos principales
                </li>
                <li>
                  Usa <code>## Subtítulo</code> para subtítulos
                </li>
                <li>
                  Usa <code>**texto**</code> para texto en negrita
                </li>
                <li>
                  Usa <code>*texto*</code> para texto en cursiva
                </li>
                <li>
                  Usa <code>![texto alternativo](URL de la imagen)</code> para insertar imágenes
                </li>
                <li>
                  Usa <code>[texto del enlace](URL)</code> para insertar enlaces
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Link href="/admin/blogs">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isNew ? "Crear Blog" : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  )
}
