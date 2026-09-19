-- Runner mode: helper RPCs for geography operations

CREATE OR REPLACE FUNCTION create_micro_task(
  p_title TEXT,
  p_description TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_price_amount BIGINT,
  p_category_id UUID DEFAULT NULL,
  p_address_text TEXT DEFAULT NULL,
  p_region_id UUID DEFAULT NULL,
  p_urgency task_urgency DEFAULT 'normal',
  p_radius_meters INT DEFAULT 5000
)
RETURNS micro_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result micro_tasks;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO micro_tasks (
    employer_id, title, description, location, price_amount,
    category_id, address_text, region_id, urgency, radius_meters, status
  ) VALUES (
    auth.uid(),
    p_title,
    p_description,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_price_amount,
    p_category_id,
    p_address_text,
    p_region_id,
    p_urgency,
    p_radius_meters,
    'open'
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION update_runner_location(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO runner_profiles (user_id, current_location, location_updated)
  VALUES (
    auth.uid(),
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    current_location = EXCLUDED.current_location,
    location_updated = now(),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION create_micro_task TO authenticated;
GRANT EXECUTE ON FUNCTION update_runner_location TO authenticated;
GRANT EXECUTE ON FUNCTION nearby_open_tasks TO authenticated;
