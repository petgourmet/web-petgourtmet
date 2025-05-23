import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin-client"

export async function POST() {
  try {
    const supabase = createClient()

    // Verificar si la columna ya existe
    const { data: columnExists, error: checkError } = await supabase.rpc("column_exists", {
      table_name: "product_images",
      column_name: "display_order",
    })

    if (checkError) {
      // Si la función RPC no existe, creamos la función y luego verificamos
      await supabase.rpc("create_column_exists_function")
      const { data: columnExistsRetry } = await supabase.rpc("column_exists", {
        table_name: "product_images",
        column_name: "display_order",
      })

      if (!columnExistsRetry) {
        // Ejecutar SQL para añadir la columna display_order
        const { error: alterError } = await supabase.query(`
          ALTER TABLE product_images 
          ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 1;
          
          -- Crear índice para mejorar el rendimiento de consultas ordenadas
          CREATE INDEX IF NOT EXISTS idx_product_images_display_order 
          ON product_images(product_id, display_order);
        `)

        if (alterError) throw alterError
      }
    } else if (!columnExists) {
      // La columna no existe, añadirla
      const { error: alterError } = await supabase.query(`
        ALTER TABLE product_images 
        ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 1;
        
        -- Crear índice para mejorar el rendimiento de consultas ordenadas
        CREATE INDEX IF NOT EXISTS idx_product_images_display_order 
        ON product_images(product_id, display_order);
      `)

      if (alterError) throw alterError
    }

    return NextResponse.json({ success: true, message: "Esquema de product_images actualizado correctamente" })
  } catch (error: any) {
    console.error("Error al actualizar el esquema:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar el esquema" },
      { status: 500 },
    )
  }
}
