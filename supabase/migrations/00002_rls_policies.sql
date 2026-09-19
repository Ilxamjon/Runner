-- Runner: Row Level Security policies

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE runner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacancy_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE micro_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

-- Helper: check if user has a role
CREATE OR REPLACE FUNCTION has_role(required user_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND required = ANY(roles)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =============================================================================
-- PUBLIC READ TAXONOMY
-- =============================================================================

CREATE POLICY "regions_select_all" ON regions FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "industries_select_all" ON industries FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "task_categories_select_all" ON task_categories FOR SELECT TO authenticated, anon USING (true);

-- =============================================================================
-- PROFILES
-- =============================================================================

CREATE POLICY "profiles_select_public" ON profiles FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- =============================================================================
-- ROLE-SPECIFIC PROFILES
-- =============================================================================

CREATE POLICY "candidate_profiles_select" ON candidate_profiles FOR SELECT TO authenticated
  USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "candidate_profiles_upsert_own" ON candidate_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "employer_profiles_select" ON employer_profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "employer_profiles_upsert_own" ON employer_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "runner_profiles_select" ON runner_profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "runner_profiles_upsert_own" ON runner_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- VACANCIES
-- =============================================================================

CREATE POLICY "vacancies_select_published" ON vacancies FOR SELECT TO authenticated
  USING (status = 'published' OR employer_id = auth.uid());

CREATE POLICY "vacancies_insert_employer" ON vacancies FOR INSERT TO authenticated
  WITH CHECK (employer_id = auth.uid() AND has_role('employer'));

CREATE POLICY "vacancies_update_own" ON vacancies FOR UPDATE TO authenticated
  USING (employer_id = auth.uid()) WITH CHECK (employer_id = auth.uid());

CREATE POLICY "vacancies_delete_own" ON vacancies FOR DELETE TO authenticated
  USING (employer_id = auth.uid());

-- =============================================================================
-- VACANCY IMAGES
-- =============================================================================

CREATE POLICY "vacancy_images_select" ON vacancy_images FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vacancies v
      WHERE v.id = vacancy_images.vacancy_id
        AND (v.status = 'published' OR v.employer_id = auth.uid())
    )
  );

CREATE POLICY "vacancy_images_manage_own" ON vacancy_images FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vacancies v
      WHERE v.id = vacancy_images.vacancy_id AND v.employer_id = auth.uid()
    )
  );

-- =============================================================================
-- APPLICATIONS
-- =============================================================================

CREATE POLICY "applications_select_parties" ON applications FOR SELECT TO authenticated
  USING (
    candidate_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM vacancies v
      WHERE v.id = applications.vacancy_id AND v.employer_id = auth.uid()
    )
  );

CREATE POLICY "applications_insert_candidate" ON applications FOR INSERT TO authenticated
  WITH CHECK (candidate_id = auth.uid() AND has_role('candidate'));

CREATE POLICY "applications_update_parties" ON applications FOR UPDATE TO authenticated
  USING (
    candidate_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM vacancies v
      WHERE v.id = applications.vacancy_id AND v.employer_id = auth.uid()
    )
  );

-- =============================================================================
-- MICRO-TASKS
-- =============================================================================

CREATE POLICY "micro_tasks_select" ON micro_tasks FOR SELECT TO authenticated
  USING (
    status IN ('open', 'accepted', 'in_progress')
    OR employer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM task_assignments ta
      WHERE ta.task_id = micro_tasks.id AND ta.runner_id = auth.uid()
    )
  );

CREATE POLICY "micro_tasks_insert_employer" ON micro_tasks FOR INSERT TO authenticated
  WITH CHECK (employer_id = auth.uid());

CREATE POLICY "micro_tasks_update_parties" ON micro_tasks FOR UPDATE TO authenticated
  USING (
    employer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM task_assignments ta
      WHERE ta.task_id = micro_tasks.id AND ta.runner_id = auth.uid()
    )
  );

-- =============================================================================
-- TASK IMAGES & ASSIGNMENTS
-- =============================================================================

CREATE POLICY "task_images_select" ON task_images FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM micro_tasks t
      WHERE t.id = task_images.task_id
        AND (
          t.status IN ('open', 'accepted', 'in_progress')
          OR t.employer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM task_assignments ta
            WHERE ta.task_id = t.id AND ta.runner_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "task_images_manage_employer" ON task_images FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM micro_tasks t
      WHERE t.id = task_images.task_id AND t.employer_id = auth.uid()
    )
  );

CREATE POLICY "task_assignments_select" ON task_assignments FOR SELECT TO authenticated
  USING (
    runner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM micro_tasks t
      WHERE t.id = task_assignments.task_id AND t.employer_id = auth.uid()
    )
  );

CREATE POLICY "task_assignments_insert_runner" ON task_assignments FOR INSERT TO authenticated
  WITH CHECK (
    runner_id = auth.uid()
    AND has_role('runner')
    AND EXISTS (
      SELECT 1 FROM micro_tasks t
      WHERE t.id = task_assignments.task_id AND t.status = 'open'
    )
  );

-- =============================================================================
-- WALLETS (read-only for users; mutations via service role / Edge Functions)
-- =============================================================================

CREATE POLICY "wallets_select_own" ON wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "wallet_ledger_select_own" ON wallet_ledger FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wallets w
      WHERE w.id = wallet_ledger.wallet_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "escrow_select_parties" ON escrow_transactions FOR SELECT TO authenticated
  USING (payer_id = auth.uid() OR payee_id = auth.uid());

-- =============================================================================
-- MESSAGING
-- =============================================================================

CREATE POLICY "conversations_select_participant" ON conversations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "conversation_participants_select" ON conversation_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "messages_select_participant" ON messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert_participant" ON messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

-- =============================================================================
-- REVIEWS & VERIFICATIONS
-- =============================================================================

CREATE POLICY "reviews_select_all" ON reviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "reviews_insert_own" ON reviews FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "verifications_select_own" ON verifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "verifications_insert_own" ON verifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- REALTIME
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE micro_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE applications;
