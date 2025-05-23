import { FixBlogSchema } from "@/components/admin/fix-blog-schema"
import { AuthGuard } from "@/components/admin/auth-guard"

export default function FixBlogSchemaPage() {
  return (
    <AuthGuard requireAdmin={true}>
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Corrección del Esquema de Blogs</h1>
        <div className="max-w-2xl mx-auto">
          <FixBlogSchema />
        </div>
      </div>
    </AuthGuard>
  )
}
