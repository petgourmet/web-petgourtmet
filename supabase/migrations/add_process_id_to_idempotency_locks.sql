-- Agregar columna process_id a la tabla idempotency_locks

ALTER TABLE idempotency_locks 
ADD COLUMN process_id TEXT;

-- Crear índice para mejorar el rendimiento de las consultas por process_id
CREATE INDEX idx_idempotency_locks_process_id ON idempotency_locks(process_id);

-- También agregar índice compuesto para lock_key y process_id para las operaciones de liberación de lock
CREATE INDEX idx_idempotency_locks_key_process ON idempotency_locks(lock_key, process_id);