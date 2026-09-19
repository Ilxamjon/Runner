-- Vacancy workplace location for map pins / navigation

ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326),
  ADD COLUMN IF NOT EXISTS address_text TEXT;

CREATE INDEX IF NOT EXISTS idx_vacancies_location ON vacancies USING GIST (location);

CREATE OR REPLACE FUNCTION set_vacancy_location(
  p_vacancy_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_address TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE vacancies
  SET
    location = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    address_text = COALESCE(NULLIF(trim(p_address), ''), address_text),
    updated_at = now()
  WHERE id = p_vacancy_id
    AND employer_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vacancy not found or not owned by user';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION set_vacancy_location TO authenticated;
