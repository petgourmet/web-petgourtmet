-- Crear tabla de perfiles (extensión de la tabla auth.users de Supabase)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Trigger para crear un perfil automáticamente cuando se crea un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Tabla de categorías
CREATE TABLE public.categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  image TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#000000'
);

-- Tabla de productos
CREATE TABLE public.products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image TEXT NOT NULL,
  category_id INTEGER REFERENCES public.categories(id),
  featured BOOLEAN DEFAULT false,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  nutritional_info TEXT,
  ingredients TEXT,
  rating DECIMAL(3, 2),
  reviews_count INTEGER DEFAULT 0
);

-- Tabla de tamaños de productos
CREATE TABLE public.product_sizes (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES public.products(id) ON DELETE CASCADE,
  weight TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0
);

-- Tabla de imágenes de productos
CREATE TABLE public.product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT NOT NULL
);

-- Tabla de pedidos
CREATE TABLE public.orders (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shipping_address JSONB,
  payment_intent_id TEXT,
  payment_status TEXT DEFAULT 'pending'
);

-- Tabla de detalles de pedidos
CREATE TABLE public.order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  product_image TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  size TEXT
);

-- Datos iniciales para categorías
INSERT INTO public.categories (name, slug, description, image, color)
VALUES 
  ('Para Premiar', 'premiar', 'Premios y golosinas saludables', '/para_premiar_end.png', 'from-sky-500 to-sky-600'),
  ('Para Celebrar', 'celebrar', 'Productos especiales para celebraciones', '/para_celebrar.png', 'from-pink-500 to-pink-600'),
  ('Para Complementar', 'complementar', 'Complementos alimenticios para tu mascota', '/para_complementar_end.png', 'from-amber-500 to-amber-600'),
  ('Nuestras Recetas', 'recetas', 'Recetas exclusivas para tu mascota', '/nuestras_recetas.png', 'from-green-500 to-green-600');

-- Crear usuario administrador
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'admin@petgourmet.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  'authenticated'
);

-- Asignar rol de administrador
INSERT INTO public.profiles (id, email, role)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'admin@petgourmet.com',
  'admin'
);
