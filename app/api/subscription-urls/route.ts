import { NextResponse } from 'next/server'

/**
 * ⚠️ ENDPOINT DEPRECADO ⚠️
 * 
 * Este endpoint ya no se usa. La lógica antigua de URLs pre-generadas de MercadoPago
 * ha sido reemplazada por la creación dinámica de preapprovals mediante SDK.
 * 
 * La nueva lógica está en: /api/mercadopago/create-subscription-preference
 * 
 * Razón de la migración:
 * - Las URLs pre-generadas no permitían external_reference personalizado
 * - MercadoPago ignoraba el external_reference de la URL
 * - Causaba problemas de matching entre DB y pagos
 * 
 * La nueva solución crea preapprovals dinámicamente con external_reference
 * correcto en el BODY de la request, lo que garantiza consistencia.
 */
export async function GET() {
  return NextResponse.json({
    deprecated: true,
    message: 'Este endpoint está deprecado. Usa /api/mercadopago/create-subscription-preference',
    migration_date: '2025-10-06',
    new_endpoint: '/api/mercadopago/create-subscription-preference',
    reason: 'Migración a creación dinámica de preapprovals con SDK de MercadoPago'
  }, { status: 410 }) // 410 Gone - recurso permanentemente eliminado
}

export async function POST() {
  return NextResponse.json({
    deprecated: true,
    message: 'Este endpoint está deprecado. Usa /api/mercadopago/create-subscription-preference',
    new_endpoint: '/api/mercadopago/create-subscription-preference'
  }, { status: 410 })
}