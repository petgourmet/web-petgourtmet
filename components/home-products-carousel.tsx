import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { ProductCard, type ProductCardProps } from "@/components/product-card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

type HomeCarouselProduct = Pick<
  ProductCardProps,
  "id" | "slug" | "name" | "description" | "image" | "price" | "features" | "product_type" | "variantMinPrice" | "variantMaxPrice"
>

function slugifyProductName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function getProductImageUrl(imagePath: string | null | undefined, supabase: Awaited<ReturnType<typeof createClient>>) {
  if (!imagePath) {
    return "/placeholder.svg"
  }

  if (imagePath.startsWith("http") || imagePath.startsWith("/")) {
    return imagePath
  }

  return supabase.storage.from("products").getPublicUrl(imagePath).data.publicUrl
}

async function getFeaturedProducts(): Promise<HomeCarouselProduct[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, description, price, image, featured, stock, updated_at, product_type, rating")
    .gt("stock", 0)
    .order("featured", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(6)

  if (error || !data) {
    return []
  }

  const products = (data as Array<{
    id: number
    name: string
    slug: string | null
    description: string
    price: number
    image: string | null
    product_type?: "simple" | "variable"
  }>).map((product) => ({
    id: product.id,
    slug: product.slug || slugifyProductName(product.name),
    name: product.name,
    description: product.description,
    image: getProductImageUrl(product.image, supabase),
    price: product.price,
    product_type: product.product_type,
  }))

  const productIds = products.map((product) => product.id)

  const [{ data: featuresData }, { data: variantRows }] = await Promise.all([
    supabase.from("product_features").select("product_id, name, color").in("product_id", productIds),
    supabase.from("product_variants").select("product_id, price, is_active").in("product_id", productIds).eq("is_active", true),
  ])

  const featuresByProductId = new Map<number, NonNullable<ProductCardProps["features"]>>()
  for (const feature of featuresData ?? []) {
    const productFeatures = featuresByProductId.get(feature.product_id) ?? []
    productFeatures.push({
      name: feature.name,
      color: feature.color,
    })
    featuresByProductId.set(feature.product_id, productFeatures)
  }

  const variantRangeByProductId = new Map<number, { min: number; max: number }>()
  for (const variant of variantRows ?? []) {
    const variantPrice = Number(variant.price) || 0
    if (variantPrice <= 0) {
      continue
    }

    const currentRange = variantRangeByProductId.get(variant.product_id)
    if (!currentRange) {
      variantRangeByProductId.set(variant.product_id, { min: variantPrice, max: variantPrice })
      continue
    }

    if (variantPrice < currentRange.min) {
      currentRange.min = variantPrice
    }
    if (variantPrice > currentRange.max) {
      currentRange.max = variantPrice
    }
  }

  return products.map((product) => {
    const variantRange = variantRangeByProductId.get(product.id)

    return {
      ...product,
      features: featuresByProductId.get(product.id) ?? [],
      variantMinPrice: variantRange?.min,
      variantMaxPrice: variantRange?.max,
    }
  })
}

export async function HomeProductsCarousel() {
  const featuredProducts = await getFeaturedProducts()

  if (featuredProducts.length === 0) {
    return null
  }

  return (
    <section className="relative bg-[linear-gradient(180deg,_#f7fafb_0%,_#f3f7f8_100%)] py-20 md:py-24">
      <div className="container relative z-10 mx-auto px-4">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-[#dce8ea] bg-white px-4 py-2 text-sm font-semibold text-[#2a7880] shadow-[0_10px_24px_rgba(42,120,128,0.06)]">
              Selección destacada
            </span>
            <h2 className="mt-5 font-display text-3xl font-bold text-[#16313b] md:text-4xl">
              Nuestros productos favoritos para empezar a explorar
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#607478] md:text-lg">
              Una vista rápida de recetas, premios y opciones especiales para descubrir el estilo y la variedad de Pet
              Gourmet.
            </p>
          </div>

          <Link
            href="/productos"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#1d636b] transition-colors duration-300 hover:text-[#16313b]"
          >
            Ver catálogo completo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full px-4 pb-3 sm:px-5 sm:pb-4 lg:px-6"
          >
            <CarouselContent className="-ml-4 sm:-ml-5">
              {featuredProducts.map((product) => (
                <CarouselItem key={product.id} className="basis-[88%] pl-4 pb-3 sm:basis-[68%] sm:pl-5 sm:pb-4 lg:basis-[45%] xl:basis-[34%]">
                  <ProductCard {...product} useShadow={false} className="shadow-none hover:shadow-none" />
                </CarouselItem>
              ))}
            </CarouselContent>

            <CarouselPrevious className="left-4 top-[35%] h-11 w-11 border-[#dce8ea] bg-white text-[#16313b] shadow-none hover:bg-[#f8fbfb] disabled:opacity-40 md:left-1" />
            <CarouselNext className="right-4 top-[35%] h-11 w-11 border-[#dce8ea] bg-white text-[#16313b] shadow-none hover:bg-[#f8fbfb] disabled:opacity-40 md:right-1" />
          </Carousel>
        </div>
      </div>
    </section>
  )
}
