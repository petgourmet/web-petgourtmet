-- Otorgar permisos a las tablas de idempotencia para los roles anon y authenticated

-- Permisos para idempotency_locks
GRANT ALL PRIVILEGES ON idempotency_locks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON idempotency_locks TO anon;

-- Permisos para idempotency_results  
GRANT ALL PRIVILEGES ON idempotency_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON idempotency_results TO anon;

-- Permisos para las secuencias
GRANT USAGE, SELECT ON SEQUENCE idempotency_locks_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE idempotency_locks_id_seq TO anon;

GRANT USAGE, SELECT ON SEQUENCE idempotency_results_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE idempotency_results_id_seq TO anon;

-- Crear políticas RLS para permitir acceso completo a usuarios autenticados
CREATE POLICY "Allow authenticated users full access to idempotency_locks" ON idempotency_locks
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon users full access to idempotency_locks" ON idempotency_locks
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access to idempotency_results" ON idempotency_results
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon users full access to idempotency_results" ON idempotency_results
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);