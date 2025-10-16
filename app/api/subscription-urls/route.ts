// ARCHIVO OBSOLETO - ELIMINADO
// Este archivo manejaba URLs de planes de suscripción que ya no se usan
// en el nuevo sistema sin planes asociados

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { 
      error: 'Este endpoint ha sido eliminado. El nuevo sistema no usa planes de suscripción asociados.',
      message: 'Use el endpoint /api/mercadopago/create-subscription-preference para crear suscripciones sin plan'
    },
    { status: 410 } // Gone
  )
}

export async function POST() {
  return NextResponse.json(
    { 
      error: 'Este endpoint ha sido eliminado. El nuevo sistema no usa planes de suscripción asociados.',
      message: 'Use el endpoint /api/mercadopago/create-subscription-preference para crear suscripciones sin plan'
    },
    { status: 410 } // Gone
  )
}