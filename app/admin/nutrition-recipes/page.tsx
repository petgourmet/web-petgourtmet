"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { Plus, Save, X, Loader2, Edit2, Trash2, AlertCircle, CheckCircle2 } from "lucide-react"

interface NutritionRecipe {
  id: string
  name: string
  short_name: string
  description: string
  image: string
  protein_percent: number
  fat_percent: number
  fiber_percent: number
  calories_per_100g: number
  price_per_kg: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

type FormMode = "create" | "edit" | null

export default function NutritionRecipesPage() {
  const [recipes, setRecipes] = useState<NutritionRecipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [editingRecipe, setEditingRecipe] = useState<NutritionRecipe | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Form state
  const [formData, setFormData] = useState<Partial<NutritionRecipe>>({
    name: "",
    short_name: "",
    description: "",
    image: "",
    protein_percent: 0,
    fat_percent: 0,
    fiber_percent: 0,
    calories_per_100g: 0,
    price_per_kg: 850,
    is_active: true,
  })

  // Fetch recipes
  const fetchRecipes = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/nutrition-recipes")
      if (!response.ok) throw new Error("Error al cargar recetas")
      const data = await response.json()
      setRecipes(data.recipes || [])
    } catch (error) {
      showNotification("error", "Error al cargar recetas")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRecipes()
  }, [])

  // Show notification
  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  // Open create form
  const handleCreate = () => {
    setFormMode("create")
    setEditingRecipe(null)
    setFormData({
      name: "",
      short_name: "",
      description: "",
      image: "",
      protein_percent: 0,
      fat_percent: 0,
      fiber_percent: 0,
      calories_per_100g: 0,
      price_per_kg: 850,
      is_active: true,
    })
  }

  // Open edit form
  const handleEdit = (recipe: NutritionRecipe) => {
    setFormMode("edit")
    setEditingRecipe(recipe)
    setFormData(recipe)
  }

  // Close form
  const handleCloseForm = () => {
    setFormMode(null)
    setEditingRecipe(null)
  }

  // Save recipe (create or update)
  const handleSave = async () => {
    try {
      setIsSaving(true)

      const method = formMode === "create" ? "POST" : "PUT"
      const url = formMode === "create" 
        ? "/api/admin/nutrition-recipes"
        : `/api/admin/nutrition-recipes`

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al guardar receta")
      }

      showNotification("success", formMode === "create" ? "Receta creada exitosamente" : "Receta actualizada exitosamente")
      fetchRecipes()
      handleCloseForm()
    } catch (error) {
      showNotification("error", error instanceof Error ? error.message : "Error al guardar")
    } finally {
      setIsSaving(false)
    }
  }

  // Delete recipe (soft delete)
  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta receta?")) return

    try {
      const response = await fetch(`/api/admin/nutrition-recipes`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Error al eliminar receta")

      showNotification("success", "Receta eliminada exitosamente")
      fetchRecipes()
    } catch (error) {
      showNotification("error", "Error al eliminar receta")
    }
  }

  // Toggle active status
  const handleToggleActive = async (recipe: NutritionRecipe) => {
    try {
      const response = await fetch(`/api/admin/nutrition-recipes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...recipe,
          is_active: !recipe.is_active,
        }),
      })

      if (!response.ok) throw new Error("Error al actualizar estado")

      showNotification("success", `Receta ${!recipe.is_active ? "activada" : "desactivada"}`)
      fetchRecipes()
    } catch (error) {
      showNotification("error", "Error al actualizar estado")
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Recetas Nutricionales</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona las recetas disponibles para planes personalizados
          </p>
        </div>
        <motion.button
          onClick={handleCreate}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 bg-[#2a7880] text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-[#1d636b] transition-colors"
        >
          <Plus size={18} />
          Nueva Receta
        </motion.button>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
              notification.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span className="flex-1 font-medium">{notification.message}</span>
            <button onClick={() => setNotification(null)}>
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[#2a7880]" />
        </div>
      )}

      {/* Recipes Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => (
            <motion.div
              key={recipe.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`bg-white border rounded-xl p-4 shadow-sm ${
                !recipe.is_active ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  <Image
                    src={recipe.image}
                    alt={recipe.name}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/full-nutritious-dog-bowl.webp"
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{recipe.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{recipe.short_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold text-[#2a7880]">
                      ${recipe.price_per_kg} MXN/kg
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      recipe.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {recipe.is_active ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-600 mb-3 line-clamp-2">{recipe.description}</p>

              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-500">Proteína</span>
                  <p className="font-semibold text-gray-800">{recipe.protein_percent}%</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-500">Grasa</span>
                  <p className="font-semibold text-gray-800">{recipe.fat_percent}%</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-500">Fibra</span>
                  <p className="font-semibold text-gray-800">{recipe.fiber_percent}%</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-500">Calorías</span>
                  <p className="font-semibold text-gray-800">{recipe.calories_per_100g} kcal/100g</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(recipe)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                >
                  <Edit2 size={14} />
                  Editar
                </button>
                <button
                  onClick={() => handleToggleActive(recipe)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    recipe.is_active
                      ? "bg-amber-50 hover:bg-amber-100 text-amber-700"
                      : "bg-green-50 hover:bg-green-100 text-green-700"
                  }`}
                >
                  {recipe.is_active ? "Desactivar" : "Activar"}
                </button>
                <button
                  onClick={() => handleDelete(recipe.id)}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {formMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={handleCloseForm}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  {formMode === "create" ? "Nueva Receta" : "Editar Receta"}
                </h2>
                <button onClick={handleCloseForm} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2a7880] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre corto
                    </label>
                    <input
                      type="text"
                      value={formData.short_name || ""}
                      onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2a7880] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2a7880] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL de imagen
                  </label>
                  <input
                    type="text"
                    value={formData.image || ""}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2a7880] focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Proteína (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.protein_percent || 0}
                      onChange={(e) => setFormData({ ...formData, protein_percent: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2a7880] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grasa (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.fat_percent || 0}
                      onChange={(e) => setFormData({ ...formData, fat_percent: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2a7880] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fibra (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.fiber_percent || 0}
                      onChange={(e) => setFormData({ ...formData, fiber_percent: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2a7880] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Calorías/100g
                    </label>
                    <input
                      type="number"
                      value={formData.calories_per_100g || 0}
                      onChange={(e) => setFormData({ ...formData, calories_per_100g: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2a7880] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio por kg (MXN)
                  </label>
                  <input
                    type="number"
                    value={formData.price_per_kg || 850}
                    onChange={(e) => setFormData({ ...formData, price_per_kg: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2a7880] focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active || false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-[#2a7880] rounded focus:ring-[#2a7880]"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Activa (visible para usuarios)
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCloseForm}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2a7880] text-white rounded-lg font-semibold hover:bg-[#1d636b] disabled:opacity-50 transition-colors"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
