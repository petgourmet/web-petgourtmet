import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin client not available' }, { status: 500 })
    }

    // Obtener una orden de ejemplo para ver la estructura actual
    const { data: sampleOrder, error: sampleError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .limit(1)
      .single()

    if (sampleError && sampleError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error getting sample order:', sampleError)
    }

    return NextResponse.json({
      sampleOrder: sampleOrder || null,
      sampleError: sampleError?.code === 'PGRST116' ? 'No orders found' : sampleError
    })
  } catch (error) {
    console.error('Error checking orders structure:', error)
    return NextResponse.json({ error: 'Failed to check table structure' }, { status: 500 })
  }
}
