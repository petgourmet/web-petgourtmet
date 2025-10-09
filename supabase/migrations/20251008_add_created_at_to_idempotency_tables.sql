-- Añade columnas created_at a las tablas de idempotencia si aún no existen
-- Fecha: 2025-10-08

-- idempotency_locks: usada por EnhancedIdempotencyServiceServer para grabar locks temporales
ALTER TABLE IF EXISTS public.idempotency_locks
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT timezone('utc', now());

-- Asegurar que el valor se actualiza automáticamente solo en inserts
ALTER TABLE IF EXISTS public.idempotency_locks
  ALTER COLUMN created_at SET DEFAULT timezone('utc', now());

-- idempotency_results: almacena respuestas cacheadas por clave de operación
ALTER TABLE IF EXISTS public.idempotency_results
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT timezone('utc', now());

ALTER TABLE IF EXISTS public.idempotency_results
  ALTER COLUMN created_at SET DEFAULT timezone('utc', now());

-- Índice auxiliar para limpieza/consultas por expiración si no existiera
CREATE INDEX IF NOT EXISTS idempotency_locks_expires_at_idx
  ON public.idempotency_locks (expires_at);

CREATE INDEX IF NOT EXISTS idempotency_results_expires_at_idx
  ON public.idempotency_results (expires_at);
