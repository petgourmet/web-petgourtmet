import { ManualSqlSetup } from "@/components/admin/manual-sql-setup"

export default function ManualSqlSetupPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configuración Manual de Base de Datos</h1>
        <p className="text-gray-600">
          Configura manualmente las tablas de productos cuando la configuración automática falla.
        </p>
      </div>
      <ManualSqlSetup />
    </div>
  )
}
