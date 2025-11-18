"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import type { Product, Category, ProductSize, ProductImage, ProductFeature, ProductReview } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, ArrowLeft, Plus, X, ShieldAlert, Info, Star, ImageIcon, Trash, Percent } from "lucide-react"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { slugify } from "@/lib/utils"
import { CloudinaryUploader } from "@/components/cloudinary-uploader"
import Image from "next/image"

const FEATURE_COLORS = [
  { name: "Verde pastel", value: "pastel-green" },
  { name: "Azul pastel", value: "pastel-blue" },
  { name: "Amarillo pastel", value: "pastel-yellow" },
  { name: "Primario", value: "primary" },
  { name: "Secundario", value: "secondary" },
  { name: "Gris", value: "gray" },
]

export default function ProductForm() {
  const router = useRouter()
  const isNew = true // Esta página siempre es para crear un nuevo producto
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
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
    slug: "",
    rating: 4.5,
    reviews_count: 10,
    sale_type: "unit", // "unit" o "weight"
    weight_reference: "", // ej: "por kilogramo"
    subscription_available: false,
    subscription_types: [], // ["weekly", "biweekly", "monthly", "quarterly", "annual"]
    // Descuentos por período - sin valores por defecto
    weekly_discount: undefined,
    biweekly_discount: undefined,
    monthly_discount: undefined,
    quarterly_discount: undefined,
    annual_discount: undefined,
  })
  const [productSizes, setProductSizes] = useState<Partial<ProductSize>[]>([{ weight: "", price: 0, stock: 0 }])
  const [productImages, setProductImages] = useState<Partial<ProductImage>[]>([{ url: "", alt: "" }])
  const [productFeatures, setProductFeatures] = useState<Partial<ProductFeature>[]>([
    { name: "", color: "pastel-green" },
  ])
  const [productReviews, setProductReviews] = useState<Partial<ProductReview>[]>([
    { rating: 5, user_name: "Cliente satisfecho", comment: "¡Excelente producto!" },
    { rating: 4, user_name: "Cliente regular", comment: "Buen producto, lo recomiendo." },
  ])
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("basic")
  const [additionalImages, setAdditionalImages] = useState<{ src: string; alt: string }[]>([])

  // Para futura implementación de múltiples categorías
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [multiCategorySupport, setMultiCategorySupport] = useState(false)

  const [subscriptionTypes, setSubscriptionTypes] = useState<string[]>([])
  const [saleType, setSaleType] = useState<"unit" | "weight">("unit")

  // Verificar si existe la tabla product_categories
  useEffect(() => {
    async function checkMultiCategorySupport() {
      try {
        const { error } = await supabase.from("product_categories").select("id").limit(1)
        if (!error) {
          setMultiCategorySupport(true)
        }
      } catch (error) {
        console.log("Soporte para múltiples categorías no disponible aún")
      }
    }

    checkMultiCategorySupport()
  }, [])

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

        // Verificar si el usuario es administrador consultando la base de datos
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        
        if (profileError) {
          console.error('Error verificando rol de usuario:', profileError)
          setIsAdmin(false)
        } else {
          setIsAdmin(profile?.role === 'admin')
        }
        
        console.log("Estado de autenticación:", {
          isAuthenticated: true,
          isAdmin: profile?.role === 'admin',
        })
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
        const { data: categoriesData } = await supabase.from("categories").select("*").order("name")

        setCategories(categoriesData || [])

        // Para productos nuevos, inicializar additionalImages con un array vacío
        setAdditionalImages([])
      } catch (error) {
        console.error("Error al cargar datos:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos. Por favor, inténtalo de nuevo.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [multiCategorySupport])

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setProduct({
      ...product,
      [name]: type === "number" ? (value === "" ? 0 : Number.parseFloat(value) || 0) : value,
    })
  }

  const handleCheckboxChange = (checked: boolean) => {
    setProduct({
      ...product,
      featured: checked,
    })
  }

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, categoryId])
    } else {
      setSelectedCategories(selectedCategories.filter((id) => id !== categoryId))
    }
  }

  const handleSingleCategoryChange = (value: string) => {
    const categoryId = Number.parseInt(value)
    setProduct({
      ...product,
      category_id: categoryId,
    })
    // También actualizar selectedCategories para mantener consistencia
    setSelectedCategories([categoryId])
  }

  const handleSizeChange = (index: number, field: keyof ProductSize, value: string | number) => {
    const newSizes = [...productSizes]
    newSizes[index] = {
      ...newSizes[index],
      [field]: field === "weight" ? value : (value === "" ? 0 : Number.parseFloat(value as string) || 0),
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

  const handleFeatureChange = (index: number, field: keyof ProductFeature, value: string) => {
    const newFeatures = [...productFeatures]
    newFeatures[index] = {
      ...newFeatures[index],
      [field]: value,
    }
    setProductFeatures(newFeatures)
  }

  const addFeature = () => {
    setProductFeatures([...productFeatures, { name: "", color: "pastel-green" }])
  }

  const removeFeature = (index: number) => {
    const newFeatures = [...productFeatures]
    newFeatures.splice(index, 1)
    setProductFeatures(newFeatures.length ? newFeatures : [{ name: "", color: "pastel-green" }])
  }

  const handleReviewChange = (index: number, field: keyof ProductReview, value: string | number) => {
    const newReviews = [...productReviews]
    newReviews[index] = {
      ...newReviews[index],
      [field]: field === "rating" ? (value === "" ? 0 : Number.parseFloat(value as string) || 0) : value,
    }
    setProductReviews(newReviews)
  }

  const addReview = () => {
    setProductReviews([
      ...productReviews,
      { rating: 5, user_name: "Nuevo cliente", comment: "Comentario de la reseña" },
    ])
  }

  const removeReview = (index: number) => {
    const newReviews = [...productReviews]
    newReviews.splice(index, 1)
    setProductReviews(
      newReviews.length ? newReviews : [{ rating: 5, user_name: "Nuevo cliente", comment: "Comentario de la reseña" }],
    )
  }

  const handleFileUploaded = (url: string) => {
    console.log("Archivo subido exitosamente:", url)
    setUploadedImageUrl(url)
    setProduct({
      ...product,
      image: url,
    })
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // Añadir justo antes del try en handleSubmit
    console.log("Imágenes a guardar:", additionalImages)

    try {
      // Verificar autenticación antes de continuar
      if (!isAuthenticated) {
        toast({
          title: "Error de autenticación",
          description: "Debes iniciar sesión para guardar productos.",
          variant: "destructive",
        })
        setSaving(false)
        return
      }

      if (!isAdmin) {
        toast({
          title: "Error de permisos",
          description: "No tienes permisos para guardar productos. Se requiere rol de administrador.",
          variant: "destructive",
        })
        setSaving(false)
        return
      }

      // Verificar que se haya seleccionado al menos una categoría
      if (selectedCategories.length === 0 && !product.category_id) {
        toast({
          title: "Error de validación",
          description: "Debes seleccionar al menos una categoría para el producto.",
          variant: "destructive",
        })
        setSaving(false)
        return
      }

      // Usar la imagen subida o la existente
      const imageUrl = uploadedImageUrl || product.image

      // Generar slug base a partir del nombre si no existe
      const baseSlug = product.slug || slugify(product.name || "")

      // Verificar si el slug ya existe (excepto para el producto actual en caso de edición)
      let slugExists = true
      let slugCounter = 0
      let finalSlug = baseSlug

      while (slugExists) {
        // Consultar si el slug existe
        const { data, error } = await supabase.from("products").select("id").eq("slug", finalSlug).maybeSingle()

        // Si hay error en la consulta
        if (error) {
          console.error("Error al verificar slug:", error)
          throw error
        }

        // Si no existe (para productos nuevos siempre será false ya que isNew es true)
        if (!data) {
          slugExists = false
        } else {
          // El slug existe, añadir contador
          slugCounter++
          finalSlug = `${baseSlug}-${slugCounter}`
        }

        // Evitar bucle infinito (por seguridad)
        if (slugCounter > 100) {
          throw new Error("No se pudo generar un slug único después de 100 intentos")
        }
      }

      // Si estamos usando el sistema de categoría única, asegurarse de que category_id esté establecido
      if (!multiCategorySupport && selectedCategories.length > 0) {
        product.category_id = selectedCategories[0]
      }

      const productData = {
        ...product,
        image: imageUrl,
        slug: finalSlug,
      }

      // Crear nuevo producto
      const { data, error } = await supabase.from("products").insert([productData]).select()

      if (error) throw error
      const productId = data[0].id

      // Gestionar categorías del producto si hay soporte para múltiples categorías
      if (multiCategorySupport && selectedCategories.length > 0) {
        try {
          // Eliminar categorías existentes
          if (!isNew) {
            await supabase.from("product_categories").delete().eq("product_id", productId)
          }

          // Insertar nuevas categorías
          const productCategories = selectedCategories.map((categoryId) => ({
            product_id: productId,
            category_id: categoryId,
          }))

          const { error: categoriesError } = await supabase.from("product_categories").insert(productCategories)

          if (categoriesError) throw categoriesError
        } catch (error) {
          console.error("Error al gestionar categorías múltiples:", error)
          // Si falla, al menos tenemos la categoría principal guardada en el producto
        }
      }

      // Gestionar características del producto
      try {
        // Eliminar características existentes
        if (!isNew) {
          await supabase.from("product_features").delete().eq("product_id", productId)
        }

        // Filtrar características vacías
        const validFeatures = productFeatures.filter((feature) => feature.name && feature.name.trim() !== "")

        if (validFeatures.length > 0) {
          // Insertar nuevas características
          const featuresWithProductId = validFeatures.map((feature) => ({
            product_id: productId,
            name: feature.name,
            color: feature.color || "pastel-green",
          }))

          const { error: featuresError } = await supabase.from("product_features").insert(featuresWithProductId)

          if (featuresError) {
            console.error("Error al guardar características:", featuresError)
            toast({
              title: "Advertencia",
              description: "Algunas características del producto no se pudieron guardar.",
              variant: "warning",
            })
          }
        }
      } catch (error) {
        console.error("Error al gestionar características:", error)
        toast({
          title: "Advertencia",
          description: "Ocurrió un error al procesar las características del producto.",
          variant: "warning",
        })
      }

      // Gestionar tamaños del producto
      try {
        // Eliminar tamaños existentes
        if (!isNew) {
          await supabase.from("product_sizes").delete().eq("product_id", productId)
        }

        // Filtrar tamaños vacíos
        const validSizes = productSizes.filter((size) => size.weight && size.weight.trim() !== "")

        if (validSizes.length > 0) {
          // Insertar nuevos tamaños
          const sizesWithProductId = validSizes.map((size) => ({
            product_id: productId,
            weight: size.weight,
            price: size.price || 0,
            stock: size.stock || 0,
          }))

          const { error: sizesError } = await supabase.from("product_sizes").insert(sizesWithProductId)

          if (sizesError) {
            console.error("Error al guardar tamaños:", sizesError)
            toast({
              title: "Advertencia",
              description: "Algunos tamaños del producto no se pudieron guardar.",
              variant: "warning",
            })
          }
        }
      } catch (error) {
        console.error("Error al gestionar tamaños:", error)
        toast({
          title: "Advertencia",
          description: "Ocurrió un error al procesar los tamaños del producto.",
          variant: "warning",
        })
      }

      toast({
        title: "Éxito",
        description: isNew ? "Producto creado correctamente" : "Producto actualizado correctamente",
      })

      // Redirigir a la lista de productos
      router.push("/admin/products")
    } catch (error: any) {
      console.error("Error al guardar producto:", error)
      toast({
        title: "Error",
        description: `No se pudo guardar el producto: ${error.message || "Error desconocido"}`,
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
        <Link href="/admin/products" className="mr-4">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{isNew ? "Nuevo Producto" : "Editar Producto"}</h1>
      </div>

      {!isAuthenticated && (
        <Alert variant="destructive" className="mb-6">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>No has iniciado sesión</AlertTitle>
          <AlertDescription>
            Debes iniciar sesión para poder crear o editar productos.
            <div className="mt-2">
              <Link href="/auth/login">
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
            No tienes permisos de administrador para crear o editar productos. Contacta al administrador del sistema
            para solicitar acceso.
          </AlertDescription>
        </Alert>
      )}

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Vista previa del producto</AlertTitle>
        <AlertDescription>
          Puedes ver cómo se verá el producto en la tienda en la pestaña "Vista previa".
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Información Básica</TabsTrigger>
          <TabsTrigger value="images">Imágenes</TabsTrigger>
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="preview">Vista Previa</TabsTrigger>
        </TabsList>
        <TabsContent value="basic">
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
                  <Label htmlFor="slug">URL amigable (slug)</Label>
                  <Input
                    id="slug"
                    name="slug"
                    value={product.slug || ""}
                    onChange={handleProductChange}
                    placeholder="url-amigable-del-producto"
                  />
                  <p className="text-xs text-gray-500">
                    Si lo dejas vacío, se generará automáticamente a partir del nombre.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Categoría</Label>
                {multiCategorySupport ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border rounded-md p-4">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category.id}`}
                          checked={selectedCategories.includes(category.id)}
                          onCheckedChange={(checked) => handleCategoryChange(category.id, checked as boolean)}
                        />
                        <Label htmlFor={`category-${category.id}`} className="cursor-pointer">
                          {category.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Select value={product.category_id?.toString()} onValueChange={handleSingleCategoryChange} required>
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
                )}
                {multiCategorySupport && selectedCategories.length === 0 && (
                  <p className="text-xs text-red-500">Debes seleccionar al menos una categoría.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={product.description || ""}
                  onChange={handleProductChange}
                  rows={6}
                  placeholder="Describe el producto detalladamente.&#10;&#10;Puedes usar múltiples líneas para&#10;- Organizar la información&#10;- Crear listas&#10;- Separar párrafos"
                  className="resize-y min-h-[120px]"
                />
                <p className="text-xs text-gray-500">
                  💡 Tip: Usa saltos de línea para organizar la información. El formato se preservará en la web.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo de Venta</Label>
                  <Select
                    value={saleType}
                    onValueChange={(value: "unit" | "weight") => {
                      setSaleType(value)
                      setProduct({ ...product, sale_type: value })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo de venta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unit">Por Unidad</SelectItem>
                      <SelectItem value="weight">Por Peso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {saleType === "weight" && (
                  <div className="space-y-2">
                    <Label htmlFor="weight_reference">Referencia de Peso</Label>
                    <Input
                      id="weight_reference"
                      name="weight_reference"
                      value={product.weight_reference || ""}
                      onChange={handleProductChange}
                      placeholder="ej: por kilogramo, por 500g"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="subscription_available"
                    checked={product.subscription_available || false}
                    onCheckedChange={(checked) => setProduct({ ...product, subscription_available: checked })}
                  />
                  <Label htmlFor="subscription_available">Disponible para Suscripción</Label>
                </div>

                {product.subscription_available && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tipos de Suscripción Disponibles</Label>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        {["weekly", "biweekly", "monthly", "quarterly", "annual"].map((type) => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox
                              id={`subscription-${type}`}
                              checked={subscriptionTypes.includes(type)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSubscriptionTypes([...subscriptionTypes, type])
                                } else {
                                  setSubscriptionTypes(subscriptionTypes.filter((t) => t !== type))
                                }
                                setProduct({
                                  ...product,
                                  subscription_types: checked
                                    ? [...subscriptionTypes, type]
                                    : subscriptionTypes.filter((t) => t !== type),
                                })
                              }}
                            />
                            <Label htmlFor={`subscription-${type}`} className="cursor-pointer">
                              {type === "weekly" 
                                ? "Semanal" 
                                : type === "biweekly" 
                                ? "Quincenal" 
                                : type === "monthly" 
                                  ? "Mensual" 
                                  : type === "quarterly" 
                                    ? "Trimestral" 
                                    : "Anual"}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label>Descuentos por Período de Suscripción</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="weekly_discount">Descuento Semanal (%)</Label>
                          <div className="relative">
                            <Input
                              id="weekly_discount"
                              name="weekly_discount"
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={product.weekly_discount || ''}
                              onChange={handleProductChange}
                              className="pr-8"
                            />
                            <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="biweekly_discount">Descuento Quincenal (%)</Label>
                          <div className="relative">
                            <Input
                              id="biweekly_discount"
                              name="biweekly_discount"
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={product.biweekly_discount || ''}
                              onChange={handleProductChange}
                              className="pr-8"
                            />
                            <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="monthly_discount">Descuento Mensual (%)</Label>
                          <div className="relative">
                            <Input
                              id="monthly_discount"
                              name="monthly_discount"
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={product.monthly_discount || ''}
                              onChange={handleProductChange}
                              className="pr-8"
                            />
                            <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="quarterly_discount">Descuento Trimestral (%)</Label>
                          <div className="relative">
                            <Input
                              id="quarterly_discount"
                              name="quarterly_discount"
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={product.quarterly_discount || ''}
                              onChange={handleProductChange}
                              className="pr-8"
                            />
                            <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="annual_discount">Descuento Anual (%)</Label>
                          <div className="relative">
                            <Input
                              id="annual_discount"
                              name="annual_discount"
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={product.annual_discount || ''}
                              onChange={handleProductChange}
                              className="pr-8"
                            />
                            <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Estos descuentos se aplicarán automáticamente según el período de suscripción seleccionado por
                        el cliente.
                      </p>
                    </div>
                  </div>
                )}
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
                    <Checkbox
                      id="featured"
                      checked={product.featured || false}
                      onCheckedChange={handleCheckboxChange}
                    />
                    <Label htmlFor="featured">Destacado</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images">
          <Card>
            <CardHeader>
              <CardTitle>Imagen Principal</CardTitle>
            </CardHeader>
            <CardContent>
              <CloudinaryUploader
                folder="products"
                onImageUploaded={handleFileUploaded}
                currentImageUrl={product.image || ""}
                maxSizeKB={1024}
                aspectRatio="square"
              />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Imágenes Adicionales</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  addImage()
                  setAdditionalImages([...additionalImages, { src: "", alt: "" }])
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Añadir Imagen
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {additionalImages.map((image, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border p-4 rounded-lg">
                    <div>
                      <CloudinaryUploader
                        onImageUploaded={(url) => {
                          const newImages = [...additionalImages]
                          newImages[index] = { ...newImages[index], src: url }
                          setAdditionalImages(newImages)
                          console.log("Imagen actualizada:", url)
                        }}
                        folder="products"
                        existingImage={image.src}
                        buttonText="Subir Imagen"
                      />
                      {image.src && <p className="text-xs text-gray-500 mt-1 truncate">URL: {image.src}</p>}
                    </div>
                    <div>
                      <Label htmlFor={`alt-${index}`}>Texto Alternativo</Label>
                      <Input
                        id={`alt-${index}`}
                        value={image.alt}
                        onChange={(e) => {
                          const newImages = [...additionalImages]
                          newImages[index] = { ...newImages[index], alt: e.target.value }
                          setAdditionalImages(newImages)
                        }}
                        placeholder="Descripción de la imagen"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          removeImage(index)
                          const newAdditionalImages = [...additionalImages]
                          newAdditionalImages.splice(index, 1)
                          setAdditionalImages(newAdditionalImages.length ? newAdditionalImages : [{ src: "", alt: "" }])
                        }}
                      >
                        <Trash className="h-4 w-4 mr-1" /> Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
                {additionalImages.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No hay imágenes adicionales. Haz clic en "Añadir Imagen" para agregar una.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
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
                  rows={6}
                  placeholder="Información nutricional detallada:&#10;&#10;Proteínas: 20%&#10;Grasas: 10%&#10;Carbohidratos: 5%&#10;Fibra: 3%&#10;Humedad: 12%&#10;Cenizas: 8%&#10;&#10;Valor energético: 350 kcal/100g"
                  className="resize-y min-h-[120px]"
                />
                <p className="text-xs text-gray-500">
                  💡 Tip: Organiza la información nutricional en líneas separadas para mejor legibilidad.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ingredients">Ingredientes</Label>
                <Textarea
                  id="ingredients"
                  name="ingredients"
                  value={product.ingredients || ""}
                  onChange={handleProductChange}
                  rows={6}
                  placeholder="Lista de ingredientes:&#10;&#10;- Carne de res fresca (30%)&#10;- Arroz integral (20%)&#10;- Pollo deshidratado (15%)&#10;- Verduras mixtas (10%)&#10;- Aceite de salmón (5%)&#10;- Vitaminas y minerales&#10;&#10;Sin conservantes artificiales."
                  className="resize-y min-h-[120px]"
                />
                <p className="text-xs text-gray-500">
                  💡 Tip: Lista los ingredientes en orden de cantidad. Usa líneas separadas para mejor presentación.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Características del Producto</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                <Plus className="mr-2 h-4 w-4" /> Añadir Característica
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="flex-1">
                      <Label htmlFor={`feature-name-${index}`}>Nombre</Label>
                      <Input
                        id={`feature-name-${index}`}
                        value={feature.name || ""}
                        onChange={(e) => handleFeatureChange(index, "name", e.target.value)}
                        placeholder="Sin Conservantes"
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`feature-color-${index}`}>Color</Label>
                      <Select
                        value={feature.color || "pastel-green"}
                        onValueChange={(value) => handleFeatureChange(index, "color", value)}
                      >
                        <SelectTrigger id={`feature-color-${index}`}>
                          <SelectValue placeholder="Seleccionar color" />
                        </SelectTrigger>
                        <SelectContent>
                          {FEATURE_COLORS.map((color) => (
                            <SelectItem key={color.value} value={color.value}>
                              {color.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-6 text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => removeFeature(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
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
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Vista Previa del Producto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                  {/* Galería de imágenes */}
                  <div className="space-y-4">
                    <div className="aspect-square relative rounded-xl overflow-hidden bg-gray-100">
                      {product.image ? (
                        <Image
                          src={product.image || "/placeholder.svg"}
                          alt={product.name || ""}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <ImageIcon className="h-16 w-16" />
                        </div>
                      )}
                    </div>

                    {productImages.length > 0 && productImages[0].url && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {productImages
                          .filter((img) => img.url)
                          .map((img, idx) => (
                            <div
                              key={idx}
                              className="relative w-20 h-20 rounded-lg overflow-hidden cursor-pointer border-2 border-transparent"
                            >
                              <Image src={img.url || ""} alt={img.alt || ""} fill className="object-cover" />
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Información del producto */}
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-primary font-display mb-2">
                        {product.name || "Nombre del producto"}
                      </h2>

                      {product.rating !== undefined && (
                        <div className="flex items-center mb-4">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < Math.floor(product.rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          {product.reviews_count !== undefined && (
                            <span className="ml-2 text-sm text-gray-600">({product.reviews_count} reseñas)</span>
                          )}
                        </div>
                      )}

                      <div className="text-gray-600 mb-4 whitespace-pre-wrap">
                        {product.description || "Descripción del producto"}
                      </div>

                      {productFeatures.length > 0 && productFeatures[0].name && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {productFeatures
                            .filter((feature) => feature.name)
                            .map((feature, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-1 rounded-full text-xs font-medium bg-${feature.color}/10 text-${feature.color} border border-${feature.color}/30`}
                              >
                                {feature.name}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Selección de tamaño */}
                    {productSizes.length > 0 && productSizes[0].weight && (
                      <div>
                        <h3 className="font-bold mb-2">Tamaño</h3>
                        <div className="flex flex-wrap gap-2">
                          {productSizes
                            .filter((size) => size.weight)
                            .map((size, idx) => (
                              <button
                                key={idx}
                                className={`rounded-full px-4 py-2 border border-primary ${
                                  idx === 0 ? "bg-primary text-white" : "text-primary"
                                }`}
                              >
                                {size.weight} - €{size.price?.toFixed(2)}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Opción de suscripción */}
                    <div>
                      <h3 className="font-bold mb-2">Tipo de compra</h3>
                      <div className="flex gap-2">
                        <button className="rounded-full px-4 py-2 bg-primary text-white">Compra única</button>
                        <button className="rounded-full px-4 py-2 border border-primary text-primary">
                          Suscripción (-10%)
                        </button>
                      </div>
                    </div>

                    {/* Cantidad */}
                    <div>
                      <h3 className="font-bold mb-2">Cantidad</h3>
                      <div className="flex items-center gap-2">
                        <button className="rounded-full w-8 h-8 border border-primary text-primary flex items-center justify-center">
                          -
                        </button>
                        <span className="w-8 text-center">1</span>
                        <button className="rounded-full w-8 h-8 border border-primary text-primary flex items-center justify-center">
                          +
                        </button>
                      </div>
                    </div>

                    {/* Precio y botón de añadir al carrito */}
                    <div className="flex justify-between items-center pt-4 border-t">
                      <div>
                        <p className="text-sm text-gray-600">Precio total:</p>
                        <p className="text-2xl font-bold text-primary">€{product.price?.toFixed(2) || "0.00"}</p>
                      </div>
                      <button className="rounded-full bg-primary hover:bg-primary/90 text-white px-6 py-2">
                        Añadir al carrito
                      </button>
                    </div>

                    {/* Pestañas de información adicional */}
                    {(product.ingredients || product.nutritional_info) && (
                      <div className="mt-6 border-t pt-4">
                        <Tabs defaultValue="ingredients" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="ingredients">Ingredientes</TabsTrigger>
                            <TabsTrigger value="nutritional">Información Nutricional</TabsTrigger>
                          </TabsList>
                          <TabsContent value="ingredients" className="p-4 text-sm text-gray-600">
                            <div className="whitespace-pre-wrap">
                              {product.ingredients || "Información no disponible"}
                            </div>
                          </TabsContent>
                          <TabsContent value="nutritional" className="p-4 text-sm text-gray-600">
                            <div className="whitespace-pre-wrap">
                              {product.nutritional_info || "Información no disponible"}
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-4">
        <Link href="/admin/products">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={saving || !isAuthenticated || !isAdmin || (multiCategorySupport && selectedCategories.length === 0)}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isNew ? "Crear Producto" : "Guardar Cambios"}
        </Button>
      </div>
    </div>
  )
}
