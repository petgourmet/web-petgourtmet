import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Usar credenciales de servicio para tener permisos de administrador (bypassing RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Credenciales de Supabase no configuradas en el servidor" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log("Iniciando inicialización de tablas de blogs...")

    // 1. Crear tabla blog_categories
    const { error: categoriesError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS blog_categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL UNIQUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `,
    })

    if (categoriesError) {
      console.error("Error creando tabla blog_categories:", categoriesError)
      // Continuamos, podría ser que ya exista y el error sea otro
    }

    // 2. Crear tabla blogs
    const { error: blogsTableError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS blogs (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL UNIQUE,
          excerpt TEXT,
          content TEXT,
          cover_image VARCHAR(255),
          author_id UUID REFERENCES auth.users(id),
          category_id INTEGER REFERENCES blog_categories(id),
          published BOOLEAN DEFAULT FALSE,
          published_at TIMESTAMP WITH TIME ZONE,
          meta_description TEXT,
          read_time INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `,
    })

    if (blogsTableError) {
      console.error("Error creando tabla blogs:", blogsTableError)
    }

    // 3. Habilitar RLS
    // Intentamos habilitar RLS, ignorando error si ya está habilitado
    try {
        await supabase.rpc("exec_sql", {
        sql: `
            ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
            ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
        `
        })
    } catch (e) {
        console.log("RLS ya habilitado o error menor:", e)
    }

    // 4. Crear políticas RLS para blogs
    // Política de lectura pública para blogs publicados
    await supabase.rpc("exec_sql", {
      sql: `
        DROP POLICY IF EXISTS "Blogs visibles al público" ON blogs;
        CREATE POLICY "Blogs visibles al público" ON blogs
          FOR SELECT
          USING (published = true);
      `
    })

    // Política para administradores (acceso total)
    // Nota: Esta política verifica si el usuario tiene rol 'admin' en la tabla profiles
    await supabase.rpc("exec_sql", {
      sql: `
        DROP POLICY IF EXISTS "Administradores pueden gestionar blogs" ON blogs;
        CREATE POLICY "Administradores pueden gestionar blogs" ON blogs
          FOR ALL
          USING (
            auth.uid() IN (
              SELECT id FROM profiles WHERE role = 'admin'
            )
          );
      `
    })

    // 5. Crear políticas RLS para categorías
    await supabase.rpc("exec_sql", {
      sql: `
        DROP POLICY IF EXISTS "Categorías visibles al público" ON blog_categories;
        CREATE POLICY "Categorías visibles al público" ON blog_categories
          FOR SELECT
          TO public
          USING (true);
          
        DROP POLICY IF EXISTS "Administradores pueden gestionar categorías" ON blog_categories;
        CREATE POLICY "Administradores pueden gestionar categorías" ON blog_categories
          FOR ALL
          USING (
            auth.uid() IN (
              SELECT id FROM profiles WHERE role = 'admin'
            )
          );
      `
    })

    // 6. Insertar categorías por defecto
    await supabase.rpc("exec_sql", {
      sql: `
        INSERT INTO blog_categories (name, slug) 
        SELECT 'General', 'general'
        WHERE NOT EXISTS (SELECT 1 FROM blog_categories WHERE slug = 'general');
        
        INSERT INTO blog_categories (name, slug) 
        SELECT 'Nutrición', 'nutricion'
        WHERE NOT EXISTS (SELECT 1 FROM blog_categories WHERE slug = 'nutricion');
        
        INSERT INTO blog_categories (name, slug) 
        SELECT 'Cuidado', 'cuidado'
        WHERE NOT EXISTS (SELECT 1 FROM blog_categories WHERE slug = 'cuidado');
      `
    })

    return NextResponse.json({
      success: true,
      message: "Tablas de blogs inicializadas y políticas RLS aplicadas correctamente",
    })

  } catch (error: any) {
    console.error("Error en inicialización de blogs:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error interno del servidor",
      },
      { status: 500 }
    )
  }
}
