-- Primero, eliminamos cualquier política existente para el bucket 'images'
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin deletes" ON storage.objects;

-- Política para permitir lectura pública (cualquier persona puede ver las imágenes)
CREATE POLICY "Allow public read access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'images');

-- Política para permitir a los administradores subir archivos
CREATE POLICY "Allow admin uploads" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'images' AND 
  (auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE role = 'admin'
  ))
);

-- Política para permitir a los administradores actualizar archivos
CREATE POLICY "Allow admin updates" 
ON storage.objects FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'images' AND 
  (auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE role = 'admin'
  ))
);

-- Política para permitir a los administradores eliminar archivos
CREATE POLICY "Allow admin deletes" 
ON storage.objects FOR DELETE 
TO authenticated
USING (
  bucket_id = 'images' AND 
  (auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE role = 'admin'
  ))
);
