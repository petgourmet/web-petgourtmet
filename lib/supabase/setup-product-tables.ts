import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// Cliente con permisos de administrador (solo usar en el servidor)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function setupProductTables() {
  try {
    console.log("Iniciando configuración de tablas de productos...")

    // 1. Verificar y añadir la columna display_order a product_images si no existe
    const { error: addColumnError } = await supabaseAdmin.rpc("exec_sql", {
      sql: `
        DO $$ 
        BEGIN
          -- Añadir columna display_order si no existe
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'product_images' 
            AND column_name = 'display_order'
          ) THEN
            ALTER TABLE product_images ADD COLUMN display_order INTEGER DEFAULT 1;
          END IF;
          
          -- Crear índice si no existe
          IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'product_images' 
            AND indexname = 'idx_product_images_display_order'
          ) THEN
            CREATE INDEX idx_product_images_display_order ON product_images(product_id, display_order);
          END IF;
        END $$;
      `,
    })

    if (addColumnError) {
      console.error("Error al añadir columna display_order:", addColumnError)
    } else {
      console.log("Columna display_order añadida correctamente")
    }

    // 2. Crear tabla product_sizes si no existe
    const { error: sizesTableError } = await supabaseAdmin.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS product_sizes (
          id SERIAL PRIMARY KEY,
          product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          weight TEXT NOT NULL,
          price NUMERIC NOT NULL,
          stock INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id ON product_sizes(product_id);
      `,
    })

    if (sizesTableError) {
      console.error("Error al crear tabla product_sizes:", sizesTableError)
    } else {
      console.log("Tabla product_sizes creada correctamente")
    }

    // 3. Crear tabla product_features si no existe
    const { error: featuresTableError } = await supabaseAdmin.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS product_features (
          id SERIAL PRIMARY KEY,
          product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          color TEXT NOT NULL DEFAULT '#10b981',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_product_features_product_id ON product_features(product_id);
      `,
    })

    if (featuresTableError) {
      console.error("Error al crear tabla product_features:", featuresTableError)
    } else {
      console.log("Tabla product_features creada correctamente")
    }

    // 4. Configurar políticas de seguridad
    const { error: policiesError } = await supabaseAdmin.rpc("exec_sql", {
      sql: `
        -- Habilitar RLS
        ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
        ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;
        ALTER TABLE product_features ENABLE ROW LEVEL SECURITY;

        -- Eliminar políticas existentes si existen
        DROP POLICY IF EXISTS "product_images_select_policy" ON product_images;
        DROP POLICY IF EXISTS "product_images_insert_policy" ON product_images;
        DROP POLICY IF EXISTS "product_images_update_policy" ON product_images;
        DROP POLICY IF EXISTS "product_images_delete_policy" ON product_images;
        
        DROP POLICY IF EXISTS "product_sizes_select_policy" ON product_sizes;
        DROP POLICY IF EXISTS "product_sizes_insert_policy" ON product_sizes;
        DROP POLICY IF EXISTS "product_sizes_update_policy" ON product_sizes;
        DROP POLICY IF EXISTS "product_sizes_delete_policy" ON product_sizes;
        
        DROP POLICY IF EXISTS "product_features_select_policy" ON product_features;
        DROP POLICY IF EXISTS "product_features_insert_policy" ON product_features;
        DROP POLICY IF EXISTS "product_features_update_policy" ON product_features;
        DROP POLICY IF EXISTS "product_features_delete_policy" ON product_features;

        -- Crear nuevas políticas para product_images
        CREATE POLICY "product_images_select_policy" ON product_images FOR SELECT USING (true);
        CREATE POLICY "product_images_insert_policy" ON product_images FOR INSERT WITH CHECK (true);
        CREATE POLICY "product_images_update_policy" ON product_images FOR UPDATE USING (true);
        CREATE POLICY "product_images_delete_policy" ON product_images FOR DELETE USING (true);

        -- Crear nuevas políticas para product_sizes
        CREATE POLICY "product_sizes_select_policy" ON product_sizes FOR SELECT USING (true);
        CREATE POLICY "product_sizes_insert_policy" ON product_sizes FOR INSERT WITH CHECK (true);
        CREATE POLICY "product_sizes_update_policy" ON product_sizes FOR UPDATE USING (true);
        CREATE POLICY "product_sizes_delete_policy" ON product_sizes FOR DELETE USING (true);

        -- Crear nuevas políticas para product_features
        CREATE POLICY "product_features_select_policy" ON product_features FOR SELECT USING (true);
        CREATE POLICY "product_features_insert_policy" ON product_features FOR INSERT WITH CHECK (true);
        CREATE POLICY "product_features_update_policy" ON product_features FOR UPDATE USING (true);
        CREATE POLICY "product_features_delete_policy" ON product_features FOR DELETE USING (true);
      `,
    })

    if (policiesError) {
      console.error("Error al configurar políticas:", policiesError)
    } else {
      console.log("Políticas configuradas correctamente")
    }

    console.log("Configuración de tablas de productos completada con éxito")
    return { success: true, message: "Tablas de productos configuradas correctamente" }
  } catch (error: any) {
    console.error("Error al configurar tablas de productos:", error)
    return { success: false, error: error.message || "Error desconocido" }
  }
}
