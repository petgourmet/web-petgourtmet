import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST() {
  try {
    // Create a Supabase client with admin privileges
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    )

    // SQL to create product_features table if it doesn't exist
    await supabaseAdmin.rpc("execute_sql", {
      sql_query: `
        CREATE TABLE IF NOT EXISTS product_features (
          id SERIAL PRIMARY KEY,
          product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          color TEXT NOT NULL DEFAULT 'pastel-green',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `,
    })

    // SQL to create product_sizes table if it doesn't exist
    await supabaseAdmin.rpc("execute_sql", {
      sql_query: `
        CREATE TABLE IF NOT EXISTS product_sizes (
          id SERIAL PRIMARY KEY,
          product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          weight TEXT NOT NULL,
          price NUMERIC(10, 2) NOT NULL DEFAULT 0,
          stock INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `,
    })

    // SQL to create product_images table if it doesn't exist
    await supabaseAdmin.rpc("execute_sql", {
      sql_query: `
        CREATE TABLE IF NOT EXISTS product_images (
          id SERIAL PRIMARY KEY,
          product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          alt TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `,
    })

    // SQL to create product_reviews table if it doesn't exist
    await supabaseAdmin.rpc("execute_sql", {
      sql_query: `
        CREATE TABLE IF NOT EXISTS product_reviews (
          id SERIAL PRIMARY KEY,
          product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          user_id UUID,
          user_name TEXT,
          rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
          comment TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `,
    })

    return NextResponse.json({ success: true, message: "Product tables created successfully" })
  } catch (error: any) {
    console.error("Error creating product tables:", error)
    return NextResponse.json({ success: false, error: error.message || "Unknown error" }, { status: 500 })
  }
}
