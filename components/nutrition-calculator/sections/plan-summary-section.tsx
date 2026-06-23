"use client"
// ============================================================
// SECTION 8 – Resumen del plan + Extras + Checkout
// Versión mejorada con:
//   · X para eliminar recetas con animación de salida
//   · AnimatePresence en tarjetas y precios
//   · Resumen de precio reactivo y animado
//   · UX más completa e interactiva
// ============================================================

import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { X, Plus, Check, ShoppingCart, PlusCircle, ArrowLeft, Sparkles, PawPrint,
         Loader2, Lock, UserX, AlertTriangle, RefreshCw } from "lucide-react"
import type { Recipe, ExtraProduct, ServingPlan } from "../types"

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
  onDismissError: () => void
  onToggleExtra: (id: string) => void
  onRemoveRecipe: (id: string) => void
  onAddAnotherDog: () => void
  onCheckout: () => void
  onBackToRecipes: () => void
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
  onDismissError,
  onToggleExtra,
  onRemoveRecipe,
  onAddAnotherDog,
  onCheckout,
  onBackToRecipes,
}: PlanSummarySectionProps) {
  const name     = petName || "tu perro"
  const pricing  = calcPlanPrice(dailyGrams, servingPlan, selectedRecipes.length)
  const extrasTotal = extras
    .filter((e) => selectedExtras.includes(e.id))
    .reduce((sum, e) => sum + e.price, 0)
  const grandTotal = pricing.total + extrasTotal

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
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                        isAdded
                          ? "bg-[#eef7f8] border-[#2a7880]/30"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                        <Image
                          src={extra.image}
                          alt={extra.name}
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{extra.name}</p>
                        <p className="text-xs text-gray-500">{extra.description}</p>
                        <p className="text-xs font-semibold text-gray-700 mt-0.5">
                          +${extra.price.toFixed(0)}
                        </p>
                      </div>

                      <motion.button
                        type="button"
                        onClick={() => onToggleExtra(extra.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                          isAdded
                            ? "bg-[#2a7880] border-[#2a7880] text-white"
                            : "bg-white border-[#e3ecee] text-[#5d7276] hover:border-[#7AB8BF] hover:text-[#2a7880]"
                        }`}
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          {isAdded ? (
                            <motion.span
                              key="added"
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.7 }}
                              className="flex items-center gap-1"
                            >
                              <Check size={11} strokeWidth={3} />
                              Agregado
                            </motion.span>
                          ) : (
                            <motion.span
                              key="add"
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.7 }}
                              className="flex items-center gap-1"
                            >
                              <Plus size={11} strokeWidth={3} />
                              Añadir
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ─────────── COL DERECHA: Resumen ─────────── */}
        <div className="lg:sticky lg:top-6">
          <h4 className="text-base font-semibold text-gray-700 mb-3">Resumen</h4>

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
                value={`$${pricing.fullPrice.toFixed(2)}`}
                crossed
              />
              <PriceLine
                label="50% de descuento (primer pedido)"
                value={`-$${pricing.discount.toFixed(2)}`}
                highlight
              />
              <PriceLine
                label="Precio por día"
                value={`$${pricing.pricePerDay.toFixed(2)}`}
                valueCrossed={`$${(pricing.fullPrice / DELIVERY_DAYS).toFixed(2)}`}
              />
              <AnimatePresence>
                {extrasTotal > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <PriceLine
                      label="Extras"
                      value={`+$${extrasTotal.toFixed(2)}`}
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
                  ${grandTotal.toFixed(2)}
                </motion.span>
              </motion.div>
            </div>

            <p className="text-[11px] text-gray-400 text-center leading-relaxed">
              * Esta es una suscripción. Puedes pausar o cancelar cuando quieras.
            </p>
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

      {/* ─── Botones de acción ─── */}
      <motion.div
        className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
      >
        <motion.button
          type="button"
          onClick={onAddAnotherDog}
          disabled={!canAddMore || isCheckoutLoading}
          whileHover={canAddMore && !isCheckoutLoading ? { scale: 1.03 } : {}}
          whileTap={canAddMore && !isCheckoutLoading ? { scale: 0.97 } : {}}
          className="flex items-center gap-2 px-6 py-3 rounded-full border-2 border-[#e3ecee] text-[#5d7276] font-semibold text-sm hover:border-[#7AB8BF] hover:text-[#2a7880] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <PlusCircle size={16} />
          {canAddMore ? "Agregar otro perro" : "Límite de 10 perros"}
        </motion.button>

        <motion.button
          type="button"
          onClick={onCheckout}
          disabled={selectedRecipes.length === 0 || isCheckoutLoading}
          whileHover={selectedRecipes.length > 0 && !isCheckoutLoading ? { scale: 1.04 } : {}}
          whileTap={selectedRecipes.length > 0 && !isCheckoutLoading ? { scale: 0.97 } : {}}
          animate={selectedRecipes.length > 0 && !isCheckoutLoading
            ? { boxShadow: ["0 4px 16px rgba(42,120,128,0.2)", "0 4px 22px rgba(42,120,128,0.45)", "0 4px 16px rgba(42,120,128,0.2)"] }
            : {}}
          transition={{ boxShadow: { duration: 2.2, repeat: Infinity } }}
          className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#2a7880] text-white font-bold text-sm hover:bg-[#1d636b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isCheckoutLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Redirigiendo...
            </>
          ) : (
            <>
              <Lock size={15} />
              Ir al pago seguro
            </>
          )}
        </motion.button>
      </motion.div>
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
