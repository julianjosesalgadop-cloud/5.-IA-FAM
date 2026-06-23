-- Migration: Update case number prefix from FAMFS- / FAM- to FAM-FS- and pad to 4 digits
-- =========================================================================================

-- 1. Create or replace the trigger function
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
    
    -- Set the case number formatted as FAM-FS-AÑO-####
    NEW.numero_expediente := 'FAM-FS-' || year_num || '-' || LPAD(seq_num::TEXT, 4, '0');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update existing records in the database to match the new format
UPDATE public.expedientes
SET numero_expediente = 
  CASE 
    WHEN numero_expediente LIKE 'FAMFS-%' THEN
      'FAM-FS-' || split_part(numero_expediente, '-', 2) || '-' || LPAD(split_part(numero_expediente, '-', 3), 4, '0')
    WHEN numero_expediente LIKE 'FAM-%' THEN
      'FAM-FS-' || split_part(numero_expediente, '-', 2) || '-' || LPAD(split_part(numero_expediente, '-', 3), 4, '0')
    ELSE numero_expediente
  END
WHERE numero_expediente LIKE 'FAMFS-%' OR numero_expediente LIKE 'FAM-%';
