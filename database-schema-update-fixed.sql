-- SQL para actualizar las tablas de productos con los campos necesarios (CORREGIDO)

-- Actualizar tabla products con nuevos campos
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sale_type VARCHAR(10) DEFAULT 'unit' CHECK (sale_type IN ('unit', 'weight')),
ADD COLUMN IF NOT EXISTS weight_reference TEXT,
ADD COLUMN IF NOT EXISTS subscription_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_types JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS subscription_discount NUMERIC(5,2) DEFAULT 10.00;

-- Asegurar que la tabla product_images existe con la estructura correcta
CREATE TABLE IF NOT EXISTS product_images (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt TEXT,
    display_order INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar que la tabla product_features existe
CREATE TABLE IF NOT EXISTS product_features (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50) DEFAULT 'pastel-green',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar que la tabla product_sizes existe
CREATE TABLE IF NOT EXISTS product_sizes (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    weight VARCHAR(50) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    stock INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar que la tabla product_reviews existe
CREATE TABLE IF NOT EXISTS product_reviews (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    verified BOOLEAN DEFAULT false,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar que la tabla categories existe
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    image TEXT,
    color VARCHAR(50) DEFAULT '#6366f1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_features_product_id ON product_features(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id ON product_sizes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at (CORREGIDOS)
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_images_updated_at ON product_images;
CREATE TRIGGER update_product_images_updated_at 
    BEFORE UPDATE ON product_images 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_reviews_updated_at ON product_reviews;
CREATE TRIGGER update_product_reviews_updated_at 
    BEFORE UPDATE ON product_reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar categorías por defecto si no existen
INSERT INTO categories (name, slug, description, color) VALUES
('Para Premiar', 'para-premiar', 'Productos especiales para premiar a tu mascota', '#10b981'),
('Para Complementar', 'para-complementar', 'Complementos nutricionales para una dieta balanceada', '#3b82f6'),
('Para Celebrar', 'para-celebrar', 'Productos especiales para ocasiones especiales', '#f59e0b'),
('Nuestras Recetas', 'nuestras-recetas', 'Recetas especiales desarrolladas por nuestros expertos', '#8b5cf6')
ON CONFLICT (slug) DO NOTHING;

-- Habilitar RLS en las tablas
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Allow public read access to products" ON products;
DROP POLICY IF EXISTS "Allow public read access to categories" ON categories;
DROP POLICY IF EXISTS "Allow public read access to product_images" ON product_images;
DROP POLICY IF EXISTS "Allow public read access to product_features" ON product_features;
DROP POLICY IF EXISTS "Allow public read access to product_sizes" ON product_sizes;
DROP POLICY IF EXISTS "Allow public read access to product_reviews" ON product_reviews;

DROP POLICY IF EXISTS "Allow admin full access to products" ON products;
DROP POLICY IF EXISTS "Allow admin full access to categories" ON categories;
DROP POLICY IF EXISTS "Allow admin full access to product_images" ON product_images;
DROP POLICY IF EXISTS "Allow admin full access to product_features" ON product_features;
DROP POLICY IF EXISTS "Allow admin full access to product_sizes" ON product_sizes;
DROP POLICY IF EXISTS "Allow admin full access to product_reviews" ON product_reviews;

-- Políticas para lectura pública
CREATE POLICY "Allow public read access to products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public read access to categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access to product_images" ON product_images FOR SELECT USING (true);
CREATE POLICY "Allow public read access to product_features" ON product_features FOR SELECT USING (true);
CREATE POLICY "Allow public read access to product_sizes" ON product_sizes FOR SELECT USING (true);
CREATE POLICY "Allow public read access to product_reviews" ON product_reviews FOR SELECT USING (true);

-- Políticas para administradores (insertar, actualizar, eliminar)
CREATE POLICY "Allow admin full access to products" ON products FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Allow admin full access to categories" ON categories FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Allow admin full access to product_images" ON product_images FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Allow admin full access to product_features" ON product_features FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Allow admin full access to product_sizes" ON product_sizes FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Allow admin full access to product_reviews" ON product_reviews FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);
