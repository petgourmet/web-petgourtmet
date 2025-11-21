-- =====================================================
-- SISTEMA DE VARIANTES DE PRODUCTOS
-- Fecha: 2025-11-21
-- Descripción: Implementación de sistema flexible de variantes
-- Compatible con productos existentes
-- =====================================================

-- 1. Agregar campo product_type a la tabla products (si no existe)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'product_type'
  ) THEN
    ALTER TABLE products 
    ADD COLUMN product_type VARCHAR(20) DEFAULT 'simple' CHECK (product_type IN ('simple', 'variable'));
  END IF;
END $$;

-- Comentario para documentar
COMMENT ON COLUMN products.product_type IS 'Tipo de producto: simple (sin variantes) o variable (con variantes)';

-- 2. Crear tabla para tipos de atributos personalizados
CREATE TABLE IF NOT EXISTS attribute_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  input_type VARCHAR(50) DEFAULT 'select' CHECK (input_type IN ('select', 'button', 'color', 'text', 'number')),
  is_system BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE attribute_types IS 'Define los tipos de atributos disponibles para variantes (tamaño, sabor, color, etc.)';
COMMENT ON COLUMN attribute_types.name IS 'Nombre técnico del atributo (slug): size, flavor, color';
COMMENT ON COLUMN attribute_types.display_name IS 'Nombre para mostrar al usuario: Tamaño, Sabor, Color';
COMMENT ON COLUMN attribute_types.input_type IS 'Tipo de control UI: select, button, color, text, number';
COMMENT ON COLUMN attribute_types.is_system IS 'true para atributos predefinidos del sistema que no se pueden eliminar';

-- Insertar atributos comunes del sistema
INSERT INTO attribute_types (name, display_name, input_type, is_system, display_order) VALUES
('size', 'Tamaño', 'button', true, 1),
('weight', 'Peso', 'button', true, 2),
('flavor', 'Sabor', 'button', true, 3),
('color', 'Color', 'color', true, 4),
('age', 'Edad de la Mascota', 'select', true, 5),
('breed_size', 'Tamaño de Raza', 'select', true, 6)
ON CONFLICT (name) DO NOTHING;

-- 3. Crear tabla para atributos de productos
CREATE TABLE IF NOT EXISTS product_attributes (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_type_id INTEGER NOT NULL REFERENCES attribute_types(id) ON DELETE RESTRICT,
  values TEXT[] NOT NULL,
  is_required BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE product_attributes IS 'Atributos configurados para un producto específico con sus valores';
COMMENT ON COLUMN product_attributes.values IS 'Array de valores posibles para este atributo: ["500g", "1kg", "2kg"]';

-- 4. Crear tabla para variantes de productos
CREATE TABLE IF NOT EXISTS product_variants (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}',
  price NUMERIC(10,2) NOT NULL,
  compare_at_price NUMERIC(10,2),
  stock INTEGER DEFAULT 0,
  track_inventory BOOLEAN DEFAULT true,
  image VARCHAR(500),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE product_variants IS 'Variantes específicas de productos con sus atributos, precios y stock';
COMMENT ON COLUMN product_variants.attributes IS 'JSON con atributos de la variante: {"size": "1kg", "flavor": "Pollo"}';
COMMENT ON COLUMN product_variants.sku IS 'Código único de inventario (Stock Keeping Unit)';
COMMENT ON COLUMN product_variants.compare_at_price IS 'Precio original antes de descuento (para mostrar tachado)';

-- 5. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_product_attributes_product_id ON product_attributes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_attributes_type ON product_attributes(attribute_type_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_attributes ON product_variants USING gin(attributes);
CREATE INDEX IF NOT EXISTS idx_product_variants_active ON product_variants(product_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_attribute_types_order ON attribute_types(display_order);

-- 6. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear triggers para actualizar updated_at
DROP TRIGGER IF EXISTS update_attribute_types_updated_at ON attribute_types;
CREATE TRIGGER update_attribute_types_updated_at
    BEFORE UPDATE ON attribute_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_variants_updated_at ON product_variants;
CREATE TRIGGER update_product_variants_updated_at
    BEFORE UPDATE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Migrar productos existentes con product_sizes a sistema de variantes
-- Solo migrar si tienen tamaños definidos
DO $$
DECLARE
  product_record RECORD;
  size_record RECORD;
  variant_attributes JSONB;
BEGIN
  -- Marcar productos con sizes como variables
  UPDATE products 
  SET product_type = 'variable'
  WHERE id IN (
    SELECT DISTINCT product_id 
    FROM product_sizes 
    WHERE weight IS NOT NULL AND weight != ''
  ) AND product_type = 'simple';

  -- Migrar cada product_size a product_variant
  FOR product_record IN 
    SELECT DISTINCT product_id 
    FROM product_sizes 
    WHERE weight IS NOT NULL AND weight != ''
  LOOP
    -- Asegurarse de que el producto tenga un atributo de tamaño configurado
    IF NOT EXISTS (
      SELECT 1 FROM product_attributes 
      WHERE product_id = product_record.product_id
    ) THEN
      -- Obtener ID del tipo de atributo 'size' o 'weight'
      DECLARE
        size_attr_id INTEGER;
        all_sizes TEXT[];
      BEGIN
        SELECT id INTO size_attr_id 
        FROM attribute_types 
        WHERE name = 'size' OR name = 'weight' 
        LIMIT 1;

        -- Obtener todos los tamaños únicos para este producto
        SELECT array_agg(DISTINCT weight ORDER BY weight) INTO all_sizes
        FROM product_sizes
        WHERE product_id = product_record.product_id
          AND weight IS NOT NULL 
          AND weight != '';

        -- Crear el atributo para el producto
        IF size_attr_id IS NOT NULL AND all_sizes IS NOT NULL THEN
          INSERT INTO product_attributes (product_id, attribute_type_id, values, is_required, display_order)
          VALUES (product_record.product_id, size_attr_id, all_sizes, true, 1)
          ON CONFLICT DO NOTHING;
        END IF;
      END;
    END IF;

    -- Migrar cada size a una variante
    FOR size_record IN 
      SELECT * FROM product_sizes 
      WHERE product_id = product_record.product_id
        AND weight IS NOT NULL 
        AND weight != ''
    LOOP
      variant_attributes := jsonb_build_object('size', size_record.weight);
      
      INSERT INTO product_variants (
        product_id, 
        name, 
        attributes, 
        price, 
        stock, 
        display_order,
        is_active
      )
      VALUES (
        size_record.product_id,
        size_record.weight,
        variant_attributes,
        size_record.price,
        size_record.stock,
        size_record.id,
        true
      )
      ON CONFLICT (sku) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Para productos simples (sin sizes), crear una variante por defecto
  FOR product_record IN 
    SELECT p.* 
    FROM products p
    WHERE p.product_type = 'simple'
      AND NOT EXISTS (
        SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id
      )
  LOOP
    INSERT INTO product_variants (
      product_id,
      name,
      attributes,
      price,
      stock,
      is_active,
      track_inventory
    )
    VALUES (
      product_record.id,
      'Opción única',
      '{"default": "true"}'::jsonb,
      product_record.price,
      product_record.stock,
      true,
      true
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- 9. Crear vistas útiles para consultas
CREATE OR REPLACE VIEW product_variants_with_details AS
SELECT 
  pv.*,
  p.name as product_name,
  p.product_type,
  p.image as product_image,
  p.category_id,
  -- Calcular stock total por producto
  SUM(pv.stock) OVER (PARTITION BY pv.product_id) as total_product_stock
FROM product_variants pv
JOIN products p ON p.id = pv.product_id;

COMMENT ON VIEW product_variants_with_details IS 'Vista con variantes y detalles del producto padre';

-- 10. Agregar políticas RLS (Row Level Security) si no existen
ALTER TABLE attribute_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Política para lectura pública
DROP POLICY IF EXISTS "Lectura pública de tipos de atributos" ON attribute_types;
CREATE POLICY "Lectura pública de tipos de atributos" 
  ON attribute_types FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Lectura pública de atributos de productos" ON product_attributes;
CREATE POLICY "Lectura pública de atributos de productos" 
  ON product_attributes FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Lectura pública de variantes" ON product_variants;
CREATE POLICY "Lectura pública de variantes" 
  ON product_variants FOR SELECT 
  USING (is_active = true);

-- Políticas para administradores (insertar, actualizar, eliminar)
-- Nota: Ajusta esto según tu sistema de autenticación
DROP POLICY IF EXISTS "Admin gestión tipos de atributos" ON attribute_types;
CREATE POLICY "Admin gestión tipos de atributos" 
  ON attribute_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin gestión atributos de productos" ON product_attributes;
CREATE POLICY "Admin gestión atributos de productos" 
  ON product_attributes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin gestión variantes" ON product_variants;
CREATE POLICY "Admin gestión variantes" 
  ON product_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 11. Crear función helper para generar SKU automático
CREATE OR REPLACE FUNCTION generate_product_sku(
  p_product_id INTEGER,
  p_attributes JSONB
)
RETURNS VARCHAR AS $$
DECLARE
  base_sku VARCHAR;
  attr_part VARCHAR := '';
  counter INTEGER := 1;
  final_sku VARCHAR;
BEGIN
  -- Obtener un prefijo basado en el ID del producto
  base_sku := 'PRD' || LPAD(p_product_id::TEXT, 5, '0');
  
  -- Agregar parte de atributos al SKU
  SELECT string_agg(UPPER(SUBSTRING(value::TEXT, 1, 3)), '-') INTO attr_part
  FROM jsonb_each_text(p_attributes);
  
  IF attr_part IS NOT NULL AND attr_part != '' THEN
    base_sku := base_sku || '-' || attr_part;
  END IF;
  
  final_sku := base_sku;
  
  -- Asegurar unicidad
  WHILE EXISTS (SELECT 1 FROM product_variants WHERE sku = final_sku) LOOP
    counter := counter + 1;
    final_sku := base_sku || '-' || counter;
  END LOOP;
  
  RETURN final_sku;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_product_sku IS 'Genera un SKU único para una variante basado en el ID del producto y sus atributos';

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================

-- Información de resumen
DO $$
DECLARE
  total_products INTEGER;
  simple_products INTEGER;
  variable_products INTEGER;
  total_variants INTEGER;
  total_attr_types INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_products FROM products;
  SELECT COUNT(*) INTO simple_products FROM products WHERE product_type = 'simple';
  SELECT COUNT(*) INTO variable_products FROM products WHERE product_type = 'variable';
  SELECT COUNT(*) INTO total_variants FROM product_variants;
  SELECT COUNT(*) INTO total_attr_types FROM attribute_types;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'MIGRACIÓN COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Total de productos: %', total_products;
  RAISE NOTICE 'Productos simples: %', simple_products;
  RAISE NOTICE 'Productos con variantes: %', variable_products;
  RAISE NOTICE 'Total de variantes creadas: %', total_variants;
  RAISE NOTICE 'Tipos de atributos disponibles: %', total_attr_types;
  RAISE NOTICE '==============================================';
END $$;
