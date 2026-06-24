"use client"
// ============================================================
// SECTION 8 – Resumen del plan + Extras + Checkout
// Versión mejorada con:
//   · X para eliminar recetas con animación de salida
//   · AnimatePresence en tarjetas y precios
//   · Resumen de precio reactivo y animado
//   · UX más completa e interactiva
//   · Modal de autenticación (reutilizado del checkout)
//   · Modal de stock-0 al click de Pagar (con newsletter inline)
// ============================================================

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { X, Check, ShoppingCart, PlusCircle, ArrowLeft, Sparkles, PawPrint,
         Loader2, Lock, UserX, AlertTriangle, RefreshCw, Clock, Bell, CheckCircle } from "lucide-react"
import type { Recipe, ExtraProduct, ServingPlan } from "../types"
import { RecommendedProductCard } from "@/components/recommended-product-card"

interface PlanSummarySectionProps {
  petName: string
  selectedRecipes: Recipe[]
  dailyGrams: number
  servingPlan: ServingPlan
  extras: ExtraProduct[]
  selectedExtras: string[]
  savedDogsCount: number
  canAddMore: boolean
  isCheckoutLoading: boolean
  checkoutError: string | null
  isAuthenticated: boolean
  outOfStock?: boolean
  onDismissError: () => void
  onToggleExtra: (id: string) => void
  onRemoveRecipe: (id: string) => void
  onAddAnotherDog: () => void
  onCheckout: () => void
  onBackToRecipes: () => void
  onAddToCart?: () => void  // Nueva función para agregar al carrito manualmente
}

// Precio real: $408 MXN / paquete (6 porciones × 80g = 480g)
// → $408 / 0.480kg ≈ $850 MXN/kg  (alineado con pricePerKg en data/recipes.ts)
const PRICE_PER_KG   = 850
const DELIVERY_DAYS  = 28

// dailyGrams ya llega ajustado por servingPlan desde calculator-engine.ts
// (si servingPlan === "medio", el motor ya dividió entre 2 antes de llegar aquí)
function calcPlanPrice(dailyGrams: number, _servingPlan: ServingPlan, recipeCount: number) {
  const monthlyKg  = (dailyGrams * DELIVERY_DAYS) / 1000
  const perRecipe  = monthlyKg * PRICE_PER_KG
  const fullPrice  = perRecipe * Math.max(recipeCount, 1)
  const discount   = fullPrice * 0.5
  const total      = fullPrice - discount
  const pricePerDay = total / DELIVERY_DAYS
  return { fullPrice, discount, total, pricePerDay }
}

// ─── Variantes de animación ───────────────────────────────────
const cardVariants: Variants = {
  hidden:  { opacity: 0, x: 30, scale: 0.97 },
  visible: { opacity: 1, x: 0,  scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 22 } },
  exit:    { opacity: 0, x: -40, scale: 0.95,
    transition: { duration: 0.22, ease: "easeIn" } },
}

const extraVariants: Variants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export function PlanSummarySection({
  petName,
  selectedRecipes,
  dailyGrams,
  servingPlan,
  extras,
  selectedExtras,
  savedDogsCount,
  canAddMore,
  isCheckoutLoading,
  checkoutError,
  isAuthenticated,
  outOfStock = false,
  onDismissError,
  onToggleExtra,
  onRemoveRecipe,
  onAddAnotherDog,
  onCheckout,
  onBackToRecipes,
  onAddToCart,
}: PlanSummarySectionProps) {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showAddedFeedback, setShowAddedFeedback] = useState(false)
  // Modal de stock 0 (se abre al click en Pagar cuando outOfStock=true)
  const [showStockOutModal, setShowStockOutModal] = useState(false)
  
  const name     = petName || "tu perro"
  const pricing  = calcPlanPrice(dailyGrams, servingPlan, selectedRecipes.length)
  const extrasTotal = extras
    .filter((e) => selectedExtras.includes(e.id))
    .reduce((sum, e) => sum + e.price, 0)
  const grandTotal = pricing.total + extrasTotal

  // Manejar click en el botón "Pagar"
  // Prioridad de checks:
  //   1. Si no hay stock → mostrar modal de stock-0
  //   2. Si no está autenticado → mostrar modal de login
  //   3. En cualquier otro caso → proceder al checkout
  const handlePaymentClick = () => {
    if (outOfStock) {
      setShowStockOutModal(true)
      return
    }
    if (isAuthenticated) {
      onCheckout()
    } else {
      setShowAuthModal(true)
    }
  }

  // Manejar click en "Agregar al carrito"
  const handleAddToCartClick = () => {
    if (onAddToCart) {
      onAddToCart()
      setShowAddedFeedback(true)
      setTimeout(() => setShowAddedFeedback(false), 2000)
    }
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* ─────────── COL IZQUIERDA ─────────── */}
        <div className="space-y-6">

          {/* RECETAS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-base font-semibold text-gray-700">
                Tus recetas
              </h4>
              <button
                type="button"
                onClick={onBackToRecipes}
                className="flex items-center gap-1 text-xs text-[#2a7880] hover:underline font-medium"
              >
                <ArrowLeft size={12} />
                Cambiar selección
              </button>
            </div>

            <AnimatePresence mode="popLayout">
              {selectedRecipes.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200"
                >
                  <PawPrint className="h-7 w-7 text-[#7AB8BF]" />
                  <p className="text-sm text-gray-400 text-center">
                    Sin recetas seleccionadas.
                  </p>
                  <button
                    type="button"
                    onClick={onBackToRecipes}
                    className="text-xs font-semibold text-[#2a7880] hover:underline"
                  >
                    Elegir receta
                  </button>
                </motion.div>
              ) : (
                selectedRecipes.map((recipe, idx) => (
                  <motion.div
                    key={recipe.id}
                    layout
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    custom={idx}
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl shadow-sm mb-3 group"
                  >
                    {/* Imagen */}
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                      <Image
                        src={recipe.image}
                        alt={recipe.name}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).src = "/full-nutritious-dog-bowl.webp"
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {recipe.shortName}
                        </p>
                        <span className="text-[10px] font-semibold text-[#2a7880] bg-[#2a7880]/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                          para {name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {dailyGrams}g / día · {Math.round(dailyGrams / 2)}g por toma
                      </p>
                      <span className="inline-block mt-1.5 text-[10px] font-bold text-[#1d636b] bg-[#eef7f8] px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Primer envío gratis
                      </span>
                    </div>

                    {/* Botón eliminar */}
                    <motion.button
                      type="button"
                      onClick={() => onRemoveRecipe(recipe.id)}
                      whileHover={{ scale: 1.15, backgroundColor: "#fee2e2" }}
                      whileTap={{ scale: 0.9 }}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      aria-label={`Eliminar ${recipe.shortName}`}
                    >
                      <X size={14} strokeWidth={2.5} />
                    </motion.button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* EXTRAS */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-amber-400" />
              <h4 className="text-base font-semibold text-gray-700">
                Extras recomendados
              </h4>
            </div>

            <div className="space-y-2.5">
              <AnimatePresence>
                {extras.map((extra, idx) => {
                  const isAdded = selectedExtras.includes(extra.id)
                  return (
                    <motion.div
                      key={extra.id}
                      variants={extraVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: idx * 0.08 }}
                    >
                      {/* Card compartido con el carrito ("También te
                          puede gustar"). El botón "+" sólo aparece al
                          hacer hover sobre la card. Cuando el extra
                          ya está añadido (isAdded), la card cambia a
                          fondo teal suave y muestra un check siempre
                          visible para feedback claro. */}
                      <RecommendedProductCard
                        product={{
                          id: extra.id,
                          name: extra.name,
                          price: extra.price,
                          image: extra.image,
                          slug: extra.slug,
                          category: extra.category,
                        }}
                        isAdded={isAdded}
                        onAction={() => onToggleExtra(extra.id)}
                        actionAriaLabel={
                          isAdded ? `Quitar ${extra.name}` : `Agregar ${extra.name}`
                        }
                      />
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Botón "Agregar otro perro" - al final de la columna izquierda */}
          <motion.button
            type="button"
            onClick={onAddAnotherDog}
            disabled={!canAddMore || isCheckoutLoading}
            whileHover={canAddMore && !isCheckoutLoading ? { scale: 1.03 } : {}}
            whileTap={canAddMore && !isCheckoutLoading ? { scale: 0.97 } : {}}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full border-2 border-[#e3ecee] text-[#5d7276] font-semibold text-sm hover:border-[#7AB8BF] hover:text-[#2a7880] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <PlusCircle size={16} />
            {canAddMore ? "Agregar otro perro" : "Límite de 10 perros"}
          </motion.button>
        </div>

        {/* ─────────── COL DERECHA: Resumen ─────────── */}
        <div className="lg:sticky lg:top-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-base font-semibold text-gray-700">Resumen</h4>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-[#2a7880] px-2.5 py-1 rounded-full uppercase tracking-wide">
              <RefreshCw size={10} />
              Suscripción
            </span>
          </div>

          <motion.div
            layout
            className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4"
          >
            {/* Bullets descriptivos */}
            <ul className="space-y-2">
              {[
                <>Has seleccionado <strong>{selectedRecipes.length} receta(s)</strong></>,
                <>Recibirás una entrega cada <strong>{DELIVERY_DAYS} días</strong></>,
                <>Tu plan incluye{" "}
                  <strong>{servingPlan === "completo" ? "alimentación completa (100%)" : "medio plan (50%)"}</strong>
                </>,
              ].map((text, i) => (
                <motion.li
                  key={i}
                  layout
                  className="flex items-start gap-2 text-sm text-gray-600"
                >
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-[#2a7880]/10 flex items-center justify-center flex-shrink-0">
                    <Check size={9} className="text-[#2a7880]" strokeWidth={3} />
                  </span>
                  {text}
                </motion.li>
              ))}
            </ul>

            {/* Desglose de precios */}
            <div className="border-t border-gray-100 pt-4 space-y-2.5">
              <PriceLine
                label={`Precio por ${DELIVERY_DAYS} días`}
                value={`$${pricing.fullPrice.toFixed(2)} MXN`}
                crossed
              />
              <PriceLine
                label="50% de descuento (primer pedido)"
                value={`-$${pricing.discount.toFixed(2)} MXN`}
                highlight
              />
              <PriceLine
                label="Precio por día"
                value={`$${pricing.pricePerDay.toFixed(2)} MXN`}
                valueCrossed={`$${(pricing.fullPrice / DELIVERY_DAYS).toFixed(2)} MXN`}
              />
              {/* Nota explicativa del cálculo */}
              <p className="text-[10px] text-gray-400 italic pl-2">
                ${grandTotal.toFixed(2)} ÷ {DELIVERY_DAYS} días = ${pricing.pricePerDay.toFixed(2)} MXN/día
              </p>
              <AnimatePresence>
                {extrasTotal > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <PriceLine
                      label="Extras"
                      value={`+$${extrasTotal.toFixed(2)} MXN`}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Total */}
              <motion.div
                layout
                className="flex justify-between items-center pt-3 border-t border-gray-200"
              >
                <span className="text-base font-bold text-gray-800">Total hoy</span>
                <motion.span
                  key={grandTotal}
                  initial={{ scale: 1.12, color: "#2a7880" }}
                  animate={{ scale: 1,    color: "#16313b" }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="text-xl font-extrabold"
                >
                  ${grandTotal.toFixed(2)} MXN
                </motion.span>
              </motion.div>
            </div>

            <p className="text-[11px] text-gray-400 text-center leading-relaxed">
              * Esta es una <strong className="text-[#2a7880]">suscripción mensual</strong> (cada 28 días).<br />
              Puedes pausar o cancelar cuando quieras desde tu perfil.
            </p>
          </motion.div>

          {/* Botones de pago y carrito - debajo del resumen.
              SIEMPRE visibles. Si no hay stock, el botón "Pagar" abre
              el modal de "stock 0" (igual que el modal de auth para
              usuarios no autenticados). */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 w-full mt-4"
          >
            {/* Botón "Pagar" grande - estilo "Ir al Pago Seguro" */}
            <div className="relative flex flex-col items-center gap-2 flex-1">
              <motion.button
                type="button"
                onClick={handlePaymentClick}
                disabled={selectedRecipes.length === 0 || isCheckoutLoading}
                whileHover={selectedRecipes.length > 0 && !isCheckoutLoading ? { scale: 1.02 } : {}}
                whileTap={selectedRecipes.length > 0 && !isCheckoutLoading ? { scale: 0.98 } : {}}
                className="w-full flex items-center justify-center gap-2 bg-[#2a7880] text-white py-3 px-8 rounded-full font-semibold text-sm hover:bg-[#1d636b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isCheckoutLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Redirigiendo...
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Ir al Pago Seguro
                  </>
                )}
              </motion.button>
              <p className="text-center text-[10px] text-[#7BBDC5] flex items-center justify-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Pago 100% seguro · Procesado por Stripe · Datos cifrados
              </p>
            </div>

            {/* Botón circular "Añadir al carrito" */}
            {onAddToCart && (
              <motion.button
                type="button"
                onClick={handleAddToCartClick}
                disabled={selectedRecipes.length === 0 || isCheckoutLoading}
                whileHover={selectedRecipes.length > 0 && !isCheckoutLoading ? { scale: 1.08 } : {}}
                whileTap={selectedRecipes.length > 0 && !isCheckoutLoading ? { scale: 0.92 } : {}}
                className="w-12 h-12 rounded-full bg-[#2a7880] hover:bg-[#1f5a61] text-white shadow-lg hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center flex-shrink-0"
                title="Agregar al carrito"
              >
                {showAddedFeedback ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    <Check size={20} className="text-white" />
                  </motion.div>
                ) : (
                  <ShoppingCart size={20} strokeWidth={2} />
                )}
              </motion.button>
            )}
          </motion.div>
        </div>
      </div>

      {/* ─── Error card ─── */}
      <AnimatePresence>
        {checkoutError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            className="mt-8 rounded-2xl overflow-hidden border border-[#e6eeef] shadow-sm"
          >
            {/* Header */}
            <div className={`px-5 py-3 flex items-center justify-between ${
              checkoutError === "auth" ? "bg-[#16313b]" : "bg-rose-700"
            }`}>
              <div className="flex items-center gap-2">
                <Image src="/pet-gourmet-logo-transparent.webp" alt="Pet Gourmet"
                  width={28} height={28} className="rounded-full object-cover opacity-90" />
                <span className="text-white text-sm font-semibold tracking-wide">Pet Gourmet</span>
              </div>
              <button onClick={onDismissError} className="text-white/60 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Cuerpo */}
            <div className="bg-white px-5 py-5">
              {checkoutError === "auth" ? (
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-[#f0f9fa] border border-[#7BBDC5]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <UserX className="h-5 w-5 text-[#2a7880]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#16313b] text-sm mb-1">Necesitas iniciar sesión</p>
                    <p className="text-xs text-[#5d7276] leading-relaxed mb-4">
                      Para completar tu compra necesitamos verificar tu identidad. Inicia sesión o crea una cuenta gratuita en segundos.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Link
                        href="/auth/login?redirect=/crear-plan"
                        className="flex-1 text-center text-sm font-semibold bg-[#16313b] text-white py-2.5 px-4 rounded-full hover:bg-[#1d4a57] transition-colors"
                      >
                        Iniciar sesión
                      </Link>
                      <Link
                        href="/auth/register?redirect=/crear-plan"
                        className="flex-1 text-center text-sm font-semibold border border-[#7BBDC5]/50 text-[#2a7880] py-2.5 px-4 rounded-full hover:bg-[#f0f9fa] transition-colors"
                      >
                        Crear cuenta
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle className="h-5 w-5 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#16313b] text-sm mb-1">Algo salió mal</p>
                    <p className="text-xs text-[#5d7276] leading-relaxed mb-3">{checkoutError}</p>
                    <button
                      onClick={() => { onDismissError(); onCheckout() }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline"
                    >
                      <RefreshCw className="h-3 w-3" /> Intentar de nuevo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Panel de autenticación inline (si es necesario) ─── */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 24 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div 
              className="rounded-2xl overflow-hidden border border-[#e6eeef] shadow-[0_4px_24px_rgba(22,49,59,0.08)] max-w-md mx-auto"
            >
              {/* Header con logo */}
              <div className="px-5 py-4 flex items-center justify-between bg-[#16313b]">
                <div className="flex items-center gap-3">
                  <Image
                    src="/pet-gourmet-logo-transparent.webp"
                    alt="Pet Gourmet"
                    width={28}
                    height={28}
                    className="rounded-full object-cover opacity-90"
                  />
                  <span className="text-white text-sm font-semibold tracking-wide">Pet Gourmet</span>
                </div>
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="text-white/60 hover:text-white transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Cuerpo */}
              <div className="bg-white px-5 py-5">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-[#f0f9fa] border border-[#7BBDC5]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <UserX className="h-5 w-5 text-[#2a7880]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#16313b] text-sm mb-1">Necesitas iniciar sesión</p>
                    <p className="text-xs text-[#5d7276] leading-relaxed mb-4">
                      Para completar tu compra necesitamos verificar tu identidad. Inicia sesión o crea una cuenta gratuita en segundos.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Link
                        href="/auth/login?redirect=/crear-plan"
                        className="flex-1 text-center text-sm font-semibold bg-[#16313b] text-white py-2.5 px-4 rounded-full hover:bg-[#1d4a57] transition-colors"
                      >
                        Iniciar sesión
                      </Link>
                      <Link
                        href="/auth/register?redirect=/crear-plan"
                        className="flex-1 text-center text-sm font-semibold border border-[#7BBDC5]/50 text-[#2a7880] py-2.5 px-4 rounded-full hover:bg-[#f0f9fa] transition-colors"
                      >
                        Crear cuenta
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Modal de stock 0 (se abre al click en "Pagar") ─── */}
      <AnimatePresence>
        {showStockOutModal && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 24 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl overflow-hidden border border-[#e6eeef] shadow-[0_4px_24px_rgba(22,49,59,0.08)] max-w-md mx-auto">
              {/* Header con logo y badge de stock */}
              <div className="px-5 py-3 flex items-center gap-3 bg-gradient-to-r from-[#16313b] to-[#2a7880]">
                <Image
                  src="/pet-gourmet-logo-transparent.webp"
                  alt="Pet Gourmet"
                  width={28}
                  height={28}
                  className="rounded-full object-cover opacity-90 flex-shrink-0"
                />
                <span className="text-white text-sm font-semibold tracking-wide">Pet Gourmet</span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-bold text-white/80 bg-white/10 px-2.5 py-1 rounded-full uppercase tracking-wide border border-white/20">
                  <Clock size={9} />
                  Stock: 0
                </span>
                <button
                  onClick={() => setShowStockOutModal(false)}
                  className="text-white/60 hover:text-white transition-colors ml-1"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Cuerpo */}
              <div className="bg-white px-5 py-5">
                <div className="flex gap-4 items-start">
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -8, 8, 0] }}
                    transition={{ duration: 1.2, delay: 0.4, ease: "easeInOut" }}
                    className="w-11 h-11 rounded-full bg-[#f0f9fa] border border-[#7BBDC5]/30 flex items-center justify-center flex-shrink-0 mt-0.5 text-xl"
                  >
                    🐾
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#16313b] text-base mb-1 leading-tight">
                      ¡Ya casi llega el banquete perruno!
                    </p>
                    <p className="text-sm text-[#5d7276] leading-relaxed mb-3">
                      De momento no tenemos stock disponible — <strong className="text-[#2a7880]">la familia Gourmet está trabajando</strong> para tener la comida de tus amigos perrunos lista lo antes posible. 🍖
                    </p>
                    <p className="text-xs text-[#7AB8BF] leading-relaxed mb-4">
                      Guardamos tu plan personalizado para que apenas tengamos stock, puedas completar tu compra en un clic. ¡Vale la pena la espera!
                    </p>

                    {/* Newsletter signup inline */}
                    <StockOutNewsletter />

                    {/* Link secundario a productos disponibles */}
                    <Link
                      href="/productos"
                      onClick={() => setShowStockOutModal(false)}
                      className="block mt-3 text-center text-xs font-semibold text-[#2a7880] hover:underline"
                    >
                      Ver productos disponibles →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Sub-componente línea de precio ───────────────────────────
function PriceLine({
  label,
  value,
  crossed = false,
  valueCrossed,
  highlight = false,
}: {
  label: string
  value: string
  crossed?: boolean
  valueCrossed?: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={highlight ? "text-[#1d636b] font-semibold" : "text-gray-600"}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        {valueCrossed && (
          <span className="text-gray-300 line-through text-xs">{valueCrossed}</span>
        )}
        <span
          className={`font-semibold ${
            highlight
              ? "text-[#1d636b]"
              : crossed
              ? "text-gray-400 line-through"
              : "text-gray-800"
          }`}
        >
          {value}
        </span>
      </div>
    </div>
  )
}

// ============================================================
// SUB-COMPONENT: Newsletter inline para el modal de stock-0
// Usa el mismo endpoint /api/newsletter que home-newsletter.tsx
// pero con diseño compacto para encajar dentro del modal.
// ============================================================
function StockOutNewsletter() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [formLoadTime, setFormLoadTime] = useState<number>(0)

  useEffect(() => {
    setFormLoadTime(Date.now())
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error("Ingresa tu email para continuar")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          honeypot: "",
          submissionTime: formLoadTime,
        }),
      })
      const result = await response.json()
      if (response.ok) {
        setIsSuccess(true)
        setEmail("")
        toast.success("¡Te avisaremos cuando haya stock!", {
          description: "📧 Revisa tu email para confirmar la suscripción",
          duration: 5000,
        })
      } else {
        toast.error("No pudimos registrarte", {
          description: result.error || "Inténtalo de nuevo",
          duration: 5000,
        })
      }
    } catch (error) {
      console.error("Error subscribing to newsletter:", error)
      toast.error("Error de conexión", {
        description: "Inténtalo de nuevo más tarde",
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-3 text-center"
      >
        <CheckCircle className="mx-auto mb-1.5 h-7 w-7 text-green-600" />
        <p className="text-sm font-bold text-green-800">¡Listo!</p>
        <p className="text-xs text-green-700 mt-0.5">
          Te avisaremos en cuanto tengamos stock disponible.
        </p>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        type="email"
        placeholder="tu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={isLoading}
        className="w-full rounded-full border border-[#dfeaec] bg-white px-4 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#7BBDC5] focus:ring-2 focus:ring-[#7BBDC5]/20 disabled:opacity-50 transition-all"
      />
      <button
        type="submit"
        disabled={isLoading || !email.trim()}
        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#2a7880] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#1d636b] disabled:pointer-events-none disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Bell className="h-4 w-4" />
            Avísame cuando haya stock
          </>
        )}
      </button>
    </form>
  )
}
