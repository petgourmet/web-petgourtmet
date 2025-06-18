import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    // Verificar variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Faltan variables de entorno para Supabase" }, { status: 500 })
    }

    // Crear cliente admin de Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Tablas que necesitan RLS habilitado
    const tables = ["product_features", "product_images", "product_sizes"]

    // Habilitar RLS en cada tabla
    const results = await Promise.all(
      tables.map(async (table) => {
        // Primero verificamos si ya existe una política para permitir todas las operaciones
        const { data: policies, error: policiesError } = await supabase.rpc("get_policies_for_table", {
          table_name: table,
        })

        if (policiesError) {
          return {
            table,
            status: "error",
            message: `Error al verificar políticas: ${policiesError.message}`,
          }
        }

        // Habilitar RLS en la tabla
        const { error: enableError } = await supabase.rpc("enable_rls", {
          table_name: table,
        })

        if (enableError) {
          return {
            table,
            status: "error",
            message: `Error al habilitar RLS: ${enableError.message}`,
          }
        }

        // Crear política permisiva si no existe
        // Esto asegura que la funcionalidad actual no se rompa
        const policyName = `allow_all_${table}`
        const hasPolicyAlready = policies?.some((p) => p.policyname === policyName)

        if (!hasPolicyAlready) {
          const { error: policyError } = await supabase.rpc("create_permissive_policy", {
            table_name: table,
            policy_name: policyName,
          })

          if (policyError) {
            return {
              table,
              status: "partial",
              message: `RLS habilitado pero error al crear política: ${policyError.message}`,
            }
          }
        }

        return {
          table,
          status: "success",
          message: "RLS habilitado y política permisiva creada/verificada",
        }
      }),
    )

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Error al habilitar RLS:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
