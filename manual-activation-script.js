// Script manual para activar suscripción pendiente
// Ejecutar directamente en la base de datos

console.log('🔧 Script de activación manual de suscripción');
console.log('📋 Información del problema:');
console.log('   - Suscripción ID: 117 (pendiente)');
console.log('   - External Reference local: SUB-aefdfc64-cc93-4219-8ca5-a614a9e7bb84-73-f4646928');
console.log('   - External Reference webhook: 2c938084726fca8a01726fd4f4b80331');
console.log('');

console.log('🔍 Consulta SQL para verificar la suscripción:');
console.log(`
SELECT 
  id, 
  status, 
  external_reference, 
  user_id, 
  product_id,
  created_at,
  updated_at,
  metadata
FROM unified_subscriptions 
WHERE id = 117;
`);

console.log('');
console.log('🚀 Consulta SQL para activar la suscripción:');
console.log(`
UPDATE unified_subscriptions 
SET 
  status = 'active',
  external_reference = '2c938084726fca8a01726fd4f4b80331',
  updated_at = NOW(),
  metadata = COALESCE(metadata, '{}'::jsonb) || '{
    "original_external_reference": "SUB-aefdfc64-cc93-4219-8ca5-a614a9e7bb84-73-f4646928",
    "mercadopago_external_reference": "2c938084726fca8a01726fd4f4b80331",
    "sync_correction_date": "' || NOW()::text || '",
    "sync_correction_reason": "Manual activation due to external_reference mismatch",
    "webhook_external_reference": "2c938084726fca8a01726fd4f4b80331"
  }'::jsonb
WHERE id = 117;
`);

console.log('');
console.log('💰 Consulta SQL para crear registro de facturación:');
console.log(`
INSERT INTO billing_history (
  subscription_id,
  user_id,
  amount,
  currency,
  status,
  billing_date,
  payment_method,
  external_reference,
  metadata
)
SELECT 
  117,
  user_id,
  COALESCE(price, 0),
  'ARS',
  'paid',
  NOW(),
  'mercadopago',
  '2c938084726fca8a01726fd4f4b80331',
  '{
    "activation_type": "manual_correction",
    "original_external_reference": "SUB-aefdfc64-cc93-4219-8ca5-a614a9e7bb84-73-f4646928",
    "correction_date": "' || NOW()::text || '"
  }'::jsonb
FROM unified_subscriptions 
WHERE id = 117;
`);

console.log('');
console.log('✅ Consulta SQL para verificar la activación:');
console.log(`
SELECT 
  id, 
  status, 
  external_reference, 
  updated_at,
  metadata->'sync_correction_date' as correction_date
FROM unified_subscriptions 
WHERE id = 117;
`);

console.log('');
console.log('📊 Consulta SQL para verificar el registro de facturación:');
console.log(`
SELECT 
  id,
  subscription_id,
  amount,
  status,
  billing_date,
  external_reference
FROM billing_history 
WHERE subscription_id = 117
ORDER BY created_at DESC
LIMIT 1;
`);

console.log('');
console.log('🎯 Instrucciones:');
console.log('1. Ejecuta estas consultas en tu cliente de base de datos (Supabase Dashboard)');
console.log('2. Verifica que la suscripción se activó correctamente');
console.log('3. Prueba la página /suscripcion para confirmar que funciona');
console.log('4. Revisa que no haya duplicados activos para el mismo usuario');
console.log('');
console.log('⚠️  IMPORTANTE: Ejecuta las consultas en orden y verifica cada resultado antes de continuar');