-- Este script debe ejecutarse desde el Editor SQL de Supabase
-- con la opción "Run as administrator" activada

-- Crear el bucket de imágenes si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Crear políticas para el bucket de imágenes
-- Permitir a todos leer imágenes (son públicas)
CREATE POLICY "Imágenes visibles para todos" ON storage.objects
FOR SELECT
USING (bucket_id = 'images');

-- Permitir a usuarios autenticados subir imágenes
CREATE POLICY "Usuarios autenticados pueden subir imágenes" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Permitir a usuarios autenticados actualizar sus propias imágenes
CREATE POLICY "Usuarios autenticados pueden actualizar sus imágenes" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'images' AND auth.uid() = owner);

-- Permitir a usuarios autenticados eliminar sus propias imágenes
CREATE POLICY "Usuarios autenticados pueden eliminar sus imágenes" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'images' AND auth.uid() = owner);
