-- Migration: Calculate case number based on the incident date (fecha_incidente)
-- =========================================================================

-- 1. Remove the default value from the column so it is NULL if not explicitly passed
ALTER TABLE public.expedientes ALTER COLUMN numero_expediente DROP DEFAULT;

-- 2. Create or replace the trigger function
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
    
    -- Set the case number formatted as FAMFS-AÑO-###
    NEW.numero_expediente := 'FAMFS-' || year_num || '-' || LPAD(seq_num::TEXT, 3, '0');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop trigger if it already exists
DROP TRIGGER IF EXISTS trg_set_expediente_number ON public.expedientes;

-- 4. Create the BEFORE INSERT trigger to intercept insertions
CREATE TRIGGER trg_set_expediente_number
BEFORE INSERT ON public.expedientes
FOR EACH ROW
EXECUTE FUNCTION public.set_expediente_number_trigger();
