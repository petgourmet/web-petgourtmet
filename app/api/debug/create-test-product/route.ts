import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    // Verificar si ya existe un producto con ID 1
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id, name, price')
      .eq('id', 1)
      .single()
    
    if (existingProduct) {
      return NextResponse.json({
        success: true,
        message: 'Producto ya existe',
        product: existingProduct
      })
    }
    
    // Crear producto de prueba con solo los campos requeridos
    const testProduct = {
      name: 'Producto de Prueba - Comida Premium',
      slug: 'producto-prueba-premium',
      description: 'Producto de prueba para suscripciones dinámicas',
      price: 2500.00,
      image: '/images/test-product.jpg',
      category_id: 1,
      stock: 100,
      subscription_available: true,
      purchase_types: ["single", "subscription"]
    }
    
    const { data: newProduct, error } = await supabase
      .from('products')
      .insert([testProduct])
      .select()
      .single()
    
    if (error) {
      console.error('Error creando producto de prueba:', error)
      return NextResponse.json({
        success: false,
        error: `Error creando producto: ${error.message}`
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Producto de prueba creado exitosamente',
      product: newProduct
    })
    
  } catch (error) {
    console.error('Error en create-test-product:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}