"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import Link from "next/link"
import { CloudinaryUploader } from "@/components/cloudinary-uploader"
import { toast } from "@/components/ui/use-toast"
import type { Category } from "@/lib/supabase/types"

export default function EditCategoryPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const isNewCategory = params.id === "new"
  const pageTitle = isNewCategory ? "Nueva Categoría" : "Editar Categoría"

  const [category, setCategory] = useState<Partial<Category>>({
    name: "",
    description: "",
    slug: "",
    image: "",
    color: "#3B82F6", // Color por defecto
  })
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [initialLoading, setInitialLoading] = useState(!isNewCategory)

  useEffect(() => {
    if (!isNewCategory) {
      fetchCategory()
    } else {
      setInitialLoading(false)
    }
  }, [params.id])

  async function fetchCategory() {
    try {
      const { data, error } = await supabase.from("categories").select("*").eq("id", params.id).single()

      if (error) throw error

      if (data) {
        setCategory(data)
      }
    } catch (error) {
      console.error("Error al cargar la categoría:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar la información de la categoría",
        variant: "destructive",
      })
    } finally {
      setInitialLoading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setCategory((prev) => ({ ...prev, [name]: value }))
  }

  function handleImageUploaded(url: string) {
    setCategory((prev) => ({ ...prev, image: url }))
    toast({
      title: "Imagen subida",
      description: "La imagen se ha subido correctamente",
    })
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "-")
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value
    setCategory((prev) => ({
      ...prev,
      name,
      // Solo actualizar el slug automáticamente si está vacío o si no se ha editado manualmente
      slug: prev.slug === "" || prev.slug === generateSlug(prev.name || "") ? generateSlug(name) : prev.slug,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)

    try {
      if (!category.name || !category.slug) {
        throw new Error("El nombre y el slug son obligatorios")
      }

      // Verificar si el slug ya existe
      let slugCheckQuery = supabase.from("categories").select("id").eq("slug", category.slug)

      // Si estamos editando una categoría existente, excluimos la categoría actual de la verificación
      if (!isNewCategory) {
        slugCheckQuery = slugCheckQuery.neq("id", params.id)
      }

      const { data: existingCategory, error: slugCheckError } = await slugCheckQuery.maybeSingle()

      if (slugCheckError) throw slugCheckError

      if (existingCategory) {
        throw new Error("Ya existe una categoría con este slug. Por favor, elige otro.")
      }

      let result

      if (isNewCategory) {
        // Crear nueva categoría
        result = await supabase.from("categories").insert([category]).select()
      } else {
        // Actualizar categoría existente
        result = await supabase.from("categories").update(category).eq("id", params.id).select()
      }

      if (result.error) throw result.error

      toast({
        title: "Éxito",
        description: isNewCategory ? "Categoría creada correctamente" : "Categoría actualizada correctamente",
      })

      // Redirigir a la lista de categorías
      router.push("/admin/categories")
      router.refresh()
    } catch (error: any) {
      console.error("Error al guardar la categoría:", error)
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al guardar la categoría",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/categories">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{pageTitle}</h1>
        </div>
        <Button onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              value={category.name || ""}
              onChange={handleNameChange}
              placeholder="Nombre de la categoría"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              value={category.slug || ""}
              onChange={handleChange}
              placeholder="slug-de-la-categoria"
              required
            />
            <p className="text-xs text-gray-500">
              El slug se usa en las URLs. Debe ser único y contener solo letras, números y guiones.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              value={category.description || ""}
              onChange={handleChange}
              placeholder="Descripción de la categoría"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-md border" style={{ backgroundColor: category.color || "#3B82F6" }} />
              <Input
                id="color"
                name="color"
                type="color"
                value={category.color || "#3B82F6"}
                onChange={handleChange}
                className="h-10 w-20"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Label>Imagen</Label>
          <CloudinaryUploader
            onImageUploaded={handleImageUploaded}
            folder="categories"
            currentImageUrl={category.image || ""}
            aspectRatio="square"
            maxSizeKB={500}
            buttonText="Subir imagen de categoría"
          />
        </div>
      </div>
    </div>
  )
}
