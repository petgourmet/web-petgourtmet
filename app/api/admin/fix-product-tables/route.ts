import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    // Create a Supabase client with admin privileges
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    )

    // SQL to create or update the product_images table without user references
    const createProductImagesSQL = `
      CREATE TABLE IF NOT EXISTS product_images (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        alt TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Grant permissions to the authenticated role
      GRANT SELECT, INSERT, UPDATE, DELETE ON product_images TO authenticated;
      GRANT USAGE, SELECT ON SEQUENCE product_images_id_seq TO authenticated;
    `

    // SQL to create or update the product_features table
    const createProductFeaturesSQL = `
      CREATE TABLE IF NOT EXISTS product_features (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT DEFAULT 'pastel-green',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Grant permissions to the authenticated role
      GRANT SELECT, INSERT, UPDATE, DELETE ON product_features TO authenticated;
      GRANT USAGE, SELECT ON SEQUENCE product_features_id_seq TO authenticated;
    `

    // SQL to create or update the product_sizes table
    const createProductSizesSQL = `
      CREATE TABLE IF NOT EXISTS product_sizes (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        weight TEXT NOT NULL,
        price NUMERIC(10, 2) DEFAULT 0,
        stock INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Grant permissions to the authenticated role
      GRANT SELECT, INSERT, UPDATE, DELETE ON product_sizes TO authenticated;
      GRANT USAGE, SELECT ON SEQUENCE product_sizes_id_seq TO authenticated;
    `

    // SQL to create or update the product_reviews table without user references
    const createProductReviewsSQL = `
      CREATE TABLE IF NOT EXISTS product_reviews (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        user_name TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Grant permissions to the authenticated role
      GRANT SELECT, INSERT, UPDATE, DELETE ON product_reviews TO authenticated;
      GRANT USAGE, SELECT ON SEQUENCE product_reviews_id_seq TO authenticated;
    `

    // Execute the SQL statements
    await supabaseAdmin.rpc("exec_sql", { sql: createProductImagesSQL })
    await supabaseAdmin.rpc("exec_sql", { sql: createProductFeaturesSQL })
    await supabaseAdmin.rpc("exec_sql", { sql: createProductSizesSQL })
    await supabaseAdmin.rpc("exec_sql", { sql: createProductReviewsSQL })

    return NextResponse.json({
      success: true,
      message: "Product tables created or updated successfully",
    })
  } catch (error: any) {
    console.error("Error fixing product tables:", error)
    return NextResponse.json({ success: false, error: error.message || "Unknown error" }, { status: 500 })
  }
}
