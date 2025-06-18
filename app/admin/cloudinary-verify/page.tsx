import { CloudinaryVerifier } from "@/components/admin/cloudinary-verifier"

export default function CloudinaryVerifyPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Verificación de Cloudinary</h1>
          <p className="text-gray-600 mt-2">
            Verifica que todas las credenciales de Cloudinary estén configuradas correctamente.
          </p>
        </div>

        <CloudinaryVerifier />
      </div>
    </div>
  )
}
