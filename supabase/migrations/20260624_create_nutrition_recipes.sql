-- ============================================================
-- Migration: Crear tabla nutrition_recipes
-- Descripción: Tabla para productos de la calculadora nutricional
--              Permite gestión desde panel de administración
-- Fecha: 2026-06-24
-- ============================================================

-- Crear tabla nutrition_recipes
CREATE TABLE IF NOT EXISTS public.nutrition_recipes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  short_name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT,
  
  -- Precio
  price_per_kg NUMERIC(10, 2) NOT NULL DEFAULT 850.00,
  
  -- Información nutricional
  protein_source VARCHAR(100), -- 'pollo', 'carne', 'cerdo', 'ternera'
  protein_percentage NUMERIC(5, 2),
  fat_percentage NUMERIC(5, 2),
  fiber_percentage NUMERIC(5, 2),
  
  -- Metadata
  ingredients TEXT, -- Lista de ingredientes
  benefits TEXT, -- Beneficios del producto
  
  -- Control de visibilidad
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_nutrition_recipes_slug ON public.nutrition_recipes(slug);
CREATE INDEX IF NOT EXISTS idx_nutrition_recipes_active ON public.nutrition_recipes(is_active);
CREATE INDEX IF NOT EXISTS idx_nutrition_recipes_display_order ON public.nutrition_recipes(display_order);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_nutrition_recipes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_nutrition_recipes_updated_at
  BEFORE UPDATE ON public.nutrition_recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nutrition_recipes_updated_at();

-- Insertar productos iniciales (migración de data/recipes.ts)
INSERT INTO public.nutrition_recipes (
  name, slug, short_name, description, image_url, price_per_kg,
  protein_source, ingredients, benefits, display_order, is_active
) VALUES
(
  'Pollo Verduras',
  'pollo-verduras',
  'Pollo',
  'Receta balanceada con pollo fresco y vegetales. Rica en proteínas de alta calidad, perfecta para perros activos y en crecimiento.',
  '/cacu/pollo-ver.png',
  850.00,
  'pollo',
  'Pollo fresco, zanahorias, espinacas, arroz integral, aceite de salmón',
  'Alto en proteínas, Fácil digestión, Pelaje brillante, Sistema inmune fuerte',
  1,
  true
),
(
  'Carne Verduras',
  'carne-verduras',
  'Carne',
  'Carne de res magra con vegetales frescos. Excelente fuente de hierro y proteínas, ideal para perros con alta actividad física.',
  '/cacu/carne-ver.png',
  850.00,
  'carne',
  'Carne de res, brócoli, batata, quinoa, aceite de coco',
  'Rica en hierro, Masa muscular, Energía sostenida, Salud cardiovascular',
  2,
  true
),
(
  'Cerdo Verduras',
  'cerdo-verduras',
  'Cerdo',
  'Cerdo magro combinado con verduras nutritivas. Sabor único y textura suave, perfecta para perros exigentes.',
  '/cacu/cerdo-ver.png',
  850.00,
  'cerdo',
  'Cerdo magro, calabaza, chícharos, avena, aceite de linaza',
  'Sabor irresistible, B-vitaminas, Piel saludable, Digestión óptima',
  3,
  true
),
(
  'Ternera Espinacas',
  'ternera-espinacas',
  'Ternera',
  'Ternera tierna con espinacas frescas. Proteína de primera calidad, ideal para cachorros y perros senior.',
  '/cacu/ternera-espi.png',
  850.00,
  'ternera',
  'Ternera, espinacas, camote, lentejas, aceite de oliva',
  'Proteína premium, Antioxidantes, Huesos fuertes, Fácil masticación',
  4,
  true
);

-- Agregar columna a unified_subscriptions para el plan nutricional
ALTER TABLE public.unified_subscriptions
ADD COLUMN IF NOT EXISTS nutrition_plan_config JSONB;

-- Índice para búsquedas en nutrition_plan_config
CREATE INDEX IF NOT EXISTS idx_unified_subscriptions_nutrition_plan
  ON public.unified_subscriptions USING GIN (nutrition_plan_config);

-- Comentarios para documentación
COMMENT ON TABLE public.nutrition_recipes IS 'Catálogo de recetas para la calculadora nutricional';
COMMENT ON COLUMN public.nutrition_recipes.price_per_kg IS 'Precio por kilogramo en MXN';
COMMENT ON COLUMN public.nutrition_recipes.is_active IS 'Si la receta está disponible en la calculadora';
COMMENT ON COLUMN public.nutrition_recipes.display_order IS 'Orden de visualización (menor primero)';
COMMENT ON COLUMN public.unified_subscriptions.nutrition_plan_config IS 'Configuración JSON del plan nutricional personalizado';

-- Permisos (ajustar según tus policies de RLS)
ALTER TABLE public.nutrition_recipes ENABLE ROW LEVEL SECURITY;

-- Policy: Todos pueden leer recetas activas
CREATE POLICY "Anyone can view active nutrition recipes"
  ON public.nutrition_recipes
  FOR SELECT
  USING (is_active = true);

-- Policy: Solo admins pueden editar
CREATE POLICY "Only admins can manage nutrition recipes"
  ON public.nutrition_recipes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
