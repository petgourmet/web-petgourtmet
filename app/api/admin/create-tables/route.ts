import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Crear un cliente de Supabase con la clave de servicio para tener permisos completos
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
)

export async function POST(request: Request) {
  try {
    const { table } = await request.json()

    if (!table) {
      return NextResponse.json({ error: "Se requiere el nombre de la tabla" }, { status: 400 })
    }

    if (table === "product_features") {
      // Crear tabla product_features si no existe
      const { error } = await supabaseAdmin.rpc("create_product_features_table")

      if (error) {
        console.error("Error al crear tabla product_features:", error)

        // Intentar crear la tabla directamente con SQL
        const { error: sqlError } = await supabaseAdmin
          .from("_exec_sql")
          .select("*")
          .eq(
            "query",
            `
          CREATE TABLE IF NOT EXISTS product_features (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            color TEXT DEFAULT 'primary',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(product_id, name)
          );
        `,
          )

        if (sqlError) {
          return NextResponse.json({ error: sqlError.message }, { status: 500 })
        }
      }

      return NextResponse.json({ success: true, message: "Tabla product_features creada o ya existente" })
    }

    if (table === "product_reviews") {
      // Crear tabla product_reviews si no existe
      const { error } = await supabaseAdmin.rpc("create_product_reviews_table")

      if (error) {
        console.error("Error al crear tabla product_reviews:", error)

        // Intentar crear la tabla directamente con SQL
        const { error: sqlError } = await supabaseAdmin
          .from("_exec_sql")
          .select("*")
          .eq(
            "query",
            `
          CREATE TABLE IF NOT EXISTS product_reviews (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            user_id UUID,
            user_name TEXT,
            rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
            comment TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(product_id, user_id)
          );
        `,
          )

        if (sqlError) {
          return NextResponse.json({ error: sqlError.message }, { status: 500 })
        }
      }

      return NextResponse.json({ success: true, message: "Tabla product_reviews creada o ya existente" })
    }

    return NextResponse.json({ error: "Tabla no soportada" }, { status: 400 })
  } catch (error) {
    console.error("Error en la API de creación de tablas:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
