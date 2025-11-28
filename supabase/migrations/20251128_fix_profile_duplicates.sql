-- =====================================================
-- Trigger para crear perfil automáticamente cuando un 
-- nuevo usuario se registra en auth.users
-- INCLUYE protección contra duplicados
-- =====================================================

-- Función que se ejecuta cuando se crea un nuevo usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  existing_profile_id uuid;
BEGIN
  -- Verificar si ya existe un perfil con este email
  SELECT id INTO existing_profile_id 
  FROM public.profiles 
  WHERE email = NEW.email 
  LIMIT 1;

  IF existing_profile_id IS NOT NULL THEN
    -- Si existe, actualizar el ID para que coincida con auth.users
    UPDATE public.profiles
    SET 
      id = NEW.id,
      updated_at = NOW()
    WHERE id = existing_profile_id;
    
    RAISE NOTICE 'Perfil existente actualizado para: %', NEW.email;
  ELSE
    -- Si no existe, crear nuevo perfil
    INSERT INTO public.profiles (id, email, role, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      'user',  -- Rol por defecto
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Nuevo perfil creado para: %', NEW.email;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Si hay violación de unicidad, intentar actualizar
    UPDATE public.profiles
    SET 
      id = NEW.id,
      updated_at = NOW()
    WHERE email = NEW.email;
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Error creando perfil para %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- Agregar índice único en email para prevenir duplicados
-- =====================================================
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique ON profiles(email);

-- =====================================================
-- Verificar que el trigger se creó correctamente
-- =====================================================
SELECT 
  trigger_name, 
  event_manipulation, 
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
