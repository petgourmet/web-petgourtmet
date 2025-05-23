-- Función para verificar si una columna existe en una tabla
CREATE OR REPLACE FUNCTION column_exists(table_name text, column_name text)
RETURNS boolean AS $$
DECLARE
  exists boolean;
BEGIN
  SELECT COUNT(*) > 0 INTO exists
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = $1
    AND column_name = $2;
  RETURN exists;
END;
$$ LANGUAGE plpgsql;

-- Función para crear la función column_exists si no existe
CREATE OR REPLACE FUNCTION create_column_exists_function()
RETURNS void AS $$
BEGIN
  -- La función se crea a sí misma, así que no necesitamos hacer nada aquí
  -- La definición ya está en la función anterior
END;
$$ LANGUAGE plpgsql;
