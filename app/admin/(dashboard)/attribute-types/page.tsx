"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import type { AttributeType } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Edit, Trash2, Save, X, Info, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"

export default function AttributeTypesPage() {
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    input_type: 'select'
  })

  const inputTypes = [
    { value: 'select', label: '📋 Dropdown (Lista desplegable)', description: 'Ideal para muchas opciones' },
    { value: 'button', label: '🔘 Botones', description: 'Visual, ideal para pocas opciones' },
    { value: 'color', label: '🎨 Selector de Color', description: 'Para colores o variantes visuales' },
    { value: 'text', label: '✏️ Texto Libre', description: 'Texto personalizado por el cliente' },
    { value: 'number', label: '🔢 Número', description: 'Valores numéricos' }
  ]

  useEffect(() => {
    loadAttributeTypes()
  }, [])

  async function loadAttributeTypes() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('attribute_types')
        .select('*')
        .order('display_order', { ascending: true })
      
      if (error) throw error
      setAttributeTypes(data || [])
    } catch (error) {
      console.error('Error cargando tipos de atributos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los tipos de atributos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!formData.name || !formData.display_name) {
      toast({
        title: "Error de validación",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        // Actualizar existente
        const { error } = await supabase
          .from('attribute_types')
          .update({
            name: formData.name,
            display_name: formData.display_name,
            input_type: formData.input_type
          })
          .eq('id', editingId)
        
        if (error) throw error
        
        toast({
          title: "Éxito",
          description: "Tipo de atributo actualizado correctamente"
        })
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('attribute_types')
          .insert([{ 
            ...formData, 
            is_system: false,
            display_order: attributeTypes.length + 1
          }])
        
        if (error) throw error
        
        toast({
          title: "Éxito",
          description: "Tipo de atributo creado correctamente"
        })
      }
      
      resetForm()
      loadAttributeTypes()
    } catch (error: any) {
      console.error('Error guardando:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el tipo de atributo",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number, isSystem: boolean) {
    if (isSystem) {
      toast({
        title: "No permitido",
        description: "Los atributos del sistema no se pueden eliminar",
        variant: "destructive"
      })
      return
    }

    if (!confirm('¿Estás seguro de eliminar este tipo de atributo? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('attribute_types')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      toast({
        title: "Éxito",
        description: "Tipo de atributo eliminado correctamente"
      })
      loadAttributeTypes()
    } catch (error: any) {
      console.error('Error eliminando:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el tipo de atributo",
        variant: "destructive"
      })
    }
  }

  function resetForm() {
    setFormData({ name: '', display_name: '', input_type: 'select' })
    setIsCreating(false)
    setEditingId(null)
  }

  function startEdit(attr: AttributeType) {
    setFormData({
      name: attr.name,
      display_name: attr.display_name,
      input_type: attr.input_type
    })
    setEditingId(attr.id)
    setIsCreating(true)
  }

  function formatSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tipos de Atributos</h1>
          <p className="text-gray-500 mt-2">
            Gestiona los tipos de atributos disponibles para crear variantes de productos
          </p>
        </div>
        
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} size="lg">
            <Plus className="h-5 w-5 mr-2" /> Nuevo Atributo
          </Button>
        )}
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>¿Qué son los tipos de atributos?</AlertTitle>
        <AlertDescription>
          Los tipos de atributos definen las características que pueden variar en tus productos.
          Por ejemplo: <strong>Tamaño</strong> (500g, 1kg), <strong>Sabor</strong> (Pollo, Res), 
          <strong>Color</strong> (Rojo, Azul), etc. Puedes crear tantos como necesites.
        </AlertDescription>
      </Alert>

      {isCreating && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>
              {editingId ? '✏️ Editar Tipo de Atributo' : '➕ Crear Nuevo Tipo de Atributo'}
            </CardTitle>
            <CardDescription>
              Define un nuevo tipo de atributo que podrás usar en tus productos con variantes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="display_name">Nombre para Mostrar *</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => {
                    const displayName = e.target.value
                    setFormData({ 
                      ...formData, 
                      display_name: displayName,
                      name: formatSlug(displayName)
                    })
                  }}
                  placeholder="ej: Tamaño, Sabor, Color, Edad"
                />
                <p className="text-xs text-gray-500">
                  Este es el nombre que verán los usuarios
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre Técnico (Slug) *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: formatSlug(e.target.value) })}
                  placeholder="ej: size, flavor, color"
                  className="font-mono"
                />
                <p className="text-xs text-gray-500">
                  Identificador único (sin espacios, solo letras minúsculas)
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="input_type">Tipo de Control de Usuario *</Label>
                <Select
                  value={formData.input_type}
                  onValueChange={(value) => setFormData({ ...formData, input_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {inputTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{type.label}</span>
                          <span className="text-xs text-gray-500">{type.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Define cómo se mostrará este atributo al usuario en la tienda
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {editingId ? 'Actualizar' : 'Crear'}
              </Button>
              <Button variant="outline" onClick={resetForm} disabled={saving}>
                <X className="h-4 w-4 mr-2" /> Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tipos de Atributos Disponibles ({attributeTypes.length})</CardTitle>
          <CardDescription>
            Lista de todos los tipos de atributos que puedes usar en tus productos
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {attributeTypes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Plus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No hay tipos de atributos</p>
              <p className="text-sm">Crea tu primer tipo de atributo para comenzar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre Técnico</TableHead>
                  <TableHead>Nombre Visible</TableHead>
                  <TableHead>Tipo de Control</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attributeTypes.map(attr => (
                  <TableRow key={attr.id}>
                    <TableCell>
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                        {attr.name}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{attr.display_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {inputTypes.find(t => t.value === attr.input_type)?.label.split(' ')[0]} {inputTypes.find(t => t.value === attr.input_type)?.label.split(' ').slice(1).join(' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {attr.is_system ? (
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                          🔒 Sistema
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          ✨ Personalizado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(attr)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!attr.is_system && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(attr.id, attr.is_system)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
