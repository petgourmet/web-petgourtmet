import { InitializeBlogTables } from "@/components/admin/initialize-blog-tables"
import { AuthGuard } from "@/components/admin/auth-guard"

export default function InitializeBlogTablesPage() {
  return (
    <AuthGuard requireAdmin={true}>
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Inicialización de Tablas de Blogs</h1>
        <div className="max-w-2xl mx-auto">
          <InitializeBlogTables />
        </div>
      </div>
    </AuthGuard>
  )
}
