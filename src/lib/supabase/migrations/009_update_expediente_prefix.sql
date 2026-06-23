-- Migration: Update case number prefix from FAMFS- to FAM-
-- =========================================================

CREATE OR REPLACE FUNCTION public.set_expediente_number_trigger()
RETURNS TRIGGER AS $$
DECLARE
  year_num INT;
  seq_num BIGINT;
  seq_name TEXT;
BEGIN
  -- Only generate the number if it is not provided
  IF NEW.numero_expediente IS NULL OR NEW.numero_expediente = '' THEN
    IF NEW.fecha_incidente IS NULL THEN
      year_num := EXTRACT(YEAR FROM now());
    ELSE
      year_num := EXTRACT(YEAR FROM NEW.fecha_incidente);
    END IF;

    seq_name := 'expediente_seq_' || year_num;
    
    -- Create sequence dynamically for the year if it doesn't exist
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS ' || seq_name || ' START 1';
    EXECUTE 'SELECT nextval($1)' INTO seq_num USING seq_name;
    
    -- Set the case number formatted as FAM-AÑO-###
    NEW.numero_expediente := 'FAM-' || year_num || '-' || LPAD(seq_num::TEXT, 3, '0');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
