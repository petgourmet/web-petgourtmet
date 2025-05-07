-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Permitir acceso público de lectura" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida de archivos a administradores" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización de archivos a administradores" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación de archivos a administradores" ON storage.objects;

-- Política para permitir lectura pública de todos los objetos
CREATE POLICY "Permitir acceso público de lectura"
ON storage.objects FOR SELECT
USING (true);

-- Política para permitir subida de archivos solo a administradores
CREATE POLICY "Permitir subida de archivos a administradores"
ON storage.objects FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    JOIN public.profiles ON auth.users.id = profiles.id
    WHERE auth.uid() = profiles.id AND profiles.role = 'admin'
  )
);

-- Política para permitir actualización de archivos solo a administradores
CREATE POLICY "Permitir actualización de archivos a administradores"
ON storage.objects FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    JOIN public.profiles ON auth.users.id = profiles.id
    WHERE auth.uid() = profiles.id AND profiles.role = 'admin'
  )
);

-- Política para permitir eliminación de archivos solo a administradores
CREATE POLICY "Permitir eliminación de archivos a administradores"
ON storage.objects FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    JOIN public.profiles ON auth.users.id = profiles.id
    WHERE auth.uid() = profiles.id AND profiles.role = 'admin'
  )
);
