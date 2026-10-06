-- Production hardening phase 3:
-- protect trust/identity fields from client-side privilege escalation.

-- -----------------------------------------------------------------------------
-- Profiles: users may edit presentation fields only.
-- roles, phone_verified, rating and activation state are server-controlled.
-- -----------------------------------------------------------------------------
REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url, bio, locale, region_id) ON profiles TO authenticated;

CREATE OR REPLACE FUNCTION complete_profile_onboarding(
  p_full_name TEXT,
  p_bio TEXT DEFAULT NULL,
  p_locale app_locale DEFAULT 'uz'
)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result profiles;
  next_roles user_role[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    ARRAY(
      SELECT DISTINCT r
      FROM unnest(
        roles ||
        ARRAY['candidate'::user_role, 'employer'::user_role, 'runner'::user_role]
      ) AS r
    )
  INTO next_roles
  FROM profiles
  WHERE id = auth.uid();

  UPDATE profiles
  SET
    full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
    bio = nullif(trim(coalesce(p_bio, '')), ''),
    locale = p_locale,
    roles = next_roles,
    onboarding_completed = true,
    updated_at = now()
  WHERE id = auth.uid()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION ensure_default_roles()
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result profiles;
  next_roles user_role[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    ARRAY(
      SELECT DISTINCT r
      FROM unnest(
        roles ||
        ARRAY['candidate'::user_role, 'employer'::user_role, 'runner'::user_role]
      ) AS r
    )
  INTO next_roles
  FROM profiles
  WHERE id = auth.uid();

  UPDATE profiles
  SET roles = next_roles, updated_at = now()
  WHERE id = auth.uid()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION sync_verified_phone()
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  verified_phone TEXT;
  result public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT phone INTO verified_phone
  FROM auth.users
  WHERE id = auth.uid();

  IF verified_phone IS NULL OR length(trim(verified_phone)) = 0 THEN
    RAISE EXCEPTION 'No verified phone on auth user';
  END IF;

  UPDATE public.profiles
  SET phone = verified_phone,
      phone_verified = true,
      updated_at = now()
  WHERE id = auth.uid()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION complete_profile_onboarding(TEXT, TEXT, app_locale) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION ensure_default_roles() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION sync_verified_phone() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION complete_profile_onboarding(TEXT, TEXT, app_locale) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_default_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_verified_phone() TO authenticated;

-- -----------------------------------------------------------------------------
-- Employer verification badge is server/admin controlled.
-- -----------------------------------------------------------------------------
REVOKE INSERT, UPDATE ON employer_profiles FROM authenticated;
GRANT INSERT (user_id, company_name, description, logo_url, website)
  ON employer_profiles TO authenticated;
GRANT UPDATE (company_name, description, logo_url, website)
  ON employer_profiles TO authenticated;

-- -----------------------------------------------------------------------------
-- Runner trust counters/location are server controlled.
-- Client may only create/update availability.
-- -----------------------------------------------------------------------------
REVOKE INSERT, UPDATE ON runner_profiles FROM authenticated;
GRANT INSERT (user_id, is_available) ON runner_profiles TO authenticated;
GRANT UPDATE (is_available) ON runner_profiles TO authenticated;

-- -----------------------------------------------------------------------------
-- Verification submissions must always start pending.
-- Users cannot self-approve/reject or forge reviewed_at.
-- -----------------------------------------------------------------------------
REVOKE INSERT, UPDATE ON verifications FROM authenticated;
GRANT INSERT (user_id, type, document_url, metadata) ON verifications TO authenticated;
