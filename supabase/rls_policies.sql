-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

-- Política para profiles: solo el propio usuario o un admin puede ver/editar su perfil
CREATE POLICY "Usuarios pueden ver su propio perfil" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden actualizar su propio perfil" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Política para que los administradores puedan ver y editar todos los perfiles
CREATE POLICY "Admins pueden ver todos los perfiles" 
  ON public.profiles 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins pueden actualizar todos los perfiles" 
  ON public.profiles 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política para productos: todos pueden ver, solo admins pueden modificar
CREATE POLICY "Cualquiera puede ver productos" 
  ON public.products 
  FOR SELECT 
  USING (true);

CREATE POLICY "Solo admins pueden modificar productos" 
  ON public.products 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Aplicar políticas similares para las demás tablas
-- Categorías
CREATE POLICY "Cualquiera puede ver categorías" 
  ON public.categories 
  FOR SELECT 
  USING (true);

CREATE POLICY "Solo admins pueden modificar categorías" 
  ON public.categories 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Tamaños de productos
CREATE POLICY "Cualquiera puede ver tamaños de productos" 
  ON public.product_sizes 
  FOR SELECT 
  USING (true);

CREATE POLICY "Solo admins pueden modificar tamaños de productos" 
  ON public.product_sizes 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Imágenes de productos
CREATE POLICY "Cualquiera puede ver imágenes de productos" 
  ON public.product_images 
  FOR SELECT 
  USING (true);

CREATE POLICY "Solo admins pueden modificar imágenes de productos" 
  ON public.product_images 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Pedidos: usuarios pueden ver sus propios pedidos, admins pueden ver todos
CREATE POLICY "Usuarios pueden ver sus propios pedidos" 
  ON public.orders 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins pueden ver todos los pedidos" 
  ON public.orders 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins pueden modificar todos los pedidos" 
  ON public.orders 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Items de pedidos
CREATE POLICY "Usuarios pueden ver sus propios items de pedidos" 
  ON public.order_items 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins pueden ver todos los items de pedidos" 
  ON public.order_items 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins pueden modificar todos los items de pedidos" 
  ON public.order_items 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Blogs: todos pueden ver, solo admins pueden modificar
CREATE POLICY "Cualquiera puede ver blogs" 
  ON public.blogs 
  FOR SELECT 
  USING (true);

CREATE POLICY "Solo admins pueden modificar blogs" 
  ON public.blogs 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Categorías de blogs
CREATE POLICY "Cualquiera puede ver categorías de blogs" 
  ON public.blog_categories 
  FOR SELECT 
  USING (true);

CREATE POLICY "Solo admins pueden modificar categorías de blogs" 
  ON public.blog_categories 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
