"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, AlertCircle, Upload } from "lucide-react"

export default function StorageTest() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [bucketExists, setBucketExists] = useState<boolean | null>(null)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    details?: string
  } | null>(null)
  const [testingUpload, setTestingUpload] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      try {
        // Verificar sesión
        const { data: sessionData } = await supabase.auth.getSession()
        const session = sessionData.session

        if (!session) {
          setLoading(false)
          return
        }

        setUser(session.user)

        // Verificar rol
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()

        if (profileError) {
          console.error("Error al obtener perfil:", profileError)
        } else {
          setUserRole(profileData?.role || null)
        }

        // Verificar bucket
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

        if (bucketsError) {
          console.error("Error al listar buckets:", bucketsError)
        } else {
          const imagesBucket = buckets?.find((b) => b.name === "images")
          setBucketExists(!!imagesBucket)
        }

        setLoading(false)
      } catch (error) {
        console.error("Error al verificar autenticación:", error)
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const testUpload = async () => {
    setTestingUpload(true)
    setTestResult(null)

    try {
      // Crear un pequeño archivo de prueba (1x1 pixel PNG transparente)
      const base64Data =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAEDQIHq4C7oQAAAABJRU5ErkJggg=="
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }

      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: "image/png" })
      const file = new File([blob], "test-upload.png", { type: "image/png" })

      // Intentar subir el archivo
      console.log("Iniciando prueba de subida...")
      const filePath = `test/test-${Date.now()}.png`

      const { data, error } = await supabase.storage.from("images").upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      })

      if (error) {
        console.error("Error en prueba de subida:", error)
        setTestResult({
          success: false,
          message: "Error al subir archivo de prueba",
          details: error.message,
        })
        return
      }

      console.log("Archivo subido exitosamente:", data)

      // Intentar eliminar el archivo de prueba
      const { error: deleteError } = await supabase.storage.from("images").remove([filePath])

      if (deleteError) {
        console.warn("No se pudo eliminar el archivo de prueba:", deleteError)
      }

      setTestResult({
        success: true,
        message: "¡Prueba exitosa! Puedes subir archivos al bucket 'images'.",
      })
    } catch (error: any) {
      console.error("Error inesperado en prueba:", error)
      setTestResult({
        success: false,
        message: "Error inesperado durante la prueba",
        details: error.message || "Error desconocido",
      })
    } finally {
      setTestingUpload(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 text-2xl font-bold">Diagnóstico de Almacenamiento</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estado de Autenticación</CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Autenticado como {user.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Rol:</span>
                  <span className={userRole === "admin" ? "text-green-600" : "text-yellow-600"}>
                    {userRole || "No definido"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-600">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">No autenticado</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado del Bucket</CardTitle>
          </CardHeader>
          <CardContent>
            {bucketExists === true ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Bucket 'images' encontrado</span>
              </div>
            ) : bucketExists === false ? (
              <div className="flex items-center space-x-2 text-red-600">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">Bucket 'images' no encontrado</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-yellow-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Estado del bucket desconocido</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Prueba de Subida</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>
              Esta prueba intentará subir un pequeño archivo de imagen al bucket 'images' para verificar si tienes los
              permisos correctos.
            </p>

            <Button
              onClick={testUpload}
              disabled={testingUpload || !user || !bucketExists}
              className="flex items-center space-x-2"
            >
              {testingUpload ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              <span>{testingUpload ? "Probando..." : "Probar Subida"}</span>
            </Button>

            {testResult && (
              <Alert variant={testResult.success ? "default" : "destructive"} className="mt-4">
                {testResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{testResult.success ? "Éxito" : "Error"}</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>{testResult.message}</p>
                  {testResult.details && <p className="text-sm opacity-80">{testResult.details}</p>}
                  {!testResult.success && (
                    <div className="mt-2 rounded-md bg-background p-3 text-sm">
                      <p className="font-medium">Solución recomendada:</p>
                      <p className="mt-1">
                        Ejecuta el script SQL de corrección de políticas RLS en la consola SQL de Supabase.
                      </p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Instrucciones para Solucionar Problemas de Permisos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Si estás experimentando problemas para subir archivos a pesar de tener el rol de administrador, sigue estos
            pasos:
          </p>

          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Ve al{" "}
              <a
                href="https://app.supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                panel de control de Supabase
              </a>
            </li>
            <li>Selecciona tu proyecto</li>
            <li>Ve a "SQL Editor" en el menú lateral</li>
            <li>Crea un nuevo script SQL</li>
            <li>Copia y pega el siguiente código SQL:</li>
          </ol>

          <pre className="overflow-auto rounded-md bg-gray-100 p-4 text-sm dark:bg-gray-800">
            {`-- Primero, eliminamos cualquier política existente para el bucket 'images'
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects FOR SELECT;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects FOR INSERT;
DROP POLICY IF EXISTS "Allow admin uploads" ON storage.objects FOR INSERT;
DROP POLICY IF EXISTS "Allow admin updates" ON storage.objects FOR UPDATE;
DROP POLICY IF EXISTS "Allow admin deletes" ON storage.objects FOR DELETE;

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
);`}
          </pre>

          <p>
            Después de ejecutar este script, cierra sesión y vuelve a iniciar sesión para que los cambios surtan efecto.
            Luego, intenta subir una imagen nuevamente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
