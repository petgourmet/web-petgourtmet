import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    // Obtener los primeros 5 productos
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, price, slug, subscription_available')
      .limit(5)
    
    if (error) {
      console.error('Error obteniendo productos:', error)
      return NextResponse.json({
        success: false,
        error: `Error obteniendo productos: ${error.message}`
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      products: products || [],
      count: products?.length || 0
    })
    
  } catch (error) {
    console.error('Error en debug/products:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}