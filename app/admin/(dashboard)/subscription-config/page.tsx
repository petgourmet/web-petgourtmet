"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Save, Settings, Percent } from "lucide-react"

interface SubscriptionConfig {
  id: number
  period: string
  default_discount_percentage: number
  is_active: boolean
}

const PERIOD_LABELS = {
  weekly: "Semanal",
  monthly: "Mensual",
  quarterly: "Trimestral",
  annual: "Anual",
}

export default function SubscriptionConfigPage() {
  const [configs, setConfigs] = useState<SubscriptionConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase.from("subscription_config").select("*").order("id")

      if (error) throw error
      setConfigs(data || [])
    } catch (error) {
      console.error("Error al cargar configuración:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración de suscripciones",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfigChange = (id: number, field: string, value: number | boolean) => {
    setConfigs(configs.map((config) => (config.id === id ? { ...config, [field]: value } : config)))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const config of configs) {
        const { error } = await supabase
          .from("subscription_config")
          .update({
            default_discount_percentage: config.default_discount_percentage,
            is_active: config.is_active,
          })
          .eq("id", config.id)

        if (error) throw error
      }

      toast({
        title: "Configuración guardada",
        description: "Los descuentos de suscripción se han actualizado correctamente",
      })
    } catch (error) {
      console.error("Error al guardar configuración:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración de Suscripciones</h1>
          <p className="text-gray-600">Configura los descuentos por defecto para cada período de suscripción</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {configs.map((config) => (
          <Card key={config.id}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Suscripción {PERIOD_LABELS[config.period as keyof typeof PERIOD_LABELS]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor={`active-${config.id}`}>Activo</Label>
                <Switch
                  id={`active-${config.id}`}
                  checked={config.is_active}
                  onCheckedChange={(checked) => handleConfigChange(config.id, "is_active", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`discount-${config.id}`}>Descuento por Defecto (%)</Label>
                <div className="relative">
                  <Input
                    id={`discount-${config.id}`}
                    type="number"
                    min="0"
                    max="50"
                    step="0.01"
                    value={config.default_discount_percentage}
                    onChange={(e) =>
                      handleConfigChange(
                        config.id,
                        "default_discount_percentage",
                        Number.parseFloat(e.target.value) || 0,
                      )
                    }
                    className="pr-8"
                  />
                  <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500">Este descuento se aplicará por defecto a nuevos productos</p>
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm text-gray-600">
                  <strong>Frecuencia:</strong>{" "}
                  {config.period === "weekly"
                    ? "Cada 7 días"
                    : config.period === "monthly"
                      ? "Cada 30 días"
                      : config.period === "quarterly"
                        ? "Cada 90 días"
                        : "Cada 365 días"}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información Importante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-gray-600">
            • Los descuentos configurados aquí se aplicarán por defecto a nuevos productos
          </p>
          <p className="text-sm text-gray-600">
            • Puedes personalizar el descuento individualmente para cada producto en su página de edición
          </p>
          <p className="text-sm text-gray-600">• Los cambios no afectan suscripciones ya existentes</p>
          <p className="text-sm text-gray-600">
            • La suscripción semanal es ideal para productos perecederos o de consumo rápido
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
