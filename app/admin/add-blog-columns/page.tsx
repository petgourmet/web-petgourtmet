import { AddBlogColumns } from "@/components/admin/add-blog-columns"

export default function AddBlogColumnsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Añadir Columnas de Blog</h1>
        <AddBlogColumns />
      </div>
    </div>
  )
}
