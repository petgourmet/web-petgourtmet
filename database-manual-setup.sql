-- Script SQL manual para ejecutar directamente en Supabase
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
SELECT 'Configuración de tablas completada correctamente' as resultado;
