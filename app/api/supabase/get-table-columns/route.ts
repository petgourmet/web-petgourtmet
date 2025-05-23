import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tableName = searchParams.get("table")

    if (!tableName) {
      return NextResponse.json({ error: "Table name is required" }, { status: 400 })
    }

    const supabase = createClient()

    // Consulta para obtener las columnas de la tabla
    const { data, error } = await supabase.rpc("get_table_columns", {
      table_name: tableName,
    })

    if (error) {
      console.error("Error al obtener columnas:", error)

      // Intentar con una consulta directa
      const { data: tableData, error: tableError } = await supabase.from(tableName).select("*").limit(1)

      if (tableError) {
        return NextResponse.json({ error: tableError.message }, { status: 500 })
      }

      if (tableData && tableData.length > 0) {
        return NextResponse.json({ columns: Object.keys(tableData[0]) })
      }

      return NextResponse.json({ error: "No se pudieron obtener las columnas" }, { status: 500 })
    }

    return NextResponse.json({ columns: data.map((col: any) => col.column_name) })
  } catch (error) {
    console.error("Error en get-table-columns:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
