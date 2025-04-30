"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import type { Product, Category, ProductSize, ProductImage } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft, Plus, X, Upload } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function ProductForm({ params }: { params: { id: string } }) {
  const router = useRouter()
  const isNew = params.id === "new"
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [product, setProduct] = useState<Partial<Product>>({
    name: "",
    description: "",
    price: 0,
    image: "",
    category_id: 0,
    featured: false,
    stock: 0,
    nutritional_info: "",
    ingredients: "",
  })
  const [productSizes, setProductSizes] = useState<Partial<ProductSize>[]>([{ weight: "", price: 0, stock: 0 }])
  const [productImages, setProductImages] = useState<Partial<ProductImage>[]>([{ url: "", alt: "" }])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        // Cargar categorías
        const { data: categoriesData } = await supabase.from("categories").select("*").order("name")

        setCategories(categoriesData || [])

        // Si no es un nuevo producto, cargar datos del producto
        if (!isNew) {
          const productId = Number.parseInt(params.id)

          // Cargar producto
          const { data: productData, error: productError } = await supabase
            .from("products")
            .select("*")
            .eq("id", productId)
            .single()

          if (productError) throw productError
          setProduct(productData || {})

          // Cargar tamaños del producto
          const { data: sizesData } = await supabase.from("product_sizes").select("*").eq("product_id", productId)

          setProductSizes(sizesData?.length ? sizesData : [{ weight: "", price: 0, stock: 0 }])

          // Cargar imágenes del producto
          const { data: imagesData } = await supabase.from("product_images").select("*").eq("product_id", productId)

          setProductImages(imagesData?.length ? imagesData : [{ url: "", alt: "" }])
        }
      } catch (error) {
        console.error("Error al cargar datos:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isNew, params.id])

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setProduct({
      ...product,
      [name]: type === "number" ? Number.parseFloat(value) : value,
    })
  }

  const handleCheckboxChange = (checked: boolean) => {
    setProduct({
      ...product,
      featured: checked,
    })
  }

  const handleSizeChange = (index: number, field: keyof ProductSize, value: string | number) => {
    const newSizes = [...productSizes]
    newSizes[index] = {
      ...newSizes[index],
      [field]: field === "weight" ? value : Number.parseFloat(value as string),
    }
    setProductSizes(newSizes)
  }

  const addSize = () => {
    setProductSizes([...productSizes, { weight: "", price: 0, stock: 0 }])
  }

  const removeSize = (index: number) => {
    const newSizes = [...productSizes]
    newSizes.splice(index, 1)
    setProductSizes(newSizes.length ? newSizes : [{ weight: "", price: 0, stock: 0 }])
  }

  const handleImageChange = (index: number, field: keyof ProductImage, value: string) => {
    const newImages = [...productImages]
    newImages[index] = {
      ...newImages[index],
      [field]: value,
    }
    setProductImages(newImages)
  }

  const addImage = () => {
    setProductImages([...productImages, { url: "", alt: "" }])
  }

  const removeImage = (index: number) => {
    const newImages = [...productImages]
    newImages.splice(index, 1)
    setProductImages(newImages.length ? newImages : [{ url: "", alt: "" }])
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
    const filePath = `products/${fileName}`

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
      let imageUrl = product.image
      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
      }

      const productData = {
        ...product,
        image: imageUrl,
      }

      let productId = Number.parseInt(params.id)

      if (isNew) {
        // Crear nuevo producto
        const { data, error } = await supabase.from("products").insert([productData]).select()

        if (error) throw error
        productId = data[0].id
      } else {
        // Actualizar producto existente
        const { error } = await supabase.from("products").update(productData).eq("id", productId)

        if (error) throw error
      }

      // Gestionar tamaños del producto
      if (productSizes.length) {
        // Eliminar tamaños existentes
        if (!isNew) {
          await supabase.from("product_sizes").delete().eq("product_id", productId)
        }

        // Insertar nuevos tamaños
        const sizesWithProductId = productSizes.map((size) => ({
          ...size,
          product_id: productId,
        }))

        const { error: sizesError } = await supabase.from("product_sizes").insert(sizesWithProductId)

        if (sizesError) throw sizesError
      }

      // Gestionar imágenes del producto
      if (productImages.length) {
        // Eliminar imágenes existentes
        if (!isNew) {
          await supabase.from("product_images").delete().eq("product_id", productId)
        }

        // Insertar nuevas imágenes
        const imagesWithProductId = productImages.map((image) => ({
          ...image,
          product_id: productId,
        }))

        const { error: imagesError } = await supabase.from("product_images").insert(imagesWithProductId)

        if (imagesError) throw imagesError
      }

      router.push("/admin/products")
    } catch (error) {
      console.error("Error al guardar producto:", error)
      alert("Error al guardar el producto. Por favor, inténtalo de nuevo.")
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
        <Link href="/admin/products" className="mr-4">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{isNew ? "Nuevo Producto" : "Editar Producto"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Producto</Label>
                <Input id="name" name="name" value={product.name} onChange={handleProductChange} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={product.category_id?.toString()}
                  onValueChange={(value) => setProduct({ ...product, category_id: Number.parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
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
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                name="description"
                value={product.description || ""}
                onChange={handleProductChange}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price">Precio Base</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  value={product.price || 0}
                  onChange={handleProductChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  name="stock"
                  type="number"
                  value={product.stock || 0}
                  onChange={handleProductChange}
                  required
                />
              </div>

              <div className="flex items-end space-x-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="featured" checked={product.featured || false} onCheckedChange={handleCheckboxChange} />
                  <Label htmlFor="featured">Destacado</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Imagen Principal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <div className="relative h-40 w-40 overflow-hidden rounded-md border">
                {imagePreview || product.image ? (
                  <Image src={imagePreview || product.image || ""} alt="Vista previa" fill className="object-cover" />
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
                    <span>Subir imagen</span>
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
            <CardTitle>Tamaños y Precios</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addSize}>
              <Plus className="mr-2 h-4 w-4" /> Añadir Tamaño
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {productSizes.map((size, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Label htmlFor={`size-${index}`}>Tamaño/Peso</Label>
                    <Input
                      id={`size-${index}`}
                      value={size.weight || ""}
                      onChange={(e) => handleSizeChange(index, "weight", e.target.value)}
                      placeholder="ej. 500g, 1kg"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor={`price-${index}`}>Precio</Label>
                    <Input
                      id={`price-${index}`}
                      type="number"
                      step="0.01"
                      value={size.price || 0}
                      onChange={(e) => handleSizeChange(index, "price", e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor={`stock-${index}`}>Stock</Label>
                    <Input
                      id={`stock-${index}`}
                      type="number"
                      value={size.stock || 0}
                      onChange={(e) => handleSizeChange(index, "stock", e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-6 text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => removeSize(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Imágenes Adicionales</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addImage}>
              <Plus className="mr-2 h-4 w-4" /> Añadir Imagen
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {productImages.map((image, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Label htmlFor={`image-url-${index}`}>URL de la Imagen</Label>
                    <Input
                      id={`image-url-${index}`}
                      value={image.url || ""}
                      onChange={(e) => handleImageChange(index, "url", e.target.value)}
                      placeholder="https://ejemplo.com/imagen.jpg"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor={`image-alt-${index}`}>Texto Alternativo</Label>
                    <Input
                      id={`image-alt-${index}`}
                      value={image.alt || ""}
                      onChange={(e) => handleImageChange(index, "alt", e.target.value)}
                      placeholder="Descripción de la imagen"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-6 text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información Nutricional e Ingredientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nutritional_info">Información Nutricional</Label>
              <Textarea
                id="nutritional_info"
                name="nutritional_info"
                value={product.nutritional_info || ""}
                onChange={handleProductChange}
                rows={4}
                placeholder="Proteínas: 20%, Grasas: 10%, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ingredients">Ingredientes</Label>
              <Textarea
                id="ingredients"
                name="ingredients"
                value={product.ingredients || ""}
                onChange={handleProductChange}
                rows={4}
                placeholder="Carne de res, arroz integral, etc."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Link href="/admin/products">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isNew ? "Crear Producto" : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  )
}
