"use client"
// ============================================================
// ADMIN — Configuración de la Calculadora Nutricional
// Ruta: /admin/calculator-config
//
// Tabs:
//   1. Recetas   — activar/desactivar + editar nombre/kcal/precio/imagen
//   2. Extras    — activar/desactivar + editar nombre/descripción/precio
//   3. Textos    — editar títulos y descripciones de secciones
//   4. Precios   — pricePerKg, firstOrderDiscount, deliveryDays
//
// Botones:
//   · Guardar cambios  → PUT /api/admin/calculator-config
//   · Restaurar config por defecto → DELETE /api/admin/calculator-config
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import {
  Save, RotateCcw, ChevronDown,
  AlertTriangle, CheckCircle2, Loader2,
  Utensils, Type, DollarSign, Info,
  Plus, Trash2, Upload, ImageIcon,
} from "lucide-react"
import type { CalculatorConfig, RecipeConfig } from "@/lib/calculator-config-types"
import { DEFAULT_CALCULATOR_CONFIG } from "@/lib/calculator-config-types"

// ─── Helpers ─────────────────────────────────────────────────

function cloneDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

function slugifyId(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `item-${Date.now()}`
}

function uniqueId(base: string, existing: string[]): string {
  const slug = slugifyId(base)
  if (!existing.includes(slug)) return slug
  let i = 2
  while (existing.includes(`${slug}-${i}`)) i++
  return `${slug}-${i}`
}

// ─── Sub-componentes ──────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
      {children}
    </label>
  )
}

function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  className = "",
}: {
  value: string | number
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  className?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2a7880]/40 focus:border-[#2a7880] transition-colors ${className}`}
    />
  )
}

function Textarea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2a7880]/40 focus:border-[#2a7880] transition-colors resize-none"
    />
  )
}

function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#2a7880]/40 ${
        value ? "bg-[#2a7880]" : "bg-gray-300"
      }`}
      aria-label={label}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          value ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  )
}

// ─── ImageUpload (Cloudinary) ─────────────────────────────────

function ImageUpload({
  value,
  onChange,
  folder,
  altText,
}: {
  value: string
  onChange: (url: string) => void
  folder: string
  altText: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isUrl = value && (value.startsWith("http") || value.startsWith("/"))

  const handleFile = async (file: File) => {
    setError(null)
    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no debe superar 5MB")
      return
    }
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", folder)
      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al subir la imagen")
      }
      const data = await res.json()
      if (!data.secure_url) throw new Error("Respuesta sin URL de imagen")
      onChange(data.secure_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir la imagen")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {/* Preview */}
        <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
          {isUrl ? (
            <Image
              src={value}
              alt={altText}
              fill
              sizes="80px"
              className="object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/full-nutritious-dog-bowl.webp"
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <ImageIcon size={20} />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <Loader2 size={18} className="animate-spin text-[#2a7880]" />
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex-1 flex flex-col gap-1.5">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#2a7880] border border-[#7AB8BF]/50 rounded-lg hover:bg-[#eef7f8] disabled:opacity-50 transition-colors"
          >
            <Upload size={12} />
            {uploading ? "Subiendo…" : isUrl ? "Reemplazar imagen" : "Subir imagen"}
          </button>
          {isUrl && (
            <p className="text-[10px] text-gray-400 truncate" title={value}>
              {value.length > 60 ? `…${value.slice(-58)}` : value}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle size={12} />
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Tab: Recetas ─────────────────────────────────────────────

function RecipesTab({
  recipes,
  onChange,
}: {
  recipes: RecipeConfig[]
  onChange: (r: RecipeConfig[]) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const update = (id: string, patch: Partial<RecipeConfig>) => {
    onChange(recipes.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const handleAdd = () => {
    const newId = uniqueId("nueva-receta", recipes.map((r) => r.id))
    const newRecipe: RecipeConfig = {
      id: newId,
      name: "Nueva receta",
      shortName: "Sin nombre",
      protein: "pollo",
      allergens: [],
      kcalPer100g: 180,
      pricePerKg: 850,
      image: "",
      productSlug: null,
      isActive: true,
      ingredients: [],
    }
    onChange([...recipes, newRecipe])
    setExpandedId(newId)
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`¿Eliminar la receta "${name}"? Esta acción se aplicará al guardar los cambios.`)) return
    onChange(recipes.filter((r) => r.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-500 flex-1">
          Activa, desactiva, edita o elimina recetas. Sube imágenes directamente y se guardarán en Cloudinary.
        </p>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-[#2a7880] hover:bg-[#1d636b] rounded-lg shadow-sm flex-shrink-0 transition-colors"
        >
          <Plus size={14} />
          Nueva receta
        </button>
      </div>

      {recipes.length === 0 && (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400 text-sm">
          No hay recetas configuradas. Agrega una con el botón <strong>Nueva receta</strong>.
        </div>
      )}

      <AnimatePresence initial={false}>
        {recipes.map((recipe) => {
          const isOpen = expandedId === recipe.id
          return (
            <motion.div
              key={recipe.id}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className={`border rounded-2xl overflow-hidden transition-colors ${
                recipe.isActive ? "border-[#7AB8BF]/50 bg-white" : "border-gray-200 bg-gray-50"
              }`}
            >
              {/* Header */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer"
                onClick={() => setExpandedId(isOpen ? null : recipe.id)}
              >
                {/* Imagen preview */}
                <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                  {recipe.image ? (
                    <Image
                      src={recipe.image}
                      alt={recipe.shortName}
                      fill
                      sizes="48px"
                      className="object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/full-nutritious-dog-bowl.webp"
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ImageIcon size={16} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-semibold text-sm truncate ${recipe.isActive ? "text-[#16313b]" : "text-gray-400"}`}>
                      {recipe.shortName}
                    </p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                      recipe.isActive ? "bg-[#eef7f8] text-[#2a7880]" : "bg-gray-100 text-gray-400"
                    }`}>
                      {recipe.isActive ? "Activa" : "Oculta"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {recipe.kcalPer100g} kcal/100g · ${recipe.pricePerKg}/kg · proteína: {recipe.protein}
                  </p>
                </div>

                {/* Toggle activo/inactivo */}
                <div className="flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Toggle
                    value={recipe.isActive}
                    onChange={(v) => update(recipe.id, { isActive: v })}
                    label={`Activar ${recipe.shortName}`}
                  />
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-gray-400"
                  >
                    <ChevronDown size={16} />
                  </motion.span>
                </div>
              </div>

              {/* Detalle editable */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-5 pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <FieldLabel>Nombre completo</FieldLabel>
                        <Input
                          value={recipe.name}
                          onChange={(v) => update(recipe.id, { name: v })}
                          placeholder="Nutrición diaria Pollo Verduras"
                        />
                      </div>
                      <div>
                        <FieldLabel>Nombre corto</FieldLabel>
                        <Input
                          value={recipe.shortName}
                          onChange={(v) => update(recipe.id, { shortName: v })}
                          placeholder="Pollo Verduras"
                        />
                      </div>
                      <div>
                        <FieldLabel>Proteína principal</FieldLabel>
                        <Input
                          value={recipe.protein}
                          onChange={(v) => update(recipe.id, { protein: v })}
                          placeholder="pollo, res, cerdo, ternera…"
                        />
                      </div>
                      <div>
                        <FieldLabel>kcal / 100g</FieldLabel>
                        <Input
                          type="number"
                          value={recipe.kcalPer100g}
                          onChange={(v) => update(recipe.id, { kcalPer100g: parseFloat(v) || 0 })}
                        />
                      </div>
                      <div>
                        <FieldLabel>Precio por kg (MXN)</FieldLabel>
                        <Input
                          type="number"
                          value={recipe.pricePerKg}
                          onChange={(v) => update(recipe.id, { pricePerKg: parseFloat(v) || 0 })}
                        />
                      </div>
                      <div>
                        <FieldLabel>Slug del producto (opcional)</FieldLabel>
                        <Input
                          value={recipe.productSlug ?? ""}
                          onChange={(v) => update(recipe.id, { productSlug: v || null })}
                          placeholder="pastel-porcin-de-pollo-verduras"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <FieldLabel>Imagen de la receta</FieldLabel>
                        <ImageUpload
                          value={recipe.image}
                          onChange={(url) => update(recipe.id, { image: url })}
                          folder="calculator-recipes"
                          altText={recipe.shortName || "Receta"}
                        />
                      </div>

                      {/* Acciones */}
                      <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
                        <p className="text-[11px] text-gray-400">
                          ID: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{recipe.id}</code>
                        </p>
                        <button
                          type="button"
                          onClick={() => handleDelete(recipe.id, recipe.shortName || recipe.name)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={12} />
                          Eliminar receta
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// ─── Tab: Textos ──────────────────────────────────────────────

function TextsTab({
  sections,
  onChange,
}: {
  sections: CalculatorConfig["sections"]
  onChange: (s: CalculatorConfig["sections"]) => void
}) {
  const update = (key: keyof typeof sections, patch: Partial<CalculatorConfig["sections"][keyof typeof sections]>) => {
    onChange({ ...sections, [key]: { ...sections[key], ...patch } })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Edita los títulos y descripciones que aparecen en cada sección de la calculadora.
        El texto <code className="bg-gray-100 px-1 rounded">{"{petName}"}</code> se reemplaza con el nombre del perro.
      </p>

      {/* Sección 1 — Datos básicos */}
      <SectionTextBlock
        number={1}
        label="Datos básicos del perro"
        fields={[
          {
            label: "Título",
            value: sections.basicInfo.title,
            onChange: (v) => update("basicInfo", { title: v }),
          },
          {
            label: "Descripción",
            value: sections.basicInfo.description,
            onChange: (v) => update("basicInfo", { description: v }),
            multiline: true,
          },
        ]}
      />

      {/* Sección 6 — Plan de servicio */}
      <SectionTextBlock
        number={2}
        label="Plan de servicio"
        fields={[
          {
            label: "Título",
            value: sections.servingPlan.title,
            onChange: (v) => update("servingPlan", { title: v }),
          },
        ]}
      />

      {/* Sección 7 — Receta recomendada */}
      <SectionTextBlock
        number={3}
        label="Receta recomendada"
        fields={[
          {
            label: "Título (usa {petName} para personalizar)",
            value: sections.recipeSection.title,
            onChange: (v) => update("recipeSection", { title: v }),
          },
        ]}
      />

      {/* Sección 8 — Resumen */}
      <SectionTextBlock
        number={4}
        label="Resumen del plan"
        fields={[
          {
            label: "Título",
            value: sections.summary.title,
            onChange: (v) => update("summary", { title: v }),
          },
        ]}
      />
    </div>
  )
}

function SectionTextBlock({
  number,
  label,
  fields,
}: {
  number: number
  label: string
  fields: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }[]
}) {
  return (
    <div className="border border-gray-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-[#2a7880] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {number}
        </span>
        <h4 className="font-semibold text-gray-800 text-sm">{label}</h4>
      </div>
      {fields.map((f) => (
        <div key={f.label}>
          <FieldLabel>{f.label}</FieldLabel>
          {f.multiline ? (
            <Textarea value={f.value} onChange={f.onChange} rows={3} />
          ) : (
            <Input value={f.value} onChange={f.onChange} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Tab: Precios ─────────────────────────────────────────────

function PricesTab({
  config,
  onChange,
}: {
  config: Pick<CalculatorConfig, "pricePerKg" | "deliveryDays" | "firstOrderDiscount">
  onChange: (patch: Partial<CalculatorConfig>) => void
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Estos valores afectan el cálculo del precio en el resumen del plan.
      </p>

      <div className="border border-gray-200 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel>Precio por kg (MXN)</FieldLabel>
          <Input
            type="number"
            value={config.pricePerKg}
            onChange={(v) => onChange({ pricePerKg: parseFloat(v) || 850 })}
          />
          <p className="text-xs text-gray-400 mt-1">Precio base aplicado a todas las recetas</p>
        </div>
        <div>
          <FieldLabel>Días de entrega (ciclo)</FieldLabel>
          <Input
            type="number"
            value={config.deliveryDays}
            onChange={(v) => onChange({ deliveryDays: parseInt(v) || 28 })}
          />
          <p className="text-xs text-gray-400 mt-1">Cada cuántos días se entrega el pedido (por defecto 28)</p>
        </div>
        <div>
          <FieldLabel>Descuento primer pedido (%)</FieldLabel>
          <Input
            type="number"
            value={Math.round(config.firstOrderDiscount * 100)}
            onChange={(v) => onChange({ firstOrderDiscount: (parseFloat(v) || 50) / 100 })}
          />
          <p className="text-xs text-gray-400 mt-1">Porcentaje de descuento en la primera compra</p>
        </div>

        {/* Preview del cálculo */}
        <div className="sm:col-span-2 bg-[#f0f9fa] rounded-xl p-4">
          <p className="text-xs font-semibold text-[#2a7880] mb-2 uppercase tracking-wide">Vista previa del cálculo</p>
          <p className="text-xs text-gray-600">
            Para un perro que necesita <strong>200g/día</strong>:
          </p>
          <ul className="text-xs text-gray-600 mt-1 space-y-0.5">
            <li>· kg/mes = 200g × {config.deliveryDays} días / 1000 = {((200 * config.deliveryDays) / 1000).toFixed(2)} kg</li>
            <li>· Precio full = {((200 * config.deliveryDays) / 1000).toFixed(2)} kg × ${config.pricePerKg} = <strong>${((200 * config.deliveryDays / 1000) * config.pricePerKg).toFixed(2)}</strong></li>
            <li>· Con {Math.round(config.firstOrderDiscount * 100)}% desc. = <strong className="text-[#2a7880]">${((200 * config.deliveryDays / 1000) * config.pricePerKg * (1 - config.firstOrderDiscount)).toFixed(2)} MXN</strong></li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────

const TABS = [
  { id: "recipes", label: "Recetas",  icon: <Utensils size={15} /> },
  { id: "texts",   label: "Textos",   icon: <Type size={15} /> },
  { id: "prices",  label: "Precios",  icon: <DollarSign size={15} /> },
] as const

type TabId = typeof TABS[number]["id"]

export default function CalculatorConfigPage() {
  const [config, setConfig] = useState<CalculatorConfig>(cloneDeep(DEFAULT_CALCULATOR_CONFIG))
  const [activeTab, setActiveTab] = useState<TabId>("recipes")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Cargar config al montar
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/calculator-config")
        if (res.ok) {
          const data = await res.json()
          setConfig(cloneDeep(data.config))
          setLastSaved(data.updatedAt)
        }
      } catch {
        // Usar defaults
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const updateConfig = useCallback((patch: Partial<CalculatorConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }))
    setHasUnsavedChanges(true)
  }, [])

  // ── Guardar ──────────────────────────────────────────────────
  const handleSave = async () => {
    // Validaciones previas
    const problems: string[] = []

    // IDs únicos
    const recipeIds = config.recipes.map((r) => r.id)
    if (new Set(recipeIds).size !== recipeIds.length) {
      problems.push("Hay recetas con IDs duplicados")
    }

    // Campos requeridos en recetas activas
    config.recipes.forEach((r) => {
      if (!r.isActive) return
      if (!r.name?.trim()) problems.push(`La receta "${r.id}" no tiene nombre`)
      if (!r.shortName?.trim()) problems.push(`La receta "${r.id}" no tiene nombre corto`)
      if (!r.image?.trim()) problems.push(`La receta "${r.shortName || r.id}" no tiene imagen`)
      if (!(r.pricePerKg > 0)) problems.push(`La receta "${r.shortName || r.id}" requiere precio por kg`)
      if (!(r.kcalPer100g > 0)) problems.push(`La receta "${r.shortName || r.id}" requiere kcal por 100g`)
    })

    if (problems.length > 0) {
      showNotification("error", problems.slice(0, 3).join(" · ") + (problems.length > 3 ? ` (+${problems.length - 3} más)` : ""))
      return
    }

    try {
      setIsSaving(true)
      const res = await fetch("/api/admin/calculator-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al guardar")
      }
      setLastSaved(new Date().toISOString())
      setHasUnsavedChanges(false)
      showNotification("success", "Configuración guardada. La calculadora se actualizará al próximo request.")
    } catch (err) {
      showNotification("error", err instanceof Error ? err.message : "Error al guardar la configuración")
    } finally {
      setIsSaving(false)
    }
  }

  // ── Restaurar defaults ───────────────────────────────────────
  const handleRestore = async () => {
    if (!confirm("¿Restaurar la configuración a los valores originales? Esto borrará todos los cambios guardados.")) return
    try {
      setIsRestoring(true)
      const res = await fetch("/api/admin/calculator-config", { method: "DELETE" })
      if (!res.ok) throw new Error("Error al restaurar")
      setConfig(cloneDeep(DEFAULT_CALCULATOR_CONFIG))
      setHasUnsavedChanges(false)
      setLastSaved(new Date().toISOString())
      showNotification("success", "Configuración restaurada a los valores por defecto.")
    } catch (err) {
      showNotification("error", err instanceof Error ? err.message : "Error al restaurar")
    } finally {
      setIsRestoring(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#2a7880]" size={32} />
      </div>
    )
  }

  const activeRecipes = config.recipes.filter((r) => r.isActive).length

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Configuración de la Calculadora</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeRecipes} receta{activeRecipes !== 1 ? "s" : ""} activa{activeRecipes !== 1 ? "s" : ""}
            {lastSaved && (
              <> · Guardado: {new Date(lastSaved).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleRestore}
            disabled={isRestoring || isSaving}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {isRestoring ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RotateCcw size={14} />
            )}
            Restaurar defaults
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isRestoring}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-colors ${
              hasUnsavedChanges ? "bg-[#2a7880] hover:bg-[#1d636b] shadow-sm" : "bg-gray-400"
            }`}
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {hasUnsavedChanges ? "Guardar cambios" : "Sin cambios"}
          </button>
        </div>
      </div>

      {/* ── Notification ── */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-4 p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
              notification.type === "success"
                ? "bg-[#eef7f8] text-[#1d636b] border border-[#7AB8BF]/40"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 size={16} className="flex-shrink-0" />
            ) : (
              <AlertTriangle size={16} className="flex-shrink-0" />
            )}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Info callout ── */}
      <div className="mb-5 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <span>
          Los cambios guardados afectan la calculadora en tiempo real (próximo request del usuario).
          Los cambios no guardados se perderán al salir.
        </span>
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#2a7880] text-[#2a7880] bg-[#f0f9fa]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "recipes" && (
                <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.id ? "bg-[#2a7880] text-white" : "bg-gray-200 text-gray-600"
                }`}>
                  {activeRecipes}/{config.recipes.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenido de tab ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === "recipes" && (
            <RecipesTab
              recipes={config.recipes}
              onChange={(r) => updateConfig({ recipes: r })}
            />
          )}
          {activeTab === "texts" && (
            <TextsTab
              sections={config.sections}
              onChange={(s) => updateConfig({ sections: s })}
            />
          )}
          {activeTab === "prices" && (
            <PricesTab
              config={{
                pricePerKg: config.pricePerKg,
                deliveryDays: config.deliveryDays,
                firstOrderDiscount: config.firstOrderDiscount,
              }}
              onChange={updateConfig}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Footer con botón guardar sticky ── */}
      <AnimatePresence>
        {hasUnsavedChanges && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-[#2a7880] text-white px-5 py-3 rounded-full font-semibold text-sm shadow-lg hover:bg-[#1d636b] disabled:opacity-60 transition-colors"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Guardar cambios
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
