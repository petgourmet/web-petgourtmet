"use client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { X } from "lucide-react"
import { createPortal } from "react-dom"
import { useEffect, useState } from "react"

// Tipo para los filtros
export type Filters = {
  priceRange: [number, number]
  features: string[]
  sortBy: string
}

interface ProductFiltersProps {
  filters: Filters
  setFilters: (filters: Filters) => void
  showFilters: boolean
  setShowFilters: (show: boolean) => void
  applyFilters: () => void
  features: string[]
  maxPrice: number
}

export function ProductFilters({
  filters,
  setFilters,
  showFilters,
  setShowFilters,
  applyFilters,
  features = ["Natural", "Hipoalergénico", "Sin Conservantes", "Alta Palatabilidad", "Bajo en Calorías"],
  maxPrice = 100,
}: ProductFiltersProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!showFilters || !mounted) return null

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 z-[9999] flex justify-center items-start p-4 pt-[150px]"
      onClick={() => setShowFilters(false)}
    >
      <div className="bg-white dark:bg-[#e7ae84] rounded-3xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Rango de Precio</h3>
              <div className="px-2">
                <Slider
                  defaultValue={[filters.priceRange[0], filters.priceRange[1]]}
                  max={maxPrice}
                  step={1}
                  onValueChange={(value) => {
                    setFilters({
                      ...filters,
                      priceRange: [value[0], value[1]],
                    })
                  }}
                  className="mb-4"
                />
                <div className="flex items-center justify-between dark:text-white">
                  <span>${filters.priceRange[0]}</span>
                  <span>${filters.priceRange[1]}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Características</h3>
              <div className="space-y-1">
                {features.map((feature) => (
                  <div key={feature} className="flex items-center space-x-2">
                    <Checkbox
                      id={`feature-${feature?.toLowerCase().replace(/\s+/g, "-") || ''}`}
                      checked={filters.features.includes(feature)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFilters({ ...filters, features: [...filters.features, feature] })
                        } else {
                          setFilters({
                            ...filters,
                            features: filters.features.filter((f) => f !== feature),
                          })
                        }
                      }}
                      className="dark:border-white"
                    />
                    <Label
                      htmlFor={`feature-${feature?.toLowerCase().replace(/\s+/g, "-") || ''}`}
                      className="dark:text-white"
                    >
                      {feature}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2 dark:text-white">Ordenar por</h3>
              <RadioGroup
                value={filters.sortBy}
                onValueChange={(value) => setFilters({ ...filters, sortBy: value })}
                className="space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="sort-relevance" value="relevance" className="dark:border-white dark:text-white" />
                  <Label htmlFor="sort-relevance" className="dark:text-white">
                    Relevancia
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="sort-price-asc" value="price-asc" className="dark:border-white dark:text-white" />
                  <Label htmlFor="sort-price-asc" className="dark:text-white">
                    Precio: menor a mayor
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    id="sort-price-desc"
                    value="price-desc"
                    className="dark:border-white dark:text-white"
                  />
                  <Label htmlFor="sort-price-desc" className="dark:text-white">
                    Precio: mayor a menor
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="sort-rating" value="rating" className="dark:border-white dark:text-white" />
                  <Label htmlFor="sort-rating" className="dark:text-white">
                    Mejor valorados
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    id="sort-popularity"
                    value="popularity"
                    className="dark:border-white dark:text-white"
                  />
                  <Label htmlFor="sort-popularity" className="dark:text-white">
                    Popularidad
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-3 pt-3 border-t">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={() => {
                  setFilters({
                    priceRange: [0, maxPrice],
                    features: [],
                    sortBy: "relevance",
                  })
                }}
              >
                Restablecer
              </Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-full" onClick={applyFilters}>
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
