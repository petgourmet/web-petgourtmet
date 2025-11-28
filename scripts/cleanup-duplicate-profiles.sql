-- =====================================================
-- Script para limpiar perfiles duplicados
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Ver todos los emails duplicados
SELECT email, COUNT(*) as count, 
       array_agg(id) as ids,
       array_agg(role) as roles,
       array_agg(created_at) as created_dates
FROM profiles
GROUP BY email
HAVING COUNT(*) > 1;

-- 2. Ver cuál ID está en auth.users para cada email duplicado
-- (Esto te ayuda a saber cuál perfil mantener)
SELECT 
  au.id as auth_id, 
  au.email as auth_email,
  p.id as profile_id,
  p.email as profile_email,
  p.role,
  p.created_at
FROM auth.users au
LEFT JOIN profiles p ON p.email = au.email
WHERE au.email IN (
  SELECT email FROM profiles 
  GROUP BY email HAVING COUNT(*) > 1
)
ORDER BY au.email, p.created_at;

-- =====================================================
-- 3. LIMPIAR DUPLICADOS
-- Mantener el perfil que coincida con auth.users
-- =====================================================

-- Para eliza.torres.rojas@gmail.com - eliminar el duplicado
-- Primero verificar cuál ID está en auth.users
SELECT id, email FROM auth.users WHERE email = 'eliza.torres.rojas@gmail.com';

-- Luego eliminar el que NO coincide (el duplicado creado hoy)
DELETE FROM profiles 
WHERE email = 'eliza.torres.rojas@gmail.com'
AND id NOT IN (SELECT id FROM auth.users WHERE email = 'eliza.torres.rojas@gmail.com');

-- Para vtr.techh@gmail.com - también tiene duplicados
DELETE FROM profiles 
WHERE email = 'vtr.techh@gmail.com'
AND id NOT IN (SELECT id FROM auth.users WHERE email = 'vtr.techh@gmail.com');

-- Para test@petgourmet.com - también tiene duplicados
DELETE FROM profiles 
WHERE email = 'test@petgourmet.com'
AND id NOT IN (SELECT id FROM auth.users WHERE email = 'test@petgourmet.com');

-- =====================================================
-- 4. Verificar que ya no hay duplicados
-- =====================================================
SELECT email, COUNT(*) as count
FROM profiles
GROUP BY email
HAVING COUNT(*) > 1;

-- =====================================================
-- 5. AGREGAR RESTRICCIÓN UNIQUE para prevenir futuros duplicados
-- =====================================================

-- Agregar índice único en email (si no existe)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique ON profiles(email);

-- =====================================================
-- 6. Verificar el estado final de los admins
-- =====================================================
SELECT id, email, role, created_at 
FROM profiles 
WHERE role = 'admin'
ORDER BY email;

-- =====================================================
-- 7. Verificar que eliza ahora puede acceder
-- =====================================================
SELECT 
  au.id as auth_id,
  au.email,
  p.id as profile_id,
  p.role
FROM auth.users au
JOIN profiles p ON p.id = au.id
WHERE au.email = 'eliza.torres.rojas@gmail.com';
