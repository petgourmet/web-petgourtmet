import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ManualStorageSetupPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Configuración Manual de Storage</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Instrucciones para configurar Storage manualmente</CardTitle>
          <CardDescription>Sigue estos pasos para crear los buckets necesarios en Supabase Storage</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Paso 1: Accede al panel de Supabase</h2>
            <p>Inicia sesión en tu cuenta de Supabase y selecciona tu proyecto.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Paso 2: Navega a Storage</h2>
            <p>En el menú lateral, haz clic en "Storage" para acceder al administrador de almacenamiento.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Paso 3: Crea los buckets necesarios</h2>
            <p>Necesitarás crear los siguientes buckets:</p>
            <ul className="list-disc pl-6 mt-2">
              <li>
                <strong>images</strong> - Para almacenar imágenes de productos
              </li>
              <li>
                <strong>avatars</strong> - Para almacenar avatares de usuarios
              </li>
              <li>
                <strong>documents</strong> - Para almacenar documentos
              </li>
            </ul>
            <p className="mt-2">Para cada bucket:</p>
            <ol className="list-decimal pl-6 mt-2">
              <li>Haz clic en "New Bucket" o "Nuevo bucket"</li>
              <li>Ingresa el nombre del bucket (images, avatars o documents)</li>
              <li>
                Marca la opción "Public bucket" o "Bucket público" si deseas que los archivos sean accesibles
                públicamente
              </li>
              <li>Haz clic en "Create" o "Crear"</li>
            </ol>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Paso 4: Configura las políticas RLS</h2>
            <p>Para cada bucket, necesitarás configurar políticas de seguridad RLS:</p>
            <ol className="list-decimal pl-6 mt-2">
              <li>Haz clic en el bucket que acabas de crear</li>
              <li>Ve a la pestaña "Policies" o "Políticas"</li>
              <li>Haz clic en "New Policy" o "Nueva política"</li>
              <li>Configura las siguientes políticas para cada bucket:</li>
            </ol>

            <div className="mt-4 p-4 bg-gray-100 rounded-md">
              <h3 className="font-semibold mb-2">Política de lectura pública:</h3>
              <ul className="list-disc pl-6">
                <li>
                  <strong>Policy name:</strong> allow_public_select
                </li>
                <li>
                  <strong>For operation:</strong> SELECT
                </li>
                <li>
                  <strong>Policy definition:</strong> true
                </li>
              </ul>

              <h3 className="font-semibold mb-2 mt-4">Política de escritura para usuarios autenticados:</h3>
              <ul className="list-disc pl-6">
                <li>
                  <strong>Policy name:</strong> allow_authenticated_insert
                </li>
                <li>
                  <strong>For operation:</strong> INSERT
                </li>
                <li>
                  <strong>Policy definition:</strong> auth.role() = 'authenticated'
                </li>
              </ul>

              <h3 className="font-semibold mb-2 mt-4">Política de actualización para usuarios autenticados:</h3>
              <ul className="list-disc pl-6">
                <li>
                  <strong>Policy name:</strong> allow_authenticated_update
                </li>
                <li>
                  <strong>For operation:</strong> UPDATE
                </li>
                <li>
                  <strong>Policy definition:</strong> auth.role() = 'authenticated'
                </li>
              </ul>

              <h3 className="font-semibold mb-2 mt-4">Política de eliminación para usuarios autenticados:</h3>
              <ul className="list-disc pl-6">
                <li>
                  <strong>Policy name:</strong> allow_authenticated_delete
                </li>
                <li>
                  <strong>For operation:</strong> DELETE
                </li>
                <li>
                  <strong>Policy definition:</strong> auth.role() = 'authenticated'
                </li>
              </ul>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Paso 5: Verifica la configuración</h2>
            <p>
              Una vez creados los buckets y configuradas las políticas, regresa a la aplicación y verifica que puedes
              subir archivos correctamente.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuración mediante SQL</CardTitle>
          <CardDescription>
            Alternativamente, puedes ejecutar el siguiente SQL en el Editor SQL de Supabase
          </CardDescription>
        </CardHeader>

        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
            {`-- Crear el bucket 'images' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Crear el bucket 'avatars' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Crear el bucket 'documents' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Configurar políticas RLS para el bucket 'images'
-- Permitir lectura pública
CREATE POLICY "allow_public_select_images"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- Permitir escritura a usuarios autenticados
CREATE POLICY "allow_authenticated_insert_images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Permitir actualización a usuarios autenticados
CREATE POLICY "allow_authenticated_update_images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'images');

-- Permitir eliminación a usuarios autenticados
CREATE POLICY "allow_authenticated_delete_images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images');

-- Configurar políticas similares para 'avatars'
CREATE POLICY "allow_public_select_avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "allow_authenticated_insert_avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "allow_authenticated_update_avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "allow_authenticated_delete_avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- Configurar políticas similares para 'documents'
CREATE POLICY "allow_public_select_documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

CREATE POLICY "allow_authenticated_insert_documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "allow_authenticated_update_documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "allow_authenticated_delete_documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
