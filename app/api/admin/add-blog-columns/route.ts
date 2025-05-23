import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log("Añadiendo columnas faltantes a la tabla blogs...")

    // Añadir columna is_published
    try {
      const { error: isPublishedError } = await supabase.rpc("exec_sql", {
        sql: `
          DO $$ 
          BEGIN 
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'blogs' AND column_name = 'is_published'
            ) THEN
              ALTER TABLE blogs ADD COLUMN is_published BOOLEAN DEFAULT FALSE;
            END IF;
          END $$;
        `,
      })

      if (isPublishedError) {
        console.error("Error añadiendo columna is_published:", isPublishedError)
      } else {
        console.log("Columna is_published añadida/verificada")
      }
    } catch (err) {
      console.error("Error procesando is_published:", err)
    }

    // Añadir columna published_at
    try {
      const { error: publishedAtError } = await supabase.rpc("exec_sql", {
        sql: `
          DO $$ 
          BEGIN 
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'blogs' AND column_name = 'published_at'
            ) THEN
              ALTER TABLE blogs ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;
            END IF;
          END $$;
        `,
      })

      if (publishedAtError) {
        console.error("Error añadiendo columna published_at:", publishedAtError)
      } else {
        console.log("Columna published_at añadida/verificada")
      }
    } catch (err) {
      console.error("Error procesando published_at:", err)
    }

    // Añadir columna author
    try {
      const { error: authorError } = await supabase.rpc("exec_sql", {
        sql: `
          DO $$ 
          BEGIN 
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'blogs' AND column_name = 'author'
            ) THEN
              ALTER TABLE blogs ADD COLUMN author VARCHAR(255);
            END IF;
          END $$;
        `,
      })

      if (authorError) {
        console.error("Error añadiendo columna author:", authorError)
      } else {
        console.log("Columna author añadida/verificada")
      }
    } catch (err) {
      console.error("Error procesando author:", err)
    }

    return NextResponse.json({
      success: true,
      message: "Columnas de blogs añadidas exitosamente",
    })
  } catch (error) {
    console.error("Error añadiendo columnas de blogs:", error)
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
