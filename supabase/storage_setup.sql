-- Este script debe ejecutarse desde el Editor SQL de Supabase
-- con la opción "Run as administrator" activada

-- Crear buckets si no existen
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('images', 'images', true),
  ('avatars', 'avatars', true),
  ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Configurar políticas para el bucket de imágenes (público)
-- Permitir a todos leer imágenes
CREATE POLICY "Imágenes visibles para todos" ON storage.objects
FOR SELECT
USING (bucket_id = 'images')
ON CONFLICT DO NOTHING;

-- Permitir a usuarios autenticados subir imágenes
CREATE POLICY "Usuarios autenticados pueden subir imágenes" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images')
ON CONFLICT DO NOTHING;

-- Permitir a usuarios autenticados actualizar sus propias imágenes
CREATE POLICY "Usuarios autenticados pueden actualizar sus imágenes" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'images' AND auth.uid() = owner)
ON CONFLICT DO NOTHING;

-- Permitir a usuarios autenticados eliminar sus propias imágenes
CREATE POLICY "Usuarios autenticados pueden eliminar sus imágenes" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'images' AND auth.uid() = owner)
ON CONFLICT DO NOTHING;

-- Configurar políticas para el bucket de avatares (público)
-- Permitir a todos leer avatares
CREATE POLICY "Avatares visibles para todos" ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars')
ON CONFLICT DO NOTHING;

-- Permitir a usuarios autenticados subir su propio avatar
CREATE POLICY "Usuarios pueden subir su propio avatar" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
ON CONFLICT DO NOTHING;

-- Permitir a usuarios autenticados actualizar su propio avatar
CREATE POLICY "Usuarios pueden actualizar su propio avatar" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid() = owner)
ON CONFLICT DO NOTHING;

-- Permitir a usuarios autenticados eliminar su propio avatar
CREATE POLICY "Usuarios pueden eliminar su propio avatar" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid() = owner)
ON CONFLICT DO NOTHING;

-- Configurar políticas para el bucket de documentos (privado)
-- Permitir a usuarios autenticados ver sus propios documentos
CREATE POLICY "Usuarios pueden ver sus propios documentos" ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND auth.uid() = owner)
ON CONFLICT DO NOTHING;

-- Permitir a usuarios autenticados subir sus propios documentos
CREATE POLICY "Usuarios pueden subir sus propios documentos" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents')
ON CONFLICT DO NOTHING;

-- Permitir a usuarios autenticados actualizar sus propios documentos
CREATE POLICY "Usuarios pueden actualizar sus propios documentos" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND auth.uid() = owner)
ON CONFLICT DO NOTHING;

-- Permitir a usuarios autenticados eliminar sus propios documentos
CREATE POLICY "Usuarios pueden eliminar sus propios documentos" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND auth.uid() = owner)
ON CONFLICT DO NOTHING;

-- Permitir a administradores ver todos los documentos
CREATE POLICY "Administradores pueden ver todos los documentos" ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND 
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
ON CONFLICT DO NOTHING;
