-- Función para crear automáticamente un perfil cuando se registra un nuevo usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'user', -- Rol por defecto
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Si ya existe, no hacer nada
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log del error pero no fallar la creación del usuario
    RAISE WARNING 'Error creando perfil para usuario %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se ejecuta después de insertar un nuevo usuario en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Asegurar permisos básicos (solo si no existen)
DO $$
BEGIN
  -- Verificar y otorgar permisos si no existen
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants 
    WHERE table_name = 'profiles' AND grantee = 'anon' AND privilege_type = 'SELECT'
  ) THEN
    GRANT SELECT ON public.profiles TO anon;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants 
    WHERE table_name = 'profiles' AND grantee = 'authenticated' AND privilege_type = 'SELECT'
  ) THEN
    GRANT ALL PRIVILEGES ON public.profiles TO authenticated;
  END IF;
END $$;

-- Comentarios para documentación
COMMENT ON FUNCTION public.handle_new_user() IS 'Función que crea automáticamente un perfil cuando se registra un nuevo usuario';