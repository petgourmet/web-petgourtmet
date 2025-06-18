import { CloudinarySetup } from "@/components/admin/cloudinary-setup"

export default function SetupCloudinaryPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configuración de Cloudinary</h1>
          <p className="text-gray-600 mt-2">
            Configura el upload preset para permitir la subida de imágenes sin autenticación.
          </p>
        </div>

        <CloudinarySetup />

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">¿Qué hace esta configuración?</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Crea un upload preset llamado "petgourmet_unsigned"</li>
            <li>• Permite subir imágenes sin autenticación desde el cliente</li>
            <li>• Organiza las imágenes en la carpeta "petgourmet/"</li>
            <li>• Aplica optimizaciones automáticas (tamaño, calidad, formato)</li>
            <li>• Limita el tamaño máximo a 2MB</li>
          </ul>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="font-semibold text-yellow-900 mb-2">Si la configuración falla:</h3>
          <p className="text-sm text-yellow-800">
            El sistema usará automáticamente el preset "ml_default" como respaldo. Las imágenes se subirán correctamente
            pero sin las optimizaciones personalizadas.
          </p>
        </div>
      </div>
    </div>
  )
}
