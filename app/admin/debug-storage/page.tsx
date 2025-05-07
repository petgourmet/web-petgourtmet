"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CheckCircle, XCircle, AlertCircle, Upload } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function DebugStorage() {
  const [loading, setLoading] = useState(true)
  const [authStatus, setAuthStatus] = useState<{
    isAuthenticated: boolean
    userId: string | null
    email: string | null
    role: string | null
  }>({
    isAuthenticated: false,
    userId: null,
    email: null,
    role: null,
  })
  const [bucketStatus, setBucketStatus] = useState<{
    exists: boolean
    buckets: string[]
    error: string | null
  }>({
    exists: false,
    buckets: [],
    error: null,
  })
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    url: string | null
  } | null>(null)
  const [sqlQuery, setSqlQuery] = useState<string>(
    `-- Primero, eliminamos cualquier política existente para el bucket 'images'
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
);`,
  )
  const [executing, setExecuting] = useState(false)
  const [sqlResult, setSqlResult] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("Error al verificar sesión:", error)
          setAuthStatus({
            isAuthenticated: false,
            userId: null,
            email: null,
            role: null,
          })
          return
        }

        if (!session) {
          console.warn("No hay sesión activa")
          setAuthStatus({
            isAuthenticated: false,
            userId: null,
            email: null,
            role: null,
          })
          return
        }

        // Verificar si el usuario es administrador
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()

        setAuthStatus({
          isAuthenticated: true,
          userId: session.user.id,
          email: session.user.email,
          role: profileData?.role || null,
        })
      } catch (error) {
        console.error("Error inesperado al verificar autenticación:", error)
        setAuthStatus({
          isAuthenticated: false,
          userId: null,
          email: null,
          role: null,
        })
      }
    }

    async function checkBucket() {
      try {
        console.log("Verificando buckets...")
        const { data: buckets, error: listError } = await supabase.storage.listBuckets()

        if (listError) {
          console.error("Error al listar buckets:", listError)
          setBucketStatus({
            exists: false,
            buckets: [],
            error: listError.message,
          })
          return
        }

        console.log("Buckets disponibles:", buckets)
        const bucketNames = buckets?.map((b) => b.name) || []
        const imagesBucket = buckets?.find((bucket) => bucket.name === "images")

        setBucketStatus({
          exists: !!imagesBucket,
          buckets: bucketNames,
          error: null,
        })
      } catch (error: any) {
        console.error("Error inesperado al verificar bucket:", error)
        setBucketStatus({
          exists: false,
          buckets: [],
          error: error.message || "Error desconocido",
        })
      }
    }

    Promise.all([checkAuth(), checkBucket()]).finally(() => {
      setLoading(false)
    })
  }, [])

  const handleTestUpload = async () => {
    setTestResult(null)
    try {
      // Crear un pequeño archivo de prueba (1x1 pixel PNG transparente)
      const base64Data =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      const byteCharacters = atob(base64Data)
      const byteArrays = []
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArrays.push(byteCharacters.charCodeAt(i))
      }
      const byteArray = new Uint8Array(byteArrays)
      const blob = new Blob([byteArray], { type: "image/png" })
      const file = new File([blob], "test-image.png", { type: "image/png" })

      // Intentar subir el archivo
      const filePath = `test/test-${Date.now()}.png`
      console.log(`Intentando subir archivo de prueba a images/${filePath}...`)

      const { data, error: uploadError } = await supabase.storage.from("images").upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      })

      if (uploadError) {
        console.error("Error al subir archivo de prueba:", uploadError)
        setTestResult({
          success: false,
          message: `Error: ${uploadError.message}`,
          url: null,
        })
        return
      }

      console.log("Archivo de prueba subido exitosamente:", data)
      const { data: urlData } = supabase.storage.from("images").getPublicUrl(filePath)

      setTestResult({
        success: true,
        message: "¡Archivo subido exitosamente!",
        url: urlData.publicUrl,
      })
    } catch (error: any) {
      console.error("Error inesperado al subir archivo de prueba:", error)
      setTestResult({
        success: false,
        message: `Error inesperado: ${error.message || "Error desconocido"}`,
        url: null,
      })
    }
  }

  const handleExecuteSQL = async () => {
    setExecuting(true)
    setSqlResult(null)

    try {
      // Esta es una simulación ya que no podemos ejecutar SQL directamente desde el cliente
      // En una aplicación real, esto debería ser una llamada a una API que ejecute el SQL
      setSqlResult(
        "Este es un entorno de simulación. Para ejecutar este SQL:\n\n" +
          "1. Ve al panel de administración de Supabase\n" +
          "2. Selecciona 'SQL Editor'\n" +
          "3. Copia y pega el SQL en el editor\n" +
          "4. Haz clic en 'Run'\n\n" +
          "Después de ejecutar el SQL, cierra sesión y vuelve a iniciar sesión para que los cambios surtan efecto.",
      )
    } catch (error: any) {
      setSqlResult(`Error: ${error.message || "Error desconocido"}`)
    } finally {
      setExecuting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">Diagnóstico de Almacenamiento</h1>

      <div className="grid gap-6">
        {/* Estado de autenticación */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {authStatus.isAuthenticated ? (
                <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="mr-2 h-5 w-5 text-red-500" />
              )}
              Estado de Autenticación
            </CardTitle>
            <CardDescription>Información sobre tu sesión actual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <strong>Estado:</strong>{" "}
                {authStatus.isAuthenticated ? (
                  <span className="text-green-500">Autenticado</span>
                ) : (
                  <span className="text-red-500">No autenticado</span>
                )}
              </div>
              {authStatus.isAuthenticated && (
                <>
                  <div>
                    <strong>ID de Usuario:</strong> {authStatus.userId}
                  </div>
                  <div>
                    <strong>Email:</strong> {authStatus.email}
                  </div>
                  <div>
                    <strong>Rol:</strong>{" "}
                    {authStatus.role === "admin" ? (
                      <span className="text-green-500">admin</span>
                    ) : (
                      <span className="text-yellow-500">{authStatus.role || "sin rol"}</span>
                    )}
                  </div>
                </>
              )}

              {!authStatus.isAuthenticated && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No has iniciado sesión</AlertTitle>
                  <AlertDescription>
                    Debes iniciar sesión para poder subir imágenes.
                    <div className="mt-2">
                      <Button variant="outline" size="sm" onClick={() => (window.location.href = "/admin/login")}>
                        Ir a iniciar sesión
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {authStatus.isAuthenticated && authStatus.role !== "admin" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Permisos insuficientes</AlertTitle>
                  <AlertDescription>
                    No tienes el rol de administrador. Necesitas este rol para subir imágenes.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Estado del bucket */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {bucketStatus.exists ? (
                <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="mr-2 h-5 w-5 text-red-500" />
              )}
              Estado del Bucket
            </CardTitle>
            <CardDescription>Información sobre el bucket "images"</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <strong>Bucket "images":</strong>{" "}
                {bucketStatus.exists ? (
                  <span className="text-green-500">Existe</span>
                ) : (
                  <span className="text-red-500">No existe</span>
                )}
              </div>
              <div>
                <strong>Buckets disponibles:</strong>{" "}
                {bucketStatus.buckets.length > 0 ? (
                  <span>{bucketStatus.buckets.join(", ")}</span>
                ) : (
                  <span className="text-yellow-500">Ninguno</span>
                )}
              </div>
              {bucketStatus.error && (
                <div>
                  <strong>Error:</strong> <span className="text-red-500">{bucketStatus.error}</span>
                </div>
              )}

              {!bucketStatus.exists && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Bucket no encontrado</AlertTitle>
                  <AlertDescription>
                    El bucket "images" no existe. Debes crearlo desde el panel de administración de Supabase.
                    <ol className="mt-2 list-decimal pl-5 space-y-1">
                      <li>Ve al panel de administración de Supabase</li>
                      <li>Selecciona "Storage" en el menú lateral</li>
                      <li>Haz clic en "New Bucket"</li>
                      <li>Nombra el bucket exactamente como "images" (sin comillas)</li>
                      <li>Marca la opción "Public bucket" para permitir acceso público a las imágenes</li>
                      <li>Haz clic en "Create bucket"</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Prueba de subida */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              Prueba de Subida
            </CardTitle>
            <CardDescription>Prueba si puedes subir archivos al bucket "images"</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button
                onClick={handleTestUpload}
                disabled={!authStatus.isAuthenticated || !bucketStatus.exists}
                className="w-full"
              >
                Probar subida de archivo
              </Button>

              {testResult && (
                <Alert variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertTitle>{testResult.success ? "Éxito" : "Error"}</AlertTitle>
                  <AlertDescription>
                    {testResult.message}
                    {testResult.url && (
                      <div className="mt-2">
                        <a
                          href={testResult.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 underline"
                        >
                          Ver imagen subida
                        </a>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {!testResult && !authStatus.isAuthenticated && (
                <div className="text-sm text-gray-500">Debes iniciar sesión para probar la subida de archivos.</div>
              )}

              {!testResult && authStatus.isAuthenticated && !bucketStatus.exists && (
                <div className="text-sm text-gray-500">
                  El bucket "images" no existe. Créalo primero para probar la subida.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Solución */}
        <Tabs defaultValue="sql">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sql">SQL para políticas RLS</TabsTrigger>
            <TabsTrigger value="instructions">Instrucciones</TabsTrigger>
          </TabsList>
          <TabsContent value="sql" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>SQL para configurar políticas RLS</CardTitle>
                <CardDescription>
                  Ejecuta este SQL en la consola de Supabase para configurar correctamente las políticas de seguridad
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea value={sqlQuery} onChange={(e) => setSqlQuery(e.target.value)} className="font-mono h-80" />
                <Button onClick={handleExecuteSQL} disabled={executing}>
                  {executing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simular ejecución
                </Button>
                {sqlResult && (
                  <div className="mt-4 rounded-md bg-gray-100 p-4 text-sm">
                    <pre className="whitespace-pre-wrap">{sqlResult}</pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="instructions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Instrucciones para solucionar problemas</CardTitle>
                <CardDescription>Sigue estos pasos para resolver problemas de permisos</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal space-y-4 pl-5">
                  <li>
                    <strong>Verifica tu rol de usuario:</strong>
                    <p>
                      Asegúrate de que tu cuenta tenga el rol 'admin' en la tabla 'profiles'. Según la información
                      mostrada arriba, tu rol es:{" "}
                      <span className={authStatus.role === "admin" ? "text-green-500" : "text-red-500"}>
                        {authStatus.role || "sin rol"}
                      </span>
                      .
                    </p>
                  </li>
                  <li>
                    <strong>Configura las políticas RLS:</strong>
                    <p>
                      Ejecuta el SQL proporcionado en la pestaña "SQL para políticas RLS" en la consola de SQL de
                      Supabase. Esto configurará correctamente los permisos para el bucket "images".
                    </p>
                  </li>
                  <li>
                    <strong>Reinicia la sesión:</strong>
                    <p>
                      Después de ejecutar el SQL, cierra sesión y vuelve a iniciar sesión para que los cambios surtan
                      efecto.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await supabase.auth.signOut()
                        window.location.href = "/admin/login"
                      }}
                      className="mt-2"
                    >
                      Cerrar sesión
                    </Button>
                  </li>
                  <li>
                    <strong>Prueba la subida:</strong>
                    <p>
                      Después de iniciar sesión nuevamente, regresa a esta página y usa el botón "Probar subida de
                      archivo" para verificar si los permisos están configurados correctamente.
                    </p>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
