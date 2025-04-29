"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ProductSlide } from "./product-slide"
import { CarouselIndicators } from "./carousel-indicators"
import { products } from "./product-data"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"

interface ProductCarouselProps {
  category?: string
  autoPlay?: boolean
  autoPlayInterval?: number
}

export function ProductCarousel({ category, autoPlay = true, autoPlayInterval = 5000 }: ProductCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [containerRef, isVisible] = useIntersectionObserver({
    threshold: 0.2,
    rootMargin: "0px",
  })

  // Filtrar productos por categoría si se proporciona
  const filteredProducts = products

  const productCount = filteredProducts.length

  // Función para ir a la siguiente slide
  const nextSlide = useCallback(() => {
    setDirection(1)
    setCurrentIndex((prevIndex) => (prevIndex + 1) % productCount)
  }, [productCount])

  // Función para ir a la slide anterior
  const prevSlide = useCallback(() => {
    setDirection(-1)
    setCurrentIndex((prevIndex) => (prevIndex - 1 + productCount) % productCount)
  }, [productCount])

  // Función para ir a una slide específica
  const goToSlide = useCallback(
    (index: number) => {
      setDirection(index > currentIndex ? 1 : -1)
      setCurrentIndex(index)
    },
    [currentIndex],
  )

  // Configurar autoplay
  useEffect(() => {
    if (autoPlay && isVisible) {
      const startAutoPlay = () => {
        timeoutRef.current = setTimeout(() => {
          nextSlide()
        }, autoPlayInterval)
      }

      startAutoPlay()

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }
  }, [currentIndex, autoPlay, autoPlayInterval, nextSlide, isVisible])

  // Variantes para las animaciones
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
    }),
  }

  return (
    <div className="relative w-full overflow-hidden" ref={containerRef as React.RefObject<HTMLDivElement>}>
      {/* Flechas de navegación */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 z-10 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow-md hover:bg-white transition-colors"
        aria-label="Producto anterior"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 z-10 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow-md hover:bg-white transition-colors"
        aria-label="Siguiente producto"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Contenedor principal con altura fija */}
      <div className="w-full h-[700px] md:h-[800px]">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="absolute w-full h-full"
          >
            <ProductSlide product={filteredProducts[currentIndex]} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Indicadores de posición */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <CarouselIndicators count={productCount} activeIndex={currentIndex} onSelect={goToSlide} />
      </div>
    </div>
  )
}
