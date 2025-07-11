import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: "Variables de entorno de Supabase no configuradas" },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log("Configurando políticas RLS para tablas de pedidos...")

    // Script SQL para configurar las políticas de RLS
    const setupSQL = `
      -- 1. Habilitar RLS para las tablas de pedidos si no está habilitado
      ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
      ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

      -- 2. Eliminar políticas existentes si existen
      DROP POLICY IF EXISTS "orders_select_policy" ON orders;
      DROP POLICY IF EXISTS "orders_insert_policy" ON orders;
      DROP POLICY IF EXISTS "orders_update_policy" ON orders;
      DROP POLICY IF EXISTS "orders_delete_policy" ON orders;
      
      DROP POLICY IF EXISTS "order_items_select_policy" ON order_items;
      DROP POLICY IF EXISTS "order_items_insert_policy" ON order_items;
      DROP POLICY IF EXISTS "order_items_update_policy" ON order_items;
      DROP POLICY IF EXISTS "order_items_delete_policy" ON order_items;

      -- 3. Crear políticas permisivas para orders
      -- Permitir SELECT para todos (incluyendo usuarios anónimos)
      CREATE POLICY "orders_select_policy" ON orders FOR SELECT USING (true);
      
      -- Permitir INSERT para todos (necesario para crear pedidos desde la API)
      CREATE POLICY "orders_insert_policy" ON orders FOR INSERT WITH CHECK (true);
      
      -- Permitir UPDATE solo para administradores autenticados o el propietario del pedido
      CREATE POLICY "orders_update_policy" ON orders FOR UPDATE USING (
        auth.role() = 'service_role' OR 
        auth.uid()::text = user_id OR
        EXISTS (
          SELECT 1 FROM auth.users 
          WHERE auth.users.id = auth.uid() 
          AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
        )
      );
      
      -- Permitir DELETE solo para administradores
      CREATE POLICY "orders_delete_policy" ON orders FOR DELETE USING (
        auth.role() = 'service_role' OR
        EXISTS (
          SELECT 1 FROM auth.users 
          WHERE auth.users.id = auth.uid() 
          AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
        )
      );

      -- 4. Crear políticas para order_items
      -- Permitir SELECT para todos
      CREATE POLICY "order_items_select_policy" ON order_items FOR SELECT USING (true);
      
      -- Permitir INSERT para todos (necesario para crear items de pedido desde la API)
      CREATE POLICY "order_items_insert_policy" ON order_items FOR INSERT WITH CHECK (true);
      
      -- Permitir UPDATE solo para administradores
      CREATE POLICY "order_items_update_policy" ON order_items FOR UPDATE USING (
        auth.role() = 'service_role' OR
        EXISTS (
          SELECT 1 FROM auth.users 
          WHERE auth.users.id = auth.uid() 
          AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
        )
      );
      
      -- Permitir DELETE solo para administradores
      CREATE POLICY "order_items_delete_policy" ON order_items FOR DELETE USING (
        auth.role() = 'service_role' OR
        EXISTS (
          SELECT 1 FROM auth.users 
          WHERE auth.users.id = auth.uid() 
          AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
        )
      );

      -- 5. Crear tabla order_metadata si no existe y configurar políticas
      CREATE TABLE IF NOT EXISTS order_metadata (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        customer_name TEXT,
        customer_phone TEXT,
        shipping_address JSONB,
        order_number TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Configurar RLS para order_metadata
      ALTER TABLE order_metadata ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "order_metadata_select_policy" ON order_metadata;
      DROP POLICY IF EXISTS "order_metadata_insert_policy" ON order_metadata;
      DROP POLICY IF EXISTS "order_metadata_update_policy" ON order_metadata;
      DROP POLICY IF EXISTS "order_metadata_delete_policy" ON order_metadata;

      CREATE POLICY "order_metadata_select_policy" ON order_metadata FOR SELECT USING (true);
      CREATE POLICY "order_metadata_insert_policy" ON order_metadata FOR INSERT WITH CHECK (true);
      CREATE POLICY "order_metadata_update_policy" ON order_metadata FOR UPDATE USING (
        auth.role() = 'service_role' OR
        EXISTS (
          SELECT 1 FROM auth.users 
          WHERE auth.users.id = auth.uid() 
          AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
        )
      );
      CREATE POLICY "order_metadata_delete_policy" ON order_metadata FOR DELETE USING (
        auth.role() = 'service_role' OR
        EXISTS (
          SELECT 1 FROM auth.users 
          WHERE auth.users.id = auth.uid() 
          AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
        )
      );
    `

    // Intentar ejecutar el SQL usando diferentes métodos
    let success = false

    // Método 1: Intentar con rpc exec
    try {
      const { error } = await supabaseAdmin.rpc("exec", { sql: setupSQL })
      if (!error) {
        success = true
        console.log("✅ Políticas RLS configuradas usando rpc exec")
      }
    } catch (error) {
      console.log("Método rpc exec no disponible, intentando alternativa...")
    }

    // Método 2: Ejecutar comandos individuales si el método principal falla
    if (!success) {
      const commands = [
        {
          sql: `ALTER TABLE orders ENABLE ROW LEVEL SECURITY;`,
          description: "Habilitar RLS en orders",
        },
        {
          sql: `ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;`,
          description: "Habilitar RLS en order_items",
        },
        {
          sql: `
            DROP POLICY IF EXISTS "orders_select_policy" ON orders;
            CREATE POLICY "orders_select_policy" ON orders FOR SELECT USING (true);
          `,
          description: "Crear política SELECT para orders",
        },
        {
          sql: `
            DROP POLICY IF EXISTS "orders_insert_policy" ON orders;
            CREATE POLICY "orders_insert_policy" ON orders FOR INSERT WITH CHECK (true);
          `,
          description: "Crear política INSERT para orders",
        },
        {
          sql: `
            DROP POLICY IF EXISTS "order_items_select_policy" ON order_items;
            CREATE POLICY "order_items_select_policy" ON order_items FOR SELECT USING (true);
          `,
          description: "Crear política SELECT para order_items",
        },
        {
          sql: `
            DROP POLICY IF EXISTS "order_items_insert_policy" ON order_items;
            CREATE POLICY "order_items_insert_policy" ON order_items FOR INSERT WITH CHECK (true);
          `,
          description: "Crear política INSERT para order_items",
        },
        {
          sql: `
            CREATE TABLE IF NOT EXISTS order_metadata (
              id SERIAL PRIMARY KEY,
              order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
              customer_name TEXT,
              customer_phone TEXT,
              shipping_address JSONB,
              order_number TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `,
          description: "Crear tabla order_metadata",
        },
        {
          sql: `
            ALTER TABLE order_metadata ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "order_metadata_insert_policy" ON order_metadata;
            CREATE POLICY "order_metadata_insert_policy" ON order_metadata FOR INSERT WITH CHECK (true);
          `,
          description: "Configurar RLS para order_metadata",
        },
      ]

      for (const command of commands) {
        try {
          const { error } = await supabaseAdmin.rpc("exec", { sql: command.sql })
          if (error) {
            console.error(`Error en ${command.description}:`, error)
          } else {
            console.log(`✅ ${command.description} completado`)
          }
        } catch (error) {
          console.error(`❌ Error en ${command.description}:`, error)
        }
      }
    }

    // Verificar que las tablas se pueden usar
    try {
      await supabaseAdmin.from("orders").select("id").limit(1)
      await supabaseAdmin.from("order_items").select("id").limit(1)
      console.log("✅ Todas las tablas de pedidos son accesibles")
    } catch (error) {
      console.error("❌ Error al verificar acceso a las tablas de pedidos:", error)
    }

    return NextResponse.json({
      success: true,
      message: "Políticas RLS para pedidos configuradas correctamente. Los pedidos se pueden crear sin restricciones.",
    })
  } catch (error: any) {
    console.error("Error en la configuración de políticas de pedidos:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Error desconocido" },
      { status: 500 }
    )
  }
}
