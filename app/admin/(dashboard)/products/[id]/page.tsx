"use client"

import type React from "react"
import { use } from "react"

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
import { Loader2, ArrowLeft, Plus, X, ShieldAlert, Info, ImageIcon, Trash, Percent } from "lucide-react"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { slugify } from "@/lib/utils"
import { CloudinaryUploader } from "@/components/cloudinary-uploader"
import Image from "next/image"
import { ProductImageViewer } from "@/components/shared/product-image-viewer"

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
  const resolvedParams = use(params)
  const isNew = resolvedParams.id === "new"
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
    subscription_types: [], // ["weekly", "monthly", "quarterly", "annual"]
    // Descuentos por período - sin valores por defecto
    weekly_discount: undefined,
    monthly_discount: undefined,
    quarterly_discount: undefined,
    annual_discount: undefined,
    biweekly_discount: undefined,
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

  // Efecto para limpiar descuentos cuando se deseleccionan tipos de suscripción
  useEffect(() => {
    const selectedTypes = product.subscription_types || []
    const updatedProduct = { ...product }
    let hasChanges = false

    // Limpiar descuentos para tipos no seleccionados
    if (!selectedTypes.includes('weekly') && product.weekly_discount !== undefined) {
      updatedProduct.weekly_discount = undefined
      hasChanges = true
    }
    if (!selectedTypes.includes('biweekly') && product.biweekly_discount !== undefined) {
      updatedProduct.biweekly_discount = undefined
      hasChanges = true
    }
    if (!selectedTypes.includes('monthly') && product.monthly_discount !== undefined) {
      updatedProduct.monthly_discount = undefined
      hasChanges = true
    }
    if (!selectedTypes.includes('quarterly') && product.quarterly_discount !== undefined) {
      updatedProduct.quarterly_discount = undefined
      hasChanges = true
    }
    if (!selectedTypes.includes('annual') && product.annual_discount !== undefined) {
      updatedProduct.annual_discount = undefined
      hasChanges = true
    }

    if (hasChanges) {
      setProduct(updatedProduct)
    }
  }, [product.subscription_types])

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

        // Verificar si el usuario es administrador basado en su email
        // Esto evita la recursión al no consultar la tabla profiles
        const adminEmails = ["admin@petgourmet.com", "cristoferscalante@gmail.com"]
        setIsAdmin(adminEmails.includes(session.user.email || ""))
        console.log("Estado de autenticación:", {
          isAuthenticated: true,
          isAdmin: adminEmails.includes(session.user.email || ""),
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
          if (productData?.subscription_types) {
            try {
              // Si es un string JSON, parsearlo
              if (typeof productData.subscription_types === 'string') {
                const parsedTypes = JSON.parse(productData.subscription_types)
                setSubscriptionTypes(Array.isArray(parsedTypes) ? parsedTypes : [])
              } else if (Array.isArray(productData.subscription_types)) {
                setSubscriptionTypes(productData.subscription_types)
              } else {
                setSubscriptionTypes([])
              }
            } catch (error) {
              console.error('Error parsing subscription_types:', error)
              setSubscriptionTypes([])
            }
          } else {
            setSubscriptionTypes([])
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

            // También actualizar additionalImages
            setAdditionalImages(
              imagesData.map((img) => ({
                src: img.url || "",
                alt: img.alt || "",
              })),
            )
          } else {
            setProductImages([{ url: "", alt: "" }])
            setAdditionalImages([{ src: "", alt: "" }])
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
  }, [isNew, resolvedParams.id, multiCategorySupport])

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setProduct({
      ...product,
      [name]: type === "number" ? (value === "" ? undefined : Number.parseFloat(value) || 0) : value,
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

        // Si no existe o es el mismo producto que estamos editando
        if (!data || (data && !isNew && data.id === Number.parseInt(resolvedParams.id))) {
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

      // Validar y limpiar descuentos según tipos de suscripción seleccionados
      const cleanedProduct = { ...product }
      const selectedSubscriptionTypes = product.subscription_types || []
      
      // Solo mantener descuentos para tipos de suscripción seleccionados
      if (!selectedSubscriptionTypes.includes('weekly')) {
        delete cleanedProduct.weekly_discount
      }
      if (!selectedSubscriptionTypes.includes('biweekly')) {
        delete cleanedProduct.biweekly_discount
      }
      if (!selectedSubscriptionTypes.includes('monthly')) {
        delete cleanedProduct.monthly_discount
      }
      if (!selectedSubscriptionTypes.includes('quarterly')) {
        delete cleanedProduct.quarterly_discount
      }
      if (!selectedSubscriptionTypes.includes('annual')) {
        delete cleanedProduct.annual_discount
      }

      // Crear productData con solo los campos necesarios y válidos
      const productData = {
        name: cleanedProduct.name || '',
        description: cleanedProduct.description || '',
        price: Number(cleanedProduct.price) || 0,
        image: imageUrl || '',
        slug: finalSlug || '',
        category_id: cleanedProduct.category_id || null,
        featured: Boolean(cleanedProduct.featured),
        stock: Number(cleanedProduct.stock) || 0,
        nutritional_info: cleanedProduct.nutritional_info || null,
        ingredients: cleanedProduct.ingredients || null,
        rating: Number(cleanedProduct.rating) || null,
        reviews_count: Number(cleanedProduct.reviews_count) || null,
        sale_type: cleanedProduct.sale_type || 'unit',
        weight_reference: cleanedProduct.weight_reference || null,
        subscription_available: Boolean(cleanedProduct.subscription_available),
        subscription_types: JSON.stringify(Array.isArray(cleanedProduct.subscription_types) ? cleanedProduct.subscription_types : []),
        // Solo incluir descuentos si están definidos y son válidos
        ...(selectedSubscriptionTypes.includes('weekly') && cleanedProduct.weekly_discount !== undefined && cleanedProduct.weekly_discount !== null ? { weekly_discount: Number(cleanedProduct.weekly_discount) } : {}),
        ...(selectedSubscriptionTypes.includes('biweekly') && cleanedProduct.biweekly_discount !== undefined && cleanedProduct.biweekly_discount !== null ? { biweekly_discount: Number(cleanedProduct.biweekly_discount) } : {}),
        ...(selectedSubscriptionTypes.includes('monthly') && cleanedProduct.monthly_discount !== undefined && cleanedProduct.monthly_discount !== null ? { monthly_discount: Number(cleanedProduct.monthly_discount) } : {}),
        ...(selectedSubscriptionTypes.includes('quarterly') && cleanedProduct.quarterly_discount !== undefined && cleanedProduct.quarterly_discount !== null ? { quarterly_discount: Number(cleanedProduct.quarterly_discount) } : {}),
        ...(selectedSubscriptionTypes.includes('annual') && cleanedProduct.annual_discount !== undefined && cleanedProduct.annual_discount !== null ? { annual_discount: Number(cleanedProduct.annual_discount) } : {}),
      }

      let productId: number

      console.log("Iniciando guardado de producto:", { isNew, productData })

      if (isNew) {
        // Crear nuevo producto
        console.log("Creando nuevo producto...")
        
        // Validar que tenemos datos mínimos requeridos
        if (!productData.name || !productData.name.trim()) {
          throw new Error("El nombre del producto es requerido")
        }
        
        if (!productData.slug || !productData.slug.trim()) {
          throw new Error("El slug del producto es requerido")
        }
        
        // Validar que el precio sea válido
        if (productData.price < 0) {
          throw new Error("El precio del producto debe ser mayor o igual a 0")
        }
        
        // Limpiar datos undefined y null, pero mantener strings vacíos para campos requeridos
        const cleanProductData = Object.fromEntries(
          Object.entries(productData).filter(([key, value]) => {
            // Mantener campos requeridos aunque sean strings vacíos
            const requiredFields = ['name', 'description', 'price', 'image', 'slug', 'category_id', 'featured', 'stock', 'sale_type', 'subscription_available', 'subscription_types']
            if (requiredFields.includes(key)) {
              return value !== undefined && value !== null
            }
            // Para otros campos, filtrar undefined, null y strings vacíos
            return value !== undefined && value !== null && value !== ''
          })
        )
        
        // Verificar que tenemos datos para insertar
        if (Object.keys(cleanProductData).length === 0) {
          throw new Error("No hay datos válidos para crear el producto")
        }
        
        console.log("Datos del nuevo producto:", {
          originalData: productData,
          cleanedData: cleanProductData,
          dataKeys: Object.keys(cleanProductData),
          dataCount: Object.keys(cleanProductData).length,
          productState: {
            name: product.name,
            description: product.description,
            price: product.price,
            slug: product.slug
          }
        })
        
        const { data, error } = await supabase.from("products").insert([cleanProductData]).select()

        if (error) {
          console.error("Error al insertar producto:", {
            error,
            productData: cleanProductData,
            errorMessage: error?.message,
            errorDetails: error?.details,
            errorHint: error?.hint,
            errorCode: error?.code,
            dataKeys: Object.keys(cleanProductData),
            dataValues: Object.values(cleanProductData)
          })
          throw { 
            message: `Error al insertar producto: ${error.message || 'Error desconocido'}`,
            originalError: error,
            type: 'INSERT_ERROR'
          }
        }
        
        if (!data || data.length === 0) {
          throw new Error("No se recibieron datos del producto creado")
        }
        
        productId = data[0].id
        console.log("Producto creado con ID:", productId)
      } else {
        // Actualizar producto existente
        productId = Number.parseInt(resolvedParams.id)
        console.log("Actualizando producto existente con ID:", productId)
        
        // Validar que el productId sea válido
        if (!productId || isNaN(productId)) {
          throw new Error(`ID de producto inválido: ${resolvedParams.id}`)
        }
        
        // Validar que tenemos datos mínimos requeridos
        if (!productData.name || !productData.name.trim()) {
          throw new Error("El nombre del producto es requerido")
        }
        
        if (!productData.slug || !productData.slug.trim()) {
          throw new Error("El slug del producto es requerido")
        }
        
        // Limpiar datos undefined y null, pero mantener strings vacíos para campos requeridos
        const cleanProductData = Object.fromEntries(
          Object.entries(productData).filter(([key, value]) => {
            // Mantener campos requeridos aunque sean strings vacíos
            const requiredFields = ['name', 'description', 'price', 'image', 'slug', 'category_id', 'featured', 'stock', 'sale_type', 'subscription_available', 'subscription_types']
            if (requiredFields.includes(key)) {
              return value !== undefined && value !== null
            }
            // Para otros campos, filtrar undefined, null y strings vacíos
            return value !== undefined && value !== null && value !== ''
          })
        )
        
        // Verificar que tenemos datos para actualizar
        if (Object.keys(cleanProductData).length === 0) {
          throw new Error("No hay datos válidos para actualizar el producto")
        }
        
        console.log("Datos del producto a actualizar:", {
          productId,
          originalData: productData,
          cleanedData: cleanProductData,
          dataKeys: Object.keys(cleanProductData),
          dataCount: Object.keys(cleanProductData).length,
          productState: {
            name: product.name,
            description: product.description,
            price: product.price,
            slug: product.slug
          }
        })
        
        const { error } = await supabase.from("products").update(cleanProductData).eq("id", productId)

        if (error) {
          console.error("Error al actualizar producto:", {
            error,
            productId,
            productData: cleanProductData,
            errorMessage: error?.message,
            errorDetails: error?.details,
            errorHint: error?.hint,
            errorCode: error?.code,
            dataKeys: Object.keys(cleanProductData),
            dataValues: Object.values(cleanProductData)
          })
          throw { 
            message: `Error al actualizar producto: ${error.message || 'Error desconocido'}`,
            originalError: error,
            type: 'UPDATE_ERROR'
          }
        }
        console.log("Producto actualizado exitosamente")
      }

      // Gestionar categorías del producto si hay soporte para múltiples categorías
      if (multiCategorySupport && selectedCategories.length > 0) {
        try {
          console.log("Gestionando categorías múltiples:", selectedCategories)
          // Eliminar categorías existentes
          if (!isNew) {
            console.log("Eliminando categorías existentes...")
            await supabase.from("product_categories").delete().eq("product_id", productId)
          }

          // Insertar nuevas categorías
          const productCategories = selectedCategories.map((categoryId) => ({
            product_id: productId,
            category_id: categoryId,
          }))

          console.log("Insertando nuevas categorías:", productCategories)
          const { error: categoriesError } = await supabase.from("product_categories").insert(productCategories)

          if (categoriesError) {
            console.error("Error al insertar categorías:", categoriesError)
            throw categoriesError
          }
          console.log("Categorías gestionadas exitosamente")
        } catch (error) {
          console.error("Error al gestionar categorías múltiples:", error)
          // Si falla, al menos tenemos la categoría principal guardada en el producto
        }
      }

      // Gestionar características del producto
      try {
        console.log("Gestionando características del producto:", productFeatures)
        // Eliminar características existentes
        if (!isNew) {
          console.log("Eliminando características existentes...")
          await supabase.from("product_features").delete().eq("product_id", productId)
        }

        // Filtrar características vacías
        const validFeatures = productFeatures.filter((feature) => feature.name && feature.name.trim() !== "")
        console.log("Características válidas:", validFeatures)

        if (validFeatures.length > 0) {
          // Insertar nuevas características
          const featuresWithProductId = validFeatures.map((feature) => ({
            product_id: productId,
            name: feature.name,
            color: feature.color || "pastel-green",
          }))

          console.log("Insertando características:", featuresWithProductId)
          const { error: featuresError } = await supabase.from("product_features").insert(featuresWithProductId)

          if (featuresError) {
            console.error("Error al guardar características:", featuresError)
            toast({
              title: "Advertencia",
              description: "Algunas características del producto no se pudieron guardar.",
              variant: "warning",
            })
          } else {
            console.log("Características guardadas exitosamente")
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
        console.log("Gestionando tamaños del producto:", productSizes)
        // Eliminar tamaños existentes
        if (!isNew) {
          console.log("Eliminando tamaños existentes...")
          await supabase.from("product_sizes").delete().eq("product_id", productId)
        }

        // Filtrar tamaños vacíos
        const validSizes = productSizes.filter((size) => size.weight && size.weight.trim() !== "")
        console.log("Tamaños válidos:", validSizes)

        if (validSizes.length > 0) {
          // Insertar nuevos tamaños
          const sizesWithProductId = validSizes.map((size) => ({
            product_id: productId,
            weight: size.weight,
            price: size.price || 0,
            stock: size.stock || 0,
          }))

          console.log("Insertando tamaños:", sizesWithProductId)
          const { error: sizesError } = await supabase.from("product_sizes").insert(sizesWithProductId)

          if (sizesError) {
            console.error("Error al guardar tamaños:", sizesError)
            toast({
              title: "Advertencia",
              description: "Algunos tamaños del producto no se pudieron guardar.",
              variant: "warning",
            })
          } else {
            console.log("Tamaños guardados exitosamente")
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

      // Gestionar imágenes del producto
      try {
        // Eliminar imágenes existentes
        if (!isNew) {
          await supabase.from("product_images").delete().eq("product_id", productId)
        }

        // Filtrar imágenes válidas (con URL)
        const validImages = additionalImages.filter((img) => img.src && img.src.trim() !== "")

        console.log("Imágenes válidas a guardar:", validImages)

        if (validImages.length > 0) {
          // Preparar los datos para inserción con la estructura correcta
          const imagesToInsert = validImages.map((img, index) => ({
            product_id: productId,
            url: img.src,
            alt: img.alt || `Imagen ${index + 1} del producto`,
            display_order: index + 1,
          }))

          console.log("Datos a insertar en product_images:", imagesToInsert)

          const { data: insertedImages, error: imagesError } = await supabase
            .from("product_images")
            .insert(imagesToInsert)
            .select()

          if (imagesError) {
            console.error("Error detallado al guardar imágenes:", imagesError)
            toast({
              title: "Advertencia",
              description: `Error al guardar imágenes: ${imagesError.message}`,
              variant: "warning",
            })
          } else {
            console.log("Imágenes guardadas exitosamente:", insertedImages)
            toast({
              title: "Éxito",
              description: `Se guardaron ${insertedImages?.length || 0} imágenes adicionales`,
            })
          }
        }
      } catch (error) {
        console.error("Error al gestionar imágenes:", error)
        toast({
          title: "Advertencia",
          description: "Ocurrió un error al procesar las imágenes del producto.",
          variant: "warning",
        })
      }

      // Establecer reseñas predeterminadas
      try {
        // Importar el cliente admin si está disponible
        const { supabaseAdmin } = await import("@/lib/supabase/client")

        if (supabaseAdmin) {
          // Eliminar reseñas existentes
          if (!isNew) {
            await supabaseAdmin.from("product_reviews").delete().eq("product_id", productId)
          }

          // Insertar reseñas predeterminadas
          const defaultReviews = [
            {
              product_id: productId,
              user_name: "Cliente satisfecho",
              rating: 5,
              comment: "¡Excelente producto! Mi mascota lo adora.",
              created_at: new Date().toISOString(),
            },
            {
              product_id: productId,
              user_name: "Cliente regular",
              rating: 4,
              comment: "Buen producto, lo recomiendo para todas las mascotas.",
              created_at: new Date(Date.now() - 86400000).toISOString(), // 1 día antes
            },
          ]

          const { error: reviewsError } = await supabaseAdmin.from("product_reviews").insert(defaultReviews)

          if (reviewsError) {
            console.error("Error al guardar reseñas predeterminadas:", reviewsError)
            // No mostrar error al usuario ya que las reseñas son opcionales
          }
        } else {
          console.log("Cliente de administrador no disponible, omitiendo creación de reseñas predeterminadas")
        }
      } catch (error) {
        console.error("Error al gestionar reseñas:", error)
        // No mostrar error al usuario ya que las reseñas son opcionales
      }

      toast({
        title: "Éxito",
        description: isNew ? "Producto creado correctamente" : "Producto actualizado correctamente",
      })

      // Redirigir a la lista de productos
      router.push("/admin/products")
    } catch (error: any) {
      // Log detallado del error para debugging
      console.error("Error al guardar producto:", {
        error,
        errorType: typeof error,
        errorKeys: error ? Object.keys(error) : [],
        errorMessage: error?.message,
        errorDetails: error?.details,
        errorCode: error?.code,
        errorStack: error?.stack,
        formState: {
          isNew,
          productName: product.name,
          productSlug: product.slug,
          productPrice: product.price,
          hasImage: !!imageUrl,
          categoryId: product.category_id
        },
        customErrorType: error?.type,
        originalError: error?.originalError
      })
      
      // Mensaje de error más específico
      let errorMessage = "Error desconocido"
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.details) {
        errorMessage = error.details
      } else if (error?.code) {
        errorMessage = `Código de error: ${error.code}`
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object') {
        // Manejar errores personalizados
        if (error.type && error.originalError) {
          errorMessage = `${error.message} - Detalles: ${error.originalError?.message || 'Sin detalles adicionales'}`
        } else {
          // Intentar extraer información útil del objeto error
          const errorInfo = JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
          errorMessage = errorInfo !== '{}' ? errorInfo : "Error sin información específica"
        }
      }
      
      toast({
        title: "Error al guardar producto",
        description: `No se pudo guardar el producto: ${errorMessage}`,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Cargar imágenes adicionales
  useEffect(() => {
    const loadAdditionalImages = async () => {
      if (!isNew && resolvedParams.id) {
        const productId = Number.parseInt(resolvedParams.id)
        const { data: imagesData, error: imagesError } = await supabase
          .from("product_images")
          .select("*")
          .eq("product_id", productId)

        if (!imagesError && imagesData && imagesData.length > 0) {
          setAdditionalImages(
            imagesData.map((img) => ({
              src: img.url || "",
              alt: img.alt || "",
            })),
          )
        } else {
          // Si no hay imágenes o hay un error, inicializar con un array vacío
          setAdditionalImages([])
        }
      }
    }

    loadAdditionalImages()
  }, [isNew, resolvedParams.id])

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
                              checked={product.subscription_types?.includes(type) || false}
                              onCheckedChange={(checked) => {
                                const currentTypes = product.subscription_types || []
                                const updatedTypes = checked
                                  ? [...currentTypes.filter(t => t !== type), type]
                                  : currentTypes.filter((t) => t !== type)

                                setProduct({
                                  ...product,
                                  subscription_types: updatedTypes,
                                })
                                setSubscriptionTypes(updatedTypes)
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
                          <Label htmlFor="weekly_discount" className={!product.subscription_types?.includes('weekly') ? 'text-gray-400' : ''}>
                            Descuento Semanal (%)
                          </Label>
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
                              disabled={!product.subscription_types?.includes('weekly')}
                              className={`pr-8 ${!product.subscription_types?.includes('weekly') ? 'bg-gray-100 text-gray-400' : ''}`}
                            />
                            <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="biweekly_discount" className={!product.subscription_types?.includes('biweekly') ? 'text-gray-400' : ''}>
                            Descuento Quincenal (%)
                          </Label>
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
                              disabled={!product.subscription_types?.includes('biweekly')}
                              className={`pr-8 ${!product.subscription_types?.includes('biweekly') ? 'bg-gray-100 text-gray-400' : ''}`}
                            />
                            <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="monthly_discount" className={!product.subscription_types?.includes('monthly') ? 'text-gray-400' : ''}>
                            Descuento Mensual (%)
                          </Label>
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
                              disabled={!product.subscription_types?.includes('monthly')}
                              className={`pr-8 ${!product.subscription_types?.includes('monthly') ? 'bg-gray-100 text-gray-400' : ''}`}
                            />
                            <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="quarterly_discount" className={!product.subscription_types?.includes('quarterly') ? 'text-gray-400' : ''}>
                            Descuento Trimestral (%)
                          </Label>
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
                              disabled={!product.subscription_types?.includes('quarterly')}
                              className={`pr-8 ${!product.subscription_types?.includes('quarterly') ? 'bg-gray-100 text-gray-400' : ''}`}
                            />
                            <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="annual_discount" className={!product.subscription_types?.includes('annual') ? 'text-gray-400' : ''}>
                            Descuento Anual (%)
                          </Label>
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
                              disabled={!product.subscription_types?.includes('annual')}
                              className={`pr-8 ${!product.subscription_types?.includes('annual') ? 'bg-gray-100 text-gray-400' : ''}`}
                            />
                            <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">
                          Estos descuentos se aplicarán automáticamente según el período de suscripción seleccionado por
                          el cliente.
                        </p>
                        <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                          💡 Los campos de descuento solo están disponibles para los tipos de suscripción que hayas seleccionado arriba.
                          Si deseleccionas un tipo de suscripción, su descuento se eliminará automáticamente.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label>URLs de Mercado Pago por Tipo de Suscripción</Label>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="weekly_mercadopago_url">URL Mercado Pago - Semanal</Label>
                          <Input
                            id="weekly_mercadopago_url"
                            name="weekly_mercadopago_url"
                            type="url"
                            placeholder="https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=..."
                            value={product.weekly_mercadopago_url || ""}
                            onChange={handleProductChange}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="biweekly_mercadopago_url">URL Mercado Pago - Quincenal</Label>
                          <Input
                            id="biweekly_mercadopago_url"
                            name="biweekly_mercadopago_url"
                            type="url"
                            placeholder="https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=..."
                            value={product.biweekly_mercadopago_url || ""}
                            onChange={handleProductChange}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="monthly_mercadopago_url">URL Mercado Pago - Mensual</Label>
                          <Input
                            id="monthly_mercadopago_url"
                            name="monthly_mercadopago_url"
                            type="url"
                            placeholder="https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=..."
                            value={product.monthly_mercadopago_url || ""}
                            onChange={handleProductChange}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="quarterly_mercadopago_url">URL Mercado Pago - Trimestral</Label>
                          <Input
                            id="quarterly_mercadopago_url"
                            name="quarterly_mercadopago_url"
                            type="url"
                            placeholder="https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=..."
                            value={product.quarterly_mercadopago_url || ""}
                            onChange={handleProductChange}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="annual_mercadopago_url">URL Mercado Pago - Anual</Label>
                          <Input
                            id="annual_mercadopago_url"
                            name="annual_mercadopago_url"
                            type="url"
                            placeholder="https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=..."
                            value={product.annual_mercadopago_url || ""}
                            onChange={handleProductChange}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        URLs específicas de Mercado Pago para cada tipo de suscripción. Si se dejan vacías, se usarán las URLs configuradas globalmente.
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
                    <ProductImageViewer
                      images={[
                        ...(product.image ? [{ src: product.image, alt: product.name || "Imagen principal" }] : []),
                        ...productImages.filter(img => img.url).map(img => ({ src: img.url!, alt: img.alt || "Imagen del producto" }))
                      ]}
                      className="w-full"
                      showThumbnails={true}
                      enableZoom={true}
                      aspectRatio="square"
                    />
                  </div>

                  {/* Información del producto */}
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-primary font-display mb-2">
                        {product.name || "Nombre del producto"}
                      </h2>

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

                    {/* Opción de suscripción con descuentos personalizados */}
                    <div>
                      <h3 className="font-bold mb-2">Tipo de compra</h3>
                      <div className="space-y-2">
                        <button className="w-full rounded-lg px-4 py-2 bg-primary text-white text-left">
                          Compra única - €{product.price?.toFixed(2)}
                        </button>
                        {product.subscription_available && (
                          <div className="space-y-1">
                            {product.subscription_types?.includes("weekly") && (
                              <button className="w-full rounded-lg px-4 py-2 border border-primary text-primary text-left">
                                Suscripción Semanal (-{product.weekly_discount || 15}%) - €
                                {((product.price || 0) * (1 - (product.weekly_discount || 15) / 100)).toFixed(2)}
                              </button>
                            )}
                            {product.subscription_types?.includes("biweekly") && (
                              <button className="w-full rounded-lg px-4 py-2 border border-primary text-primary text-left">
                                Suscripción Quincenal (-{product.biweekly_discount || 20}%) - €
                                {((product.price || 0) * (1 - (product.biweekly_discount || 20) / 100)).toFixed(2)}
                              </button>
                            )}
                            {product.subscription_types?.includes("monthly") && (
                              <button className="w-full rounded-lg px-4 py-2 border border-primary text-primary text-left">
                                Suscripción Mensual (-{product.monthly_discount || 15}%) - €
                                {((product.price || 0) * (1 - (product.monthly_discount || 15) / 100)).toFixed(2)}
                              </button>
                            )}
                            {product.subscription_types?.includes("quarterly") && (
                              <button className="w-full rounded-lg px-4 py-2 border border-primary text-primary text-left">
                                Suscripción Trimestral (-{product.quarterly_discount || 10}%) - €
                                {((product.price || 0) * (1 - (product.quarterly_discount || 10) / 100)).toFixed(2)}
                              </button>
                            )}
                            {product.subscription_types?.includes("annual") && (
                              <button className="w-full rounded-lg px-4 py-2 border border-primary text-primary text-left">
                                Suscripción Anual (-{product.annual_discount || 5}%) - €
                                {((product.price || 0) * (1 - (product.annual_discount || 5) / 100)).toFixed(2)}
                              </button>
                            )}
                          </div>
                        )}
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
