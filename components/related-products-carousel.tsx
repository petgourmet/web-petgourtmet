"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

interface RelatedProduct {
  id: string | number
  name: string
  price: number
  image: string
  slug: string
  category?: string
}

interface RelatedProductsCarouselProps {
  currentProductId: string | number
}

export function RelatedProductsCarousel({ currentProductId }: RelatedProductsCarouselProps) {
  const [products, setProducts] = useState<RelatedProduct[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    async function load() {
      if (!supabase) return

      const { data } = await supabase
        .from("products")
        .select("id, name, price, image, slug, categories(name)")
        .neq("id", currentProductId)
        .gt("stock", 0)
        .limit(12)

      if (data && data.length > 0) {
        const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, 8)
        setProducts(
          shuffled.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.price ?? 0,
            image: p.image || "/placeholder.svg",
            slug: p.slug,
            category: p.categories?.name,
          }))
        )
      }
    }
    load()
  }, [currentProductId])

  const updateScrollState = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 8)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollState()
    el.addEventListener("scroll", updateScrollState, { passive: true })
    window.addEventListener("resize", updateScrollState)
    return () => {
      el.removeEventListener("scroll", updateScrollState)
      window.removeEventListener("resize", updateScrollState)
    }
  }, [products])

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    const card = el.querySelector("[data-card]") as HTMLElement | null
    const step = card ? card.offsetWidth + 16 : 220
    el.scrollBy({ left: dir === "right" ? step * 2 : -step * 2, behavior: "smooth" })
  }

  if (products.length === 0) return null

  return (
    <section className="mt-2 px-6 pb-10">
      {/* Divisor sutil */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#7BBDC5]/30 to-transparent mb-8" />

      {/* Encabezado */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#7BBDC5]/70 font-semibold mb-1">
            Descubre más
          </p>
          <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 leading-tight">
            También te puede gustar
          </h2>
        </div>

        {/* Controles */}
        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            aria-label="Anterior"
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-200 ${
              canScrollLeft
                ? "border-[#7BBDC5]/50 text-[#7BBDC5] hover:bg-[#7BBDC5]/10"
                : "border-gray-200 text-gray-300 cursor-default"
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            aria-label="Siguiente"
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-200 ${
              canScrollRight
                ? "border-[#7BBDC5]/50 text-[#7BBDC5] hover:bg-[#7BBDC5]/10"
                : "border-gray-200 text-gray-300 cursor-default"
            }`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Carrusel */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/producto/${product.slug}`}
            data-card
            className="flex-shrink-0 w-[180px] sm:w-[200px] group"
          >
            <div className="rounded-2xl overflow-hidden border border-[#7BBDC5]/15 bg-white dark:bg-gray-800 hover:border-[#7BBDC5]/40 hover:shadow-[0_4px_20px_rgba(123,189,197,0.12)] transition-all duration-300">
              {/* Imagen */}
              <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-gray-700">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="200px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Info */}
              <div className="p-3 space-y-1">
                {product.category && (
                  <p className="text-[10px] uppercase tracking-wider text-[#7BBDC5]/70 truncate">
                    {product.category}
                  </p>
                )}
                <h4 className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 leading-snug line-clamp-2">
                  {product.name}
                </h4>
                <p className="text-sm font-bold text-[#7BBDC5] pt-0.5">
                  ${product.price.toFixed(2)}{" "}
                  <span className="text-[10px] font-normal text-gray-400">MXN</span>
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Fade edges */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}
