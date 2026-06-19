-- Migration: Change case number format to FAMFS-AÑO-###
-- ===================================================

CREATE OR REPLACE FUNCTION generate_expediente_number()
RETURNS TEXT AS $$
DECLARE
  year_num INT := EXTRACT(YEAR FROM now());
  seq_num BIGINT;
  seq_name TEXT;
BEGIN
  seq_name := 'expediente_seq_' || year_num;
  -- Create sequence for new year if needed
  EXECUTE 'CREATE SEQUENCE IF NOT EXISTS ' || seq_name || ' START 1';
  EXECUTE 'SELECT nextval($1)' INTO seq_num USING seq_name;
  RETURN 'FAMFS-' || year_num || '-' || LPAD(seq_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
