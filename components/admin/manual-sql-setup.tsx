"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Copy, ExternalLink, AlertTriangle, CheckCircle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

export function ManualSqlSetup() {
  const [copied, setCopied] = useState(false)

  const sqlScript = `-- Script SQL manual para ejecutar directamente en Supabase
-- Ve al editor SQL de Supabase y ejecuta este script

-- 1. Añadir columna display_order a product_images si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'product_images' 
    AND column_name = 'display_order'
  ) THEN
    ALTER TABLE product_images ADD COLUMN display_order INTEGER DEFAULT 1;
  END IF;
END $$;

-- 2. Crear tabla product_sizes si no existe
CREATE TABLE IF NOT EXISTS product_sizes (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  weight TEXT NOT NULL,
  price NUMERIC NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear tabla product_features si no existe
CREATE TABLE IF NOT EXISTS product_features (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#10b981',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON product_images(product_id, display_order);
CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id ON product_sizes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_features_product_id ON product_features(product_id);

-- 5. Deshabilitar RLS temporalmente para evitar problemas de permisos
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_sizes DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_features DISABLE ROW LEVEL SECURITY;

-- 6. Mensaje de confirmación
SELECT 'Configuración de tablas completada correctamente' as resultado;`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sqlScript)
      setCopied(true)
      toast({
        title: "Copiado",
        description: "Script SQL copiado al portapapeles",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar al portapapeles",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Configuración Manual Requerida</AlertTitle>
        <AlertDescription>
          La configuración automática ha fallado. Por favor, ejecuta el script SQL manualmente en Supabase.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Configuración Manual de Base de Datos
          </CardTitle>
          <CardDescription>
            Sigue estos pasos para configurar manualmente las tablas de productos en Supabase:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Pasos a seguir:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Copia el script SQL de abajo</li>
              <li>Ve al panel de Supabase</li>
              <li>Navega a "SQL Editor"</li>
              <li>Pega el script y ejecuta</li>
              <li>Verifica que se ejecutó correctamente</li>
              <li>Regresa aquí e intenta crear un producto</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Button onClick={copyToClipboard} variant="outline" className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              {copied ? "Copiado!" : "Copiar Script SQL"}
            </Button>
            <Button asChild variant="outline" className="flex items-center gap-2">
              <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Abrir Supabase
              </a>
            </Button>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{sqlScript}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
