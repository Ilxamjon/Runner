-- Expose lat/lng for easy client mapping (PostgREST returns geography as EWKB)

ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

UPDATE vacancies
SET
  lat = ST_Y(location::geometry),
  lng = ST_X(location::geometry)
WHERE location IS NOT NULL
  AND (lat IS NULL OR lng IS NULL);

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
    lat = p_lat,
    lng = p_lng,
    address_text = COALESCE(NULLIF(trim(p_address), ''), address_text),
    updated_at = now()
  WHERE id = p_vacancy_id
    AND employer_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vacancy not found or not owned by user';
  END IF;
END;
$$;
