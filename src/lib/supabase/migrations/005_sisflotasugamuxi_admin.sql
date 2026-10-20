-- Migration: Make sisflotasugamuxi@gmail.com admin and handle its default role in trigger
-- ======================================================================================

-- 1. Update any existing profile for sisflotasugamuxi@gmail.com to have 'admin' role
UPDATE public.perfiles
SET rol = 'admin'
WHERE email = 'sisflotasugamuxi@gmail.com';

-- 2. Modify trigger function to assign admin role automatically to sisflotasugamuxi@gmail.com
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, email, nombre, rol)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'nombre',
    COALESCE(
      new.raw_user_meta_data->>'rol',
      CASE WHEN new.email = 'sisflotasugamuxi@gmail.com' THEN 'admin' ELSE 'consultor' END
    )
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
