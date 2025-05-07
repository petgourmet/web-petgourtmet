import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"

// Crear un cliente de Supabase con la clave de servicio para tener permisos completos
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
)

export async function POST(request: Request) {
  try {
    // Verificar autenticación (esto debería mejorarse con middleware)
    const { data: session } = await supabaseAdmin.auth.getSession()
    if (!session.session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar si el usuario es administrador
    const { data: user } = await supabaseAdmin.auth.getUser()
    const adminEmails = ["admin@petgourmet.com", "cristoferscalante@gmail.com"]
    if (!adminEmails.includes(user.user?.email || "")) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 })
    }

    // Verificar y crear las tablas necesarias
    const tables = [
      {
        name: "product_sizes",
        query: `
          CREATE TABLE IF NOT EXISTS product_sizes (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            weight TEXT NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `,
        policy: `
          BEGIN;
          -- Eliminar políticas existentes si las hay
          DROP POLICY IF EXISTS "Permitir acceso completo a administradores para product_sizes" ON product_sizes;
          
          -- Habilitar RLS
          ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;
          
          -- Crear política para administradores
          CREATE POLICY "Permitir acceso completo a administradores para product_sizes"
          ON product_sizes
          USING (true)
          WITH CHECK (true);
          
          -- Permitir acceso anónimo para lectura
          CREATE POLICY IF NOT EXISTS "Permitir lectura anónima para product_sizes"
          ON product_sizes
          FOR SELECT
          TO anon
          USING (true);
          COMMIT;
        `,
      },
      {
        name: "product_images",
        query: `
          CREATE TABLE IF NOT EXISTS product_images (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            url TEXT NOT NULL,
            alt TEXT,
            order_index INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `,
        policy: `
          BEGIN;
          -- Eliminar políticas existentes si las hay
          DROP POLICY IF EXISTS "Permitir acceso completo a administradores para product_images" ON product_images;
          
          -- Habilitar RLS
          ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
          
          -- Crear política para administradores
          CREATE POLICY "Permitir acceso completo a administradores para product_images"
          ON product_images
          USING (true)
          WITH CHECK (true);
          
          -- Permitir acceso anónimo para lectura
          CREATE POLICY IF NOT EXISTS "Permitir lectura anónima para product_images"
          ON product_images
          FOR SELECT
          TO anon
          USING (true);
          COMMIT;
        `,
      },
      {
        name: "product_features",
        query: `
          CREATE TABLE IF NOT EXISTS product_features (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            color TEXT DEFAULT 'primary',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `,
        policy: `
          BEGIN;
          -- Eliminar políticas existentes si las hay
          DROP POLICY IF EXISTS "Permitir acceso completo a administradores para product_features" ON product_features;
          
          -- Habilitar RLS
          ALTER TABLE product_features ENABLE ROW LEVEL SECURITY;
          
          -- Crear política para administradores
          CREATE POLICY "Permitir acceso completo a administradores para product_features"
          ON product_features
          USING (true)
          WITH CHECK (true);
          
          -- Permitir acceso anónimo para lectura
          CREATE POLICY IF NOT EXISTS "Permitir lectura anónima para product_features"
          ON product_features
          FOR SELECT
          TO anon
          USING (true);
          COMMIT;
        `,
      },
      {
        name: "product_reviews",
        query: `
          CREATE TABLE IF NOT EXISTS product_reviews (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            user_name TEXT NOT NULL,
            rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
            comment TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `,
        policy: `
          BEGIN;
          -- Eliminar políticas existentes si las hay
          DROP POLICY IF EXISTS "Permitir acceso completo a administradores para product_reviews" ON product_reviews;
          
          -- Habilitar RLS
          ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
          
          -- Crear política para administradores
          CREATE POLICY "Permitir acceso completo a administradores para product_reviews"
          ON product_reviews
          USING (true)
          WITH CHECK (true);
          
          -- Permitir acceso anónimo para lectura
          CREATE POLICY IF NOT EXISTS "Permitir lectura anónima para product_reviews"
          ON product_reviews
          FOR SELECT
          TO anon
          USING (true);
          COMMIT;
        `,
      },
      {
        name: "product_categories",
        query: `
          CREATE TABLE IF NOT EXISTS product_categories (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(product_id, category_id)
          );
        `,
        policy: `
          BEGIN;
          -- Eliminar políticas existentes si las hay
          DROP POLICY IF EXISTS "Permitir acceso completo a administradores para product_categories" ON product_categories;
          
          -- Habilitar RLS
          ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
          
          -- Crear política para administradores
          CREATE POLICY "Permitir acceso completo a administradores para product_categories"
          ON product_categories
          USING (true)
          WITH CHECK (true);
          
          -- Permitir acceso anónimo para lectura
          CREATE POLICY IF NOT EXISTS "Permitir lectura anónima para product_categories"
          ON product_categories
          FOR SELECT
          TO anon
          USING (true);
          COMMIT;
        `,
      },
    ]

    const results = []

    for (const table of tables) {
      try {
        // Verificar si la tabla existe
        const { data: existingTable, error: checkError } = await supabaseAdmin
          .from(table.name)
          .select("id")
          .limit(1)
          .maybeSingle()

        if (checkError && checkError.code === "42P01") {
          // La tabla no existe, crearla
          const { error: createError } = await supabaseAdmin.rpc("exec_sql", { query: table.query })

          if (createError) {
            results.push({
              table: table.name,
              status: "error",
              message: `Error al crear tabla: ${createError.message}`,
            })
            continue
          }

          // Aplicar políticas de seguridad
          const { error: policyError } = await supabaseAdmin.rpc("exec_sql", { query: table.policy })

          if (policyError) {
            results.push({
              table: table.name,
              status: "partial",
              message: `Tabla creada pero error al aplicar políticas: ${policyError.message}`,
            })
            continue
          }

          results.push({
            table: table.name,
            status: "created",
            message: "Tabla creada y políticas aplicadas correctamente",
          })
        } else {
          // La tabla existe, solo aplicar políticas
          const { error: policyError } = await supabaseAdmin.rpc("exec_sql", { query: table.policy })

          if (policyError) {
            results.push({
              table: table.name,
              status: "error",
              message: `Error al aplicar políticas: ${policyError.message}`,
            })
            continue
          }

          results.push({
            table: table.name,
            status: "updated",
            message: "Políticas actualizadas correctamente",
          })
        }
      } catch (error: any) {
        results.push({
          table: table.name,
          status: "error",
          message: error.message || "Error desconocido",
        })
      }
    }

    return NextResponse.json({ results })
  } catch (error: any) {
    console.error("Error al crear tablas:", error)
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}
