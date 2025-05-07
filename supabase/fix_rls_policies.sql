-- Primero, eliminamos las políticas existentes que están causando recursión
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins pueden ver todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins pueden actualizar todos los perfiles" ON public.profiles;

-- Ahora creamos políticas simplificadas que no causan recursión

-- Política para permitir a cualquier usuario autenticado ver su propio perfil
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Política para permitir a cualquier usuario autenticado actualizar su propio perfil
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Política para permitir a usuarios con email específico ver todos los perfiles
-- Esto evita la recursión al no consultar la tabla profiles dentro de la política
CREATE POLICY "Specific users can view all profiles"
ON public.profiles
FOR SELECT
USING (
  auth.email() IN ('admin@petgourmet.com', 'cristoferscalante@gmail.com')
);

-- Política para permitir a usuarios con email específico actualizar todos los perfiles
CREATE POLICY "Specific users can update all profiles"
ON public.profiles
FOR UPDATE
USING (
  auth.email() IN ('admin@petgourmet.com', 'cristoferscalante@gmail.com')
);

-- Política para permitir a usuarios con email específico insertar perfiles
CREATE POLICY "Specific users can insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK (
  auth.email() IN ('admin@petgourmet.com', 'cristoferscalante@gmail.com')
);

-- Política para permitir a usuarios con email específico eliminar perfiles
CREATE POLICY "Specific users can delete profiles"
ON public.profiles
FOR DELETE
USING (
  auth.email() IN ('admin@petgourmet.com', 'cristoferscalante@gmail.com')
);
