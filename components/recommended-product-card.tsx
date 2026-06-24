"use client"
// ============================================================
// RecommendedProductCard
//
// Tarjeta compacta para mostrar un producto recomendado.
// Se utiliza en:
//   - components/cart-modal.tsx          → "También te puede gustar"
//   - components/nutrition-calculator/   → "Extras recomendados"
//     sections/plan-summary-section.tsx
//
// Características:
//   - Imagen 64x64 (mobile) / 80x80 (desktop) a la izquierda.
//   - Botón de acción flotante en la esquina inferior derecha de
//     la imagen. Por defecto se oculta y sólo aparece cuando el
//     usuario hace hover sobre la card (igual que el carrito).
//   - Badge de categoría arriba del nombre.
//   - Precio en color teal con sufijo "MXN".
//   - Opcionalmente toda la card puede ser un Link al detalle del
//     producto (modo `href`).
//   - Opcionalmente puede comportarse como toggle (estado isAdded),
//     mostrando un check cuando ya está seleccionado.
// ============================================================

import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Check } from "lucide-react"

export interface RecommendedProductCardData {
  id:        string | number
  name:      string
  price:     number
  image:     string
  slug?:     string
  category?: string
}

interface RecommendedProductCardProps {
  product: RecommendedProductCardData
  /** Handler del botón flotante. Recibe el producto. */
  onAction: (product: RecommendedProductCardData) => void
  /** Si es true → el botón siempre está visible. Si false (default)
   *  → sólo aparece cuando el usuario hace hover sobre la card. */
  actionAlwaysVisible?: boolean
  /** Si es true → la card pinta el estado "ya seleccionado" (fondo
   *  teal suave + check en lugar de +). Útil para toggle. */
  isAdded?: boolean
  /** Si se pasa, toda la card se envuelve en un Link a esta URL. */
  href?: string
  /** Callback opcional cuando se clickea la card (no el botón).
   *  Útil para cerrar modales antes de navegar. */
  onCardClick?: () => void
  /** Etiqueta accesible custom para el botón.
   *  Por defecto: "Agregar {name} al carrito". */
  actionAriaLabel?: string
}

export function RecommendedProductCard({
  product,
  onAction,
  actionAlwaysVisible = false,
  isAdded = false,
  href,
  onCardClick,
  actionAriaLabel,
}: RecommendedProductCardProps) {
  // Visibilidad del botón flotante.
  // - actionAlwaysVisible=true   → opacity 100 siempre
  // - isAdded=true                → opacity 100 siempre (feedback claro)
  // - default                     → 0 → 100 al hacer hover sobre la card
  const buttonVisibilityClasses =
    actionAlwaysVisible || isAdded
      ? "opacity-100 translate-y-0"
      : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"

  const cardClasses = `block group rounded-xl sm:rounded-2xl overflow-hidden border transition-all duration-300 ${
    isAdded
      ? "bg-[#eef7f8] border-[#2a7880]/30 shadow-[0_4px_20px_rgba(42,120,128,0.10)]"
      : "bg-white border-[#7BBDC5]/15 hover:border-[#7BBDC5]/40 hover:shadow-[0_4px_20px_rgba(123,189,197,0.12)]"
  }`

  const cardInner = (
    <div className="flex gap-2 sm:gap-3 p-2 sm:p-3 relative">
      {/* Imagen + botón flotante */}
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-md sm:rounded-lg overflow-hidden bg-gray-50">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 64px, 80px"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />

        <motion.button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onAction(product)
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          aria-label={actionAriaLabel || `Agregar ${product.name} al carrito`}
          className={`absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-10 ${
            isAdded ? "bg-[#1d636b] text-white" : "bg-[#2a7880] hover:bg-[#1f5a61] text-white"
          } ${buttonVisibilityClasses}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isAdded ? (
              <motion.span
                key="check"
                initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                transition={{ duration: 0.15 }}
              >
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={3} />
              </motion.span>
            ) : (
              <motion.span
                key="plus"
                initial={{ opacity: 0, scale: 0.5, rotate: 90 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5, rotate: -90 }}
                transition={{ duration: 0.15 }}
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Info: categoría · nombre · precio */}
      <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
        {product.category && (
          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[#7BBDC5]/70 font-semibold truncate">
            {product.category}
          </p>
        )}
        <h4 className="text-xs sm:text-[13px] font-semibold text-gray-800 leading-snug line-clamp-2">
          {product.name}
        </h4>
        <p className="text-xs sm:text-sm font-bold text-[#7BBDC5] pt-0.5">
          ${product.price.toFixed(2)}{" "}
          <span className="text-[9px] sm:text-[10px] font-normal text-gray-400">MXN</span>
        </p>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} onClick={onCardClick} className={cardClasses}>
        {cardInner}
      </Link>
    )
  }

  return <div className={cardClasses}>{cardInner}</div>
}
