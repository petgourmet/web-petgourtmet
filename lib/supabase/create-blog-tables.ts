import { supabase } from "./client"

export async function createBlogTables() {
  console.log("Verificando y creando tablas de blogs...")

  try {
    // Verificar si la tabla blogs existe
    const { data: existingTables, error: tablesError } = await supabase.rpc("get_tables")

    if (tablesError) {
      console.error("Error al verificar tablas existentes:", tablesError)
      return { success: false, error: tablesError }
    }

    const hasBlogsTable = existingTables.some((table: string) => table === "blogs")
    const hasBlogCategoriesTable = existingTables.some((table: string) => table === "blog_categories")

    // Crear tabla de categorías de blog si no existe
    if (!hasBlogCategoriesTable) {
      console.log("Creando tabla blog_categories...")
      const { error: createCategoriesError } = await supabase.query(`
        CREATE TABLE blog_categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL UNIQUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `)

      if (createCategoriesError) {
        console.error("Error al crear tabla blog_categories:", createCategoriesError)
        return { success: false, error: createCategoriesError }
      }
    }

    // Crear tabla de blogs si no existe
    if (!hasBlogsTable) {
      console.log("Creando tabla blogs...")
      const { error: createBlogsError } = await supabase.query(`
        CREATE TABLE blogs (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL UNIQUE,
          excerpt TEXT,
          content TEXT,
          cover_image VARCHAR(255),
          author VARCHAR(255),
          category_id INTEGER REFERENCES blog_categories(id),
          is_published BOOLEAN DEFAULT FALSE,
          published_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `)

      if (createBlogsError) {
        console.error("Error al crear tabla blogs:", createBlogsError)
        return { success: false, error: createBlogsError }
      }
    } else {
      // Verificar y añadir columnas faltantes a la tabla blogs
      console.log("Verificando columnas de la tabla blogs...")

      // Obtener columnas existentes
      const { data: columns, error: columnsError } = await supabase.rpc("get_columns", { table_name: "blogs" })

      if (columnsError) {
        console.error("Error al verificar columnas existentes:", columnsError)
        return { success: false, error: columnsError }
      }

      const existingColumns = columns.map((col: any) => col.column_name)

      // Verificar y añadir columnas faltantes
      const requiredColumns = [
        { name: "author", type: "VARCHAR(255)" },
        { name: "is_published", type: "BOOLEAN DEFAULT FALSE" },
        { name: "published_at", type: "TIMESTAMP WITH TIME ZONE" },
      ]

      for (const column of requiredColumns) {
        if (!existingColumns.includes(column.name)) {
          console.log(`Añadiendo columna ${column.name} a la tabla blogs...`)
          const { error: addColumnError } = await supabase.query(`
            ALTER TABLE blogs ADD COLUMN ${column.name} ${column.type};
          `)

          if (addColumnError) {
            console.error(`Error al añadir columna ${column.name}:`, addColumnError)
            return { success: false, error: addColumnError }
          }
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error inesperado al crear tablas de blogs:", error)
    return { success: false, error }
  }
}
