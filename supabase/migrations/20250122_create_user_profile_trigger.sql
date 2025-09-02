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
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Si el perfil ya existe, no hacer nada
    RETURN NEW;
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

-- Asegurar que los roles anon y authenticated tengan permisos en la tabla profiles
GRANT SELECT ON public.profiles TO anon;
GRANT ALL PRIVILEGES ON public.profiles TO authenticated;

-- Política RLS para que los usuarios solo puedan ver y editar su propio perfil
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios autenticados puedan ver su propio perfil
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Política para que usuarios autenticados puedan actualizar su propio perfil
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Política para que el sistema pueda insertar nuevos perfiles (para el trigger)
CREATE POLICY "System can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Comentarios para documentación
COMMENT ON FUNCTION public.handle_new_user() IS 'Función que crea automáticamente un perfil cuando se registra un nuevo usuario';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Trigger que ejecuta handle_new_user() después de insertar un usuario en auth.users';