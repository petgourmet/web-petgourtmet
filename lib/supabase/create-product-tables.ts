import { supabase } from "./client"

export async function ensureProductTablesExist() {
  try {
    // Check if product_features table exists
    const { error: featuresCheckError } = await supabase.from("product_features").select("id").limit(1).maybeSingle()

    if (featuresCheckError && featuresCheckError.code === "42P01") {
      // Table doesn't exist, create it
      const { error: createFeaturesError } = await supabase.rpc("create_product_features_table")
      if (createFeaturesError) {
        console.error("Error creating product_features table:", createFeaturesError)
      }
    }

    // Check if product_sizes table exists
    const { error: sizesCheckError } = await supabase.from("product_sizes").select("id").limit(1).maybeSingle()

    if (sizesCheckError && sizesCheckError.code === "42P01") {
      // Table doesn't exist, create it
      const { error: createSizesError } = await supabase.rpc("create_product_sizes_table")
      if (createSizesError) {
        console.error("Error creating product_sizes table:", createSizesError)
      }
    }

    // Check if product_images table exists
    const { error: imagesCheckError } = await supabase.from("product_images").select("id").limit(1).maybeSingle()

    if (imagesCheckError && imagesCheckError.code === "42P01") {
      // Table doesn't exist, create it
      const { error: createImagesError } = await supabase.rpc("create_product_images_table")
      if (createImagesError) {
        console.error("Error creating product_images table:", createImagesError)
      }
    }

    // Check if product_reviews table exists
    const { error: reviewsCheckError } = await supabase.from("product_reviews").select("id").limit(1).maybeSingle()

    if (reviewsCheckError && reviewsCheckError.code === "42P01") {
      // Table doesn't exist, create it
      const { error: createReviewsError } = await supabase.rpc("create_product_reviews_table")
      if (createReviewsError) {
        console.error("Error creating product_reviews table:", createReviewsError)
      }
    }

    return true
  } catch (error) {
    console.error("Error checking/creating product tables:", error)
    return false
  }
}
