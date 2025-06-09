-- Verificar si la columna customer_email existe y eliminarla si es necesario
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = 'customer_email'
    ) THEN
        ALTER TABLE orders DROP COLUMN customer_email;
    END IF;
END $$;

-- Asegurarse de que la tabla profiles tenga las columnas necesarias
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'first_name'
    ) THEN
        ALTER TABLE profiles ADD COLUMN first_name TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'last_name'
    ) THEN
        ALTER TABLE profiles ADD COLUMN last_name TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE profiles ADD COLUMN phone TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'shipping_address'
    ) THEN
        ALTER TABLE profiles ADD COLUMN shipping_address JSONB;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- Asegurarse de que la tabla orders tenga las columnas correctas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = 'shipping_address'
    ) THEN
        ALTER TABLE orders ADD COLUMN shipping_address JSONB;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = 'customer_name'
    ) THEN
        ALTER TABLE orders ADD COLUMN customer_name TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = 'customer_phone'
    ) THEN
        ALTER TABLE orders ADD COLUMN customer_phone TEXT;
    END IF;
END $$;
