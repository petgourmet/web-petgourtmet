import { NextResponse } from "next/server"
import { createBlogTables } from "@/lib/supabase/create-blog-tables"

export async function GET() {
  try {
    const result = await createBlogTables()

    if (!result.success) {
      return NextResponse.json({ error: "Error al crear tablas de blogs", details: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Tablas de blogs creadas/actualizadas correctamente" })
  } catch (error) {
    console.error("Error en la API de creación de tablas de blogs:", error)
    return NextResponse.json({ error: "Error interno del servidor", details: error }, { status: 500 })
  }
}
