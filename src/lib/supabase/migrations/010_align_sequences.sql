-- Migration: Align sequence values with existing case numbers to prevent duplicate key violations
-- =========================================================================================

-- 1. Ensure sequences exist
CREATE SEQUENCE IF NOT EXISTS expediente_seq_2024 START 1;
CREATE SEQUENCE IF NOT EXISTS expediente_seq_2025 START 1;
CREATE SEQUENCE IF NOT EXISTS expediente_seq_2026 START 1;

-- 2. Align sequence values to MAX(seq) + 1 (so nextval returns MAX + 1)
SELECT setval('expediente_seq_2024', COALESCE((SELECT MAX(split_part(numero_expediente, '-', 4)::integer) FROM public.expedientes WHERE numero_expediente LIKE 'FAM-FS-2024-%'), 0) + 1, false);
SELECT setval('expediente_seq_2025', COALESCE((SELECT MAX(split_part(numero_expediente, '-', 4)::integer) FROM public.expedientes WHERE numero_expediente LIKE 'FAM-FS-2025-%'), 0) + 1, false);
SELECT setval('expediente_seq_2026', COALESCE((SELECT MAX(split_part(numero_expediente, '-', 4)::integer) FROM public.expedientes WHERE numero_expediente LIKE 'FAM-FS-2026-%'), 0) + 1, false);
