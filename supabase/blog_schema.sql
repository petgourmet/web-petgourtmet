-- Tabla para los blogs
CREATE TABLE blogs (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL, -- Contenido en Markdown
  cover_image TEXT NOT NULL, -- URL de la imagen de portada
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  author TEXT,
  category_id INTEGER REFERENCES blog_categories(id),
  is_published BOOLEAN DEFAULT false
);

-- Tabla para categorías de blog
CREATE TABLE blog_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
);

-- Función para generar slugs automáticamente
CREATE OR REPLACE FUNCTION generate_slug() RETURNS TRIGGER AS $$
BEGIN
  NEW.slug := LOWER(REGEXP_REPLACE(NEW.title, '[^a-zA-Z0-9]', '-', 'g'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar slugs automáticamente al insertar
CREATE TRIGGER blogs_generate_slug
BEFORE INSERT ON blogs
FOR EACH ROW
WHEN (NEW.slug IS NULL OR NEW.slug = '')
EXECUTE FUNCTION generate_slug();
