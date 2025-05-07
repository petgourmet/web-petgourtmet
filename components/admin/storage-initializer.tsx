"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw, Info } from "lucide-react"
import { initializeStorage, checkBucketStatus } from "@/lib/supabase/storage-initializer"
import { toast } from "@/components/ui/use-toast"

export function StorageInitializer() {
  const [isInitializing, setIsInitializing] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [initializationError, setInitializationError] = useState<string | null>(null)
  const [bucketStatus, setBucketStatus] = useState<{
    images?: { exists: boolean; accessible?: boolean; error?: string; fileCount?: number }
    avatars?: { exists: boolean; accessible?: boolean; error?: string; fileCount?: number }
    documents?: { exists: boolean; accessible?: boolean; error?: string; fileCount?: number }
  }>({})

  useEffect(() => {
    checkBuckets()
  }, [])

  async function checkBuckets() {
    setIsChecking(true)
    setInitializationError(null)

    try {
      const imagesStatus = await checkBucketStatus("images")
      const avatarsStatus = await checkBucketStatus("avatars")
      const documentsStatus = await checkBucketStatus("documents")

      setBucketStatus({
        images: imagesStatus,
        avatars: avatarsStatus,
        documents: documentsStatus,
      })
    } catch (error: any) {
      console.error("Error al verificar buckets:", error)
      setInitializationError(error.message || "Error desconocido al verificar buckets")
    } finally {
      setIsChecking(false)
    }
  }

  async function handleInitialize() {
    setIsInitializing(true)
    setInitializationError(null)

    try {
      const result = await initializeStorage()

      if (result.success) {
        toast({
          title: "Storage inicializado",
          description: "Los buckets de Storage se han inicializado correctamente.",
        })

        // Verificar nuevamente el estado de los buckets
        await checkBuckets()
      } else {
        const errorMessage = result.error || "No se pudieron inicializar todos los buckets de Storage."
        setInitializationError(errorMessage)

        toast({
          title: "Error al inicializar Storage",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error al inicializar Storage:", error)
      const errorMessage = error.message || "Ocurrió un error inesperado al inicializar Storage."
      setInitializationError(errorMessage)

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsInitializing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado de Supabase Storage</CardTitle>
        <CardDescription>Verifica y configura los buckets necesarios para la aplicación</CardDescription>
      </CardHeader>

      <CardContent>
        {isChecking ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              <h3 className="text-sm font-medium">Estado de los buckets:</h3>

              <div className="space-y-2">
                <div className="flex items-center">
                  {bucketStatus.images?.exists ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mr-2" />
                  )}
                  <span>Bucket 'images'</span>
                  {bucketStatus.images?.accessible === false && (
                    <span className="ml-2 text-xs text-amber-500">(Existe pero no es accesible)</span>
                  )}
                </div>

                <div className="flex items-center">
                  {bucketStatus.avatars?.exists ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mr-2" />
                  )}
                  <span>Bucket 'avatars'</span>
                  {bucketStatus.avatars?.accessible === false && (
                    <span className="ml-2 text-xs text-amber-500">(Existe pero no es accesible)</span>
                  )}
                </div>

                <div className="flex items-center">
                  {bucketStatus.documents?.exists ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mr-2" />
                  )}
                  <span>Bucket 'documents'</span>
                  {bucketStatus.documents?.accessible === false && (
                    <span className="ml-2 text-xs text-amber-500">(Existe pero no es accesible)</span>
                  )}
                </div>
              </div>
            </div>

            {(!bucketStatus.images?.exists || !bucketStatus.avatars?.exists || !bucketStatus.documents?.exists) && (
              <Alert variant="warning" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Buckets faltantes</AlertTitle>
                <AlertDescription>
                  Algunos buckets necesarios no existen. Haz clic en "Inicializar Storage" para crearlos.
                </AlertDescription>
              </Alert>
            )}

            {(bucketStatus.images?.accessible === false ||
              bucketStatus.avatars?.accessible === false ||
              bucketStatus.documents?.accessible === false) && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Problemas de acceso</AlertTitle>
                <AlertDescription>
                  Algunos buckets existen pero no son accesibles. Esto puede deberse a problemas de permisos.
                </AlertDescription>
              </Alert>
            )}

            {initializationError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error de inicialización</AlertTitle>
                <AlertDescription>
                  {initializationError}
                  <div className="mt-2 text-sm">
                    <p>
                      <strong>Posibles soluciones:</strong>
                    </p>
                    <ul className="list-disc pl-5 mt-1">
                      <li>
                        Verifica que la clave de servicio (SUPABASE_SERVICE_ROLE_KEY) esté configurada correctamente.
                      </li>
                      <li>Asegúrate de tener permisos de administrador en el proyecto de Supabase.</li>
                      <li>Intenta crear los buckets manualmente desde el panel de Supabase.</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Alert variant="info" className="mt-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Información importante</AlertTitle>
              <AlertDescription>
                Para crear buckets se requiere la clave de servicio (SUPABASE_SERVICE_ROLE_KEY) configurada en las
                variables de entorno. Si no tienes esta clave, deberás crear los buckets manualmente desde el panel de
                Supabase.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button onClick={checkBuckets} disabled={isChecking} variant="outline">
          {isChecking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" /> Verificar buckets
            </>
          )}
        </Button>

        <Button onClick={handleInitialize} disabled={isInitializing || isChecking}>
          {isInitializing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Inicializando...
            </>
          ) : (
            <>Inicializar Storage</>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
