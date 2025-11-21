"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CloudinaryUploader } from "@/components/cloudinary-uploader"
import { Plus, Trash2, Wand2, Image as ImageIcon, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Image from "next/image"
import type { ProductVariant } from "@/lib/supabase/types"

interface VariantAttribute {
  name: string
  values: string[]
}

interface VariantManagerProps {
  variants: Partial<ProductVariant>[]
  attributes: VariantAttribute[]
  onVariantsChange: (variants: Partial<ProductVariant>[]) => void
  onAttributesChange: (attributes: VariantAttribute[]) => void
}

export function VariantManager({ 
  variants, 
  attributes, 
  onVariantsChange,
  onAttributesChange 
}: VariantManagerProps) {
  const [showGenerator, setShowGenerator] = useState(false)

  // Función para generar combinaciones automáticamente
  const generateVariants = () => {
    if (attributes.length === 0) return

    const combinations: Partial<ProductVariant>[] = []
    
    // Generar todas las combinaciones posibles
    function generateCombinations(
      attrs: VariantAttribute[], 
      current: Record<string, string> = {}, 
      index: number = 0
    ) {
      if (index === attrs.length) {
        // Crear nombre descriptivo
        const name = Object.values(current).join(' - ')
        
        combinations.push({
          name,
          attributes: { ...current },
          price: 0,
          stock: 0,
          is_active: true,
          track_inventory: true,
          display_order: combinations.length
        })
        return
      }

      const attr = attrs[index]
      attr.values.forEach(value => {
        generateCombinations(attrs, { ...current, [attr.name]: value }, index + 1)
      })
    }

    generateCombinations(attributes)
    
    // Combinar con variantes existentes (no duplicar)
    const existingKeys = new Set(
      variants.map(v => JSON.stringify(v.attributes))
    )
    
    const newVariants = combinations.filter(
      v => !existingKeys.has(JSON.stringify(v.attributes))
    )

    onVariantsChange([...variants, ...newVariants])
    setShowGenerator(false)
  }

  const addVariantManually = () => {
    const newVariant: Partial<ProductVariant> = {
      name: '',
      attributes: {},
      price: 0,
      stock: 0,
      is_active: true,
      track_inventory: true,
      display_order: variants.length
    }
    onVariantsChange([...variants, newVariant])
  }

  const removeVariant = (index: number) => {
    const newVariants = variants.filter((_, i) => i !== index)
    onVariantsChange(newVariants)
  }

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    const newVariants = [...variants]
    newVariants[index] = {
      ...newVariants[index],
      [field]: value
    }
    onVariantsChange(newVariants)
  }

  const addAttribute = () => {
    onAttributesChange([...attributes, { name: '', values: [] }])
  }

  const updateAttribute = (index: number, field: 'name' | 'values', value: any) => {
    const newAttrs = [...attributes]
    newAttrs[index] = {
      ...newAttrs[index],
      [field]: value
    }
    onAttributesChange(newAttrs)
  }

  const removeAttribute = (index: number) => {
    onAttributesChange(attributes.filter((_, i) => i !== index))
  }

  const calculateCombinations = () => {
    return attributes.reduce((total, attr) => 
      total * (attr.values.length || 1), 1
    )
  }

  return (
    <div className="space-y-6">
      {/* Sección 1: Definir Atributos */}
      <Card>
        <CardHeader>
          <CardTitle>1️⃣ Definir Atributos</CardTitle>
          <p className="text-sm text-gray-500">
            Los atributos son las características que varían (ej: Sabor, Tamaño)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {attributes.map((attr, index) => (
            <div key={index} className="border rounded-lg p-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del Atributo</Label>
                  <Input
                    value={attr.name}
                    onChange={(e) => updateAttribute(index, 'name', e.target.value)}
                    placeholder="ej: Sabor, Tipo, Ingrediente"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valores (separados por coma)</Label>
                  <Input
                    value={attr.values.join(', ')}
                    onChange={(e) => {
                      const values = e.target.value.split(',').map(v => v.trim()).filter(v => v)
                      updateAttribute(index, 'values', values)
                    }}
                    placeholder="Pollo, Carne, Pollo Verduras"
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {attr.values.map((value, vIndex) => (
                      <Badge key={vIndex} variant="secondary">
                        {value}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => removeAttribute(index)}
                className="mt-4"
              >
                <Trash2 className="h-4 w-4 mr-1" /> Eliminar
              </Button>
            </div>
          ))}

          <Button onClick={addAttribute} variant="outline">
            <Plus className="h-4 w-4 mr-1" /> Añadir Atributo
          </Button>
        </CardContent>
      </Card>

      {/* Sección 2: Generar o Añadir Variantes */}
      {attributes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>2️⃣ Generar Variantes</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Combinaciones Posibles</AlertTitle>
              <AlertDescription>
                Con los atributos definidos se pueden generar <strong>{calculateCombinations()} variantes</strong>.
                <br />
                <span className="text-xs text-gray-500 mt-1 block">
                  Ejemplo: {attributes.map(a => `${a.values.length} ${a.name}`).join(' × ')} = {calculateCombinations()} variantes
                </span>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={generateVariants}>
                <Wand2 className="h-4 w-4 mr-2" /> Generar Automáticamente
              </Button>
              <Button onClick={addVariantManually} variant="outline">
                <Plus className="h-4 w-4 mr-2" /> Añadir Manualmente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sección 3: Tabla de Variantes */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>3️⃣ Configurar Variantes ({variants.length})</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Personaliza el nombre, imagen, precio y stock de cada variante
              </p>
            </div>
            {attributes.length === 0 && (
              <Button onClick={addVariantManually} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" /> Añadir Variante
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {variants.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay variantes configuradas</p>
              <p className="text-sm mt-2">
                {attributes.length > 0 
                  ? 'Genera variantes automáticamente o añade una manualmente' 
                  : 'Primero define los atributos para generar variantes'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {variants.map((variant, index) => (
                <Card key={index} className="border-2 hover:border-primary transition-colors">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Columna Izquierda: Imagen */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Imagen de la Variante</Label>
                          <div className="border-2 border-dashed rounded-lg p-4 bg-gray-50">
                            {variant.image ? (
                              <div className="relative">
                                <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-2">
                                  <Image
                                    src={variant.image}
                                    alt={variant.name || 'Variante'}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateVariant(index, 'image', '')}
                                  className="w-full"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" /> Eliminar Imagen
                                </Button>
                              </div>
                            ) : (
                              <CloudinaryUploader
                                folder="products/variants"
                                onImageUploaded={(url) => updateVariant(index, 'image', url)}
                                buttonText="📸 Subir Imagen"
                              />
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            💡 Cada variante puede tener su propia imagen
                          </p>
                        </div>

                        {/* Atributos */}
                        {Object.keys(variant.attributes || {}).length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Atributos</Label>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(variant.attributes || {}).map(([key, value]) => (
                                <Badge key={key} variant="outline" className="text-sm">
                                  <strong>{key}:</strong> {value}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Columna Derecha: Detalles */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor={`variant-name-${index}`}>
                            Nombre de la Variante *
                          </Label>
                          <Input
                            id={`variant-name-${index}`}
                            value={variant.name || ''}
                            onChange={(e) => updateVariant(index, 'name', e.target.value)}
                            placeholder="ej: Pastel Clásico Pollo"
                            className="font-medium"
                          />
                          <p className="text-xs text-gray-500">
                            Este nombre se mostrará al cliente
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`variant-sku-${index}`}>SKU (opcional)</Label>
                          <Input
                            id={`variant-sku-${index}`}
                            value={variant.sku || ''}
                            onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                            placeholder="Ej: PAST-CLAS-POL"
                            className="font-mono text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`variant-price-${index}`}>Precio *</Label>
                            <Input
                              id={`variant-price-${index}`}
                              type="number"
                              step="0.01"
                              value={variant.price || 0}
                              onChange={(e) => updateVariant(index, 'price', parseFloat(e.target.value) || 0)}
                              className="font-bold"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`variant-stock-${index}`}>Stock *</Label>
                            <Input
                              id={`variant-stock-${index}`}
                              type="number"
                              value={variant.stock || 0}
                              onChange={(e) => updateVariant(index, 'stock', parseInt(e.target.value) || 0)}
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                          <Checkbox
                            id={`variant-active-${index}`}
                            checked={variant.is_active ?? true}
                            onCheckedChange={(checked) => updateVariant(index, 'is_active', checked)}
                          />
                          <Label htmlFor={`variant-active-${index}`} className="cursor-pointer">
                            Variante activa (visible en la tienda)
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex justify-between items-center">
                      <Badge variant={variant.is_active ? "default" : "secondary"}>
                        {variant.is_active ? '✅ Activa' : '⏸️ Inactiva'}
                      </Badge>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeVariant(index)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Eliminar Variante
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumen */}
      {variants.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Resumen de Variantes</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Total de variantes: <strong>{variants.length}</strong></li>
              <li>Variantes activas: <strong>{variants.filter(v => v.is_active).length}</strong></li>
              <li>Con imagen: <strong>{variants.filter(v => v.image).length}</strong></li>
              <li>Stock total: <strong>{variants.reduce((sum, v) => sum + (v.stock || 0), 0)}</strong></li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
