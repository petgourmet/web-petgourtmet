import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log("Iniciando corrección del esquema de blogs...")

    // Crear tabla blog_categories si no existe
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
    } else {
      console.log("Tabla blog_categories verificada/creada")
    }

    // Crear tabla blogs si no existe
    const { error: blogsTableError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS blogs (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL UNIQUE,
          excerpt TEXT,
          content TEXT,
          cover_image VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `,
    })

    if (blogsTableError) {
      console.error("Error creando tabla blogs:", blogsTableError)
    } else {
      console.log("Tabla blogs verificada/creada")
    }

    // Añadir columnas faltantes una por una
    const columnsToAdd = [
      { name: "author", type: "VARCHAR(255)" },
      { name: "category_id", type: "INTEGER REFERENCES blog_categories(id)" },
      { name: "is_published", type: "BOOLEAN DEFAULT FALSE" },
      { name: "published_at", type: "TIMESTAMP WITH TIME ZONE" },
    ]

    for (const column of columnsToAdd) {
      try {
        const { error } = await supabase.rpc("exec_sql", {
          sql: `
            DO $$ 
            BEGIN 
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'blogs' AND column_name = '${column.name}'
              ) THEN
                ALTER TABLE blogs ADD COLUMN ${column.name} ${column.type};
              END IF;
            END $$;
          `,
        })

        if (error) {
          console.error(`Error añadiendo columna ${column.name}:`, error)
        } else {
          console.log(`Columna ${column.name} verificada/añadida`)
        }
      } catch (err) {
        console.error(`Error procesando columna ${column.name}:`, err)
      }
    }

    // Insertar categorías por defecto si no existen
    const { error: defaultCategoriesError } = await supabase.rpc("exec_sql", {
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
      `,
    })

    if (defaultCategoriesError) {
      console.error("Error insertando categorías por defecto:", defaultCategoriesError)
    } else {
      console.log("Categorías por defecto verificadas/insertadas")
    }

    return NextResponse.json({
      success: true,
      message: "Esquema de blogs corregido exitosamente",
    })
  } catch (error) {
    console.error("Error corrigiendo esquema de blogs:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        details: error,
      },
      { status: 500 },
    )
  }
}
