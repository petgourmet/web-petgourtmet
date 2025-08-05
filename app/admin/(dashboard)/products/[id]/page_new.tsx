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

export default function ProductForm({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  
  // Derived state based on resolved params
  const isNew = resolvedParams?.id === "new"
  
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
    subscription_types: [], // ["weekly", "monthly", "quarterly", "annual"]
    // Descuentos por período
    weekly_discount: 5,
    monthly_discount: 10,
    quarterly_discount: 15,
    annual_discount: 20,
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

  // Effect to resolve params Promise
  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolved = await params
        setResolvedParams(resolved)
      } catch (error) {
        console.error("Error resolving params:", error)
        router.push("/admin/products")
      }
    }

    resolveParams()
  }, [params, router])

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
      if (!resolvedParams) return

      setLoading(true)
      try {
        // Cargar categorías
        const { data: categoriesData } = await supabase.from("categories").select("*").order("name")
        setCategories(categoriesData || [])

        // Si no es un nuevo producto, cargar datos del producto
        if (!isNew) {
          const productId = Number.parseInt(resolvedParams.id)

          // Cargar producto
          const { data: productData, error: productError } = await supabase
            .from("products")
            .select("*")
            .eq("id", productId)
            .single()

          if (productError) throw productError
          setProduct(productData || {})

          // Inicializar subscriptionTypes si existen
          if (productData?.subscription_types && Array.isArray(productData.subscription_types)) {
            setSubscriptionTypes(productData.subscription_types)
          }

          // Si hay soporte para múltiples categorías, cargarlas
          if (multiCategorySupport) {
            try {
              const { data: productCategoriesData } = await supabase
                .from("product_categories")
                .select("category_id")
                .eq("product_id", productId)

              if (productCategoriesData && productCategoriesData.length > 0) {
                setSelectedCategories(productCategoriesData.map((pc) => pc.category_id))
              } else {
                // Si no hay categorías asignadas pero existe category_id, usarlo como categoría única
                if (productData?.category_id) {
                  setSelectedCategories([productData.category_id])
                }
              }
            } catch (error) {
              console.error("Error al cargar categorías múltiples:", error)
              // Usar la categoría única como fallback
              if (productData?.category_id) {
                setSelectedCategories([productData.category_id])
              }
            }
          } else {
            // Si no hay soporte para múltiples categorías, usar la categoría única
            if (productData?.category_id) {
              setSelectedCategories([productData.category_id])
            }
          }

          // Cargar tamaños del producto
          const { data: sizesData } = await supabase.from("product_sizes").select("*").eq("product_id", productId)
          setProductSizes(sizesData?.length ? sizesData : [{ weight: "", price: 0, stock: 0 }])

          // Cargar imágenes del producto
          const { data: imagesData } = await supabase.from("product_images").select("*").eq("product_id", productId)

          if (imagesData && imagesData.length > 0) {
            setProductImages(imagesData)
            setAdditionalImages(
              imagesData.map((img) => ({
                src: img.url || "",
                alt: img.alt || "",
              })),
            )
          } else {
            setProductImages([{ url: "", alt: "" }])
            setAdditionalImages([])
          }

          // Intentar cargar características del producto
          try {
            const { data: featuresData } = await supabase
              .from("product_features")
              .select("*")
              .eq("product_id", productId)

            if (featuresData && featuresData.length > 0) {
              setProductFeatures(featuresData)
            }
          } catch (error) {
            console.log("Tabla product_features no disponible aún:", error)
          }

          // Intentar cargar reseñas del producto
          try {
            const { data: reviewsData } = await supabase
              .from("product_reviews")
              .select("*")
              .eq("product_id", productId)
              .order("created_at", { ascending: false })

            if (reviewsData && reviewsData.length > 0) {
              setProductReviews(reviewsData)
            }
          } catch (error) {
            console.log("Tabla product_reviews no disponible aún:", error)
          }
        } else {
          // Si es un nuevo producto, inicializar additionalImages con un array vacío
          setAdditionalImages([])
        }
      } catch (error) {
        console.error("Error al cargar datos:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del producto. Por favor, inténtalo de nuevo.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [resolvedParams, isNew, multiCategorySupport])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    if (!resolvedParams) {
      setSaving(false)
      return
    }

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

        if (error) {
          console.error("Error al verificar slug:", error)
          throw error
        }        // Si no existe o es el mismo producto que estamos editando
        if (!data || (data && !isNew && !isNaN(Number.parseInt(resolvedParams.id)) && data.id === Number.parseInt(resolvedParams.id))) {
          slugExists = false
        } else {
          // El slug existe, añadir contador
          slugCounter++
          finalSlug = `${baseSlug}-${slugCounter}`
        }

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

      let productId: number

      if (isNew) {
        // Crear nuevo producto
        const { data, error } = await supabase.from("products").insert([productData]).select()
        if (error) throw error
        productId = data[0].id      } else {
        // Actualizar producto existente
        productId = Number.parseInt(resolvedParams.id)
        
        // Verificar que el productId sea válido
        if (isNaN(productId)) {
          throw new Error(`ID de producto inválido: ${resolvedParams.id}`)
        }
        
        const { error } = await supabase.from("products").update(productData).eq("id", productId)
        if (error) throw error
      }

      // Resto de la lógica de guardado...
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

  // Don't render until params are resolved
  if (!resolvedParams || loading) {
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
              <Link href="/admin/login">
                <Button variant="outline" size="sm">
                  Ir a iniciar sesión
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end space-x-4">
        <Link href="/admin/products">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={saving || !isAuthenticated || !isAdmin}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isNew ? "Crear Producto" : "Guardar Cambios"}
        </Button>
      </div>
    </div>
  )
}
