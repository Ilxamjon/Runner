-- Table-level grants required for PostgREST (RLS still enforces row access)

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON TABLE
  regions,
  industries,
  task_categories
TO anon, authenticated;

GRANT SELECT, UPDATE ON TABLE profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  candidate_profiles,
  employer_profiles,
  runner_profiles,
  vacancies,
  vacancy_images,
  applications,
  micro_tasks,
  task_images,
  task_assignments,
  wallets,
  wallet_ledger,
  escrow_transactions,
  conversations,
  conversation_participants,
  messages,
  reviews,
  verifications
TO authenticated;

-- Sequences used by identity columns (if any)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
