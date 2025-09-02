-- Verificar si el trigger existe
SELECT 
    trigger_name, 
    event_manipulation, 
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_schema = 'auth' 
    AND event_object_table = 'users'
    AND trigger_name = 'on_auth_user_created';

-- Verificar si la función existe
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name = 'handle_new_user';

-- Verificar perfiles existentes
SELECT id, email, role, created_at FROM public.profiles ORDER BY created_at DESC LIMIT 5;