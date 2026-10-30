-- Security regression tests (pgTAP). Run with: supabase test db
--
-- Actors
--   E = employer   11111111-1111-1111-1111-111111111111
--   R = runner     22222222-2222-2222-2222-222222222222
--   O = outsider   33333333-3333-3333-3333-333333333333 (runner + candidate)
--   A = admin      44444444-4444-4444-4444-444444444444

begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- Run a statement as an authenticated user. Returns 'ok' or the SQLSTATE.
-- Assertions are made outside, as the superuser, so pgTAP never runs under
-- the restricted role.
create or replace function pg_temp.try_as(uid uuid, stmt text)
returns text
language plpgsql
as $$
declare
  state text;
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text,
    true
  );
  perform set_config('request.jwt.claim.sub', uid::text, true);
  set local role authenticated;
  begin
    execute stmt;
    state := 'ok';
  exception when others then
    state := sqlstate;
  end;
  reset role;
  return state;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fixtures (handle_new_user() creates profile + wallet automatically)
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, phone, phone_confirmed_at,
  raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'employer@runner.test', '998900000001', now(),
   '{"full_name":"Employer"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'runner@runner.test', '998900000002', now(),
   '{"full_name":"Runner"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated', 'outsider@runner.test', '998900000003', now(),
   '{"full_name":"Outsider"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444',
   'authenticated', 'authenticated', 'admin@runner.test', '998900000004', now(),
   '{"full_name":"Admin"}'::jsonb, now(), now());

update public.profiles
set roles = '{candidate,employer,runner}'
where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

update public.profiles
set roles = '{candidate,admin}'
where id = '44444444-4444-4444-4444-444444444444';

update public.wallets
set balance = 500000
where user_id = '11111111-1111-1111-1111-111111111111';

insert into public.micro_tasks (id, employer_id, title, description, location, price_amount)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111',
   'Task 1', 'd', st_setsrid(st_makepoint(59.6, 42.46), 4326)::geography, 100000),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '11111111-1111-1111-1111-111111111111',
   'Task 2', 'd', st_setsrid(st_makepoint(59.6, 42.46), 4326)::geography, 100000);

insert into public.vacancies (id, employer_id, title, description, job_type, status)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '11111111-1111-1111-1111-111111111111',
        'Vacancy', 'd', 'permanent', 'published');

-- ---------------------------------------------------------------------------
-- A. Clients must not be able to mint money or touch protected fields
-- ---------------------------------------------------------------------------
select is(
  pg_temp.try_as('11111111-1111-1111-1111-111111111111',
    $$select public.wallet_deposit(1000)$$),
  '42501', 'client cannot call wallet_deposit');

select is(
  pg_temp.try_as('11111111-1111-1111-1111-111111111111',
    $$select public.provider_wallet_deposit('11111111-1111-1111-1111-111111111111'::uuid, 1000, 'test', null, 'client-key-0001', '{}'::jsonb)$$),
  '42501', 'client cannot call provider_wallet_deposit');

select pg_temp.try_as('11111111-1111-1111-1111-111111111111',
  $$update public.wallets set balance = 999999999 where user_id = '11111111-1111-1111-1111-111111111111'$$);
select is(
  (select balance from public.wallets where user_id = '11111111-1111-1111-1111-111111111111'),
  500000::bigint, 'client cannot change own wallet balance');

select is(
  pg_temp.try_as('11111111-1111-1111-1111-111111111111',
    $$update public.profiles set roles = '{admin}' where id = '11111111-1111-1111-1111-111111111111'$$),
  '42501', 'client cannot edit own roles');

select is(
  pg_temp.try_as('11111111-1111-1111-1111-111111111111',
    $$update public.profiles set phone_verified = true where id = '11111111-1111-1111-1111-111111111111'$$),
  '42501', 'client cannot set phone_verified');

select is(
  pg_temp.try_as('11111111-1111-1111-1111-111111111111',
    $$update public.profiles set rating_avg = 5 where id = '11111111-1111-1111-1111-111111111111'$$),
  '42501', 'client cannot edit own rating');

select is(
  pg_temp.try_as('11111111-1111-1111-1111-111111111111',
    $$update public.employer_profiles set is_verified = true where user_id = '11111111-1111-1111-1111-111111111111'$$),
  '42501', 'client cannot self-verify employer');

select is(
  pg_temp.try_as('11111111-1111-1111-1111-111111111111',
    $$insert into public.reviews (reviewer_id, reviewee_id, rating) values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 5)$$),
  '42501', 'client cannot insert reviews directly');

select is(
  pg_temp.try_as('11111111-1111-1111-1111-111111111111',
    $$update public.micro_tasks set price_amount = 1 where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'$$),
  '42501', 'client cannot update micro_tasks directly');

select is(
  pg_temp.try_as('11111111-1111-1111-1111-111111111111',
    $$update public.applications set status = 'hired'$$),
  '42501', 'client cannot update applications directly');

select is(
  pg_temp.try_as('22222222-2222-2222-2222-222222222222',
    $$insert into public.task_assignments (task_id, runner_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '22222222-2222-2222-2222-222222222222')$$),
  '42501', 'client cannot create task assignments directly');

select pg_temp.try_as('11111111-1111-1111-1111-111111111111',
  $$update public.escrow_transactions set status = 'released'$$);
select is(
  (select count(*) from public.escrow_transactions where status = 'released'),
  0::bigint, 'client cannot modify escrow rows');

-- ---------------------------------------------------------------------------
-- B. Chat RLS must not recurse
-- ---------------------------------------------------------------------------
select is(
  pg_temp.try_as('11111111-1111-1111-1111-111111111111',
    $$select count(*) from public.conversation_participants$$),
  'ok', 'conversation_participants is readable (no recursive policy)');

-- ---------------------------------------------------------------------------
-- C. Client-inserted rows start in a safe state
-- ---------------------------------------------------------------------------
select is(
  pg_temp.try_as('11111111-1111-1111-1111-111111111111',
    $$insert into public.micro_tasks (id, employer_id, title, description, location, price_amount, status)
      values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '11111111-1111-1111-1111-111111111111', 't', 'd',
              st_setsrid(st_makepoint(59.6, 42.46), 4326)::geography, 1000, 'completed')$$),
  'ok', 'employer can create a task');
select is(
  (select status::text from public.micro_tasks where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'),
  'open', 'new task is forced to open');

select is(
  pg_temp.try_as('33333333-3333-3333-3333-333333333333',
    $$insert into public.applications (vacancy_id, candidate_id, status)
      values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '33333333-3333-3333-3333-333333333333', 'hired')$$),
  'ok', 'candidate can apply');
select is(
  (select status::text from public.applications
    where vacancy_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'
      and candidate_id = '33333333-3333-3333-3333-333333333333'),
  'submitted', 'new application is forced to submitted');

-- ---------------------------------------------------------------------------
-- D. Provider deposits: idempotent and replay-safe (runs as superuser,
--    like the service role would)
-- ---------------------------------------------------------------------------
select is(
  (select (public.provider_wallet_deposit(
      '44444444-4444-4444-4444-444444444444', 5000, 'test', null, 'deposit-key-0001', '{}'::jsonb
    ) ->> 'balance')::bigint),
  5000::bigint, 'first provider deposit credits wallet');

select is(
  (select (public.provider_wallet_deposit(
      '44444444-4444-4444-4444-444444444444', 5000, 'test', null, 'deposit-key-0001', '{}'::jsonb
    ) ->> 'duplicate')),
  'true', 'replayed deposit is reported as duplicate');

select is(
  (select balance from public.wallets where user_id = '44444444-4444-4444-4444-444444444444'),
  5000::bigint, 'replayed deposit does not credit twice');

select throws_ok(
  $$select public.provider_wallet_deposit('44444444-4444-4444-4444-444444444444', 9000, 'test', null, 'deposit-key-0001', '{}'::jsonb)$$,
  'P0001', 'Idempotency key conflict',
  'same key with a different amount is rejected');

-- ---------------------------------------------------------------------------
-- E. Escrow happy path and abuse attempts
-- ---------------------------------------------------------------------------
select is(
  pg_temp.try_as('22222222-2222-2222-2222-222222222222',
    $$select public.accept_micro_task('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1')$$),
  'P0001', 'runner cannot accept an unfunded task');

select is(
  pg_temp.try_as('11111111-1111-1111-1111-111111111111',
    $$select public.escrow_hold_for_task('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'hold-task-1-key')$$),
  'ok', 'employer funds own task');

select is(
  (select balance from public.wallets where user_id = '11111111-1111-1111-1111-111111111111'),
  400000::bigint, 'escrow hold debits employer wallet');

select is(
  pg_temp.try_as('22222222-2222-2222-2222-222222222222',
    $$select public.accept_micro_task('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1')$$),
  'ok', 'runner accepts funded task');

select is(
  pg_temp.try_as('33333333-3333-3333-3333-333333333333',
    $$select public.accept_micro_task('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1')$$),
  'P0001', 'second runner cannot accept the same task');

select is(
  pg_temp.try_as('11111111-1111-1111-1111-111111111111',
    $$select public.escrow_refund_for_task('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1')$$),
  'P0001', 'employer cannot refund after acceptance');

select is(
  pg_temp.try_as('33333333-3333-3333-3333-333333333333',
    $$select public.transition_micro_task_status('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'in_progress')$$),
  'P0001', 'outsider cannot move the task');

select is(
  pg_temp.try_as('22222222-2222-2222-2222-222222222222',
    $$select public.transition_micro_task_status('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'in_progress')$$),
  'ok', 'runner starts task');

select is(
  pg_temp.try_as('22222222-2222-2222-2222-222222222222',
    $$select public.transition_micro_task_status('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'completed')$$),
  'ok', 'runner completes task');

select is(
  pg_temp.try_as('22222222-2222-2222-2222-222222222222',
    $$select public.escrow_release_for_task('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1')$$),
  'P0001', 'runner cannot release escrow to themself');

select is(
  pg_temp.try_as('11111111-1111-1111-1111-111111111111',
    $$select public.escrow_release_for_task('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1')$$),
  'ok', 'employer releases escrow');

select is(
  (select balance from public.wallets where user_id = '22222222-2222-2222-2222-222222222222'),
  90000::bigint, 'runner receives amount minus 10% fee');

select is(
  (select sum(amount) from public.platform_fee_ledger),
  10000::numeric, 'platform fee is recorded in the fee ledger');

-- ---------------------------------------------------------------------------
-- F. Disputes cannot strand funds
-- ---------------------------------------------------------------------------
select is(
  pg_temp.try_as('11111111-1111-1111-1111-111111111111',
    $$select public.escrow_hold_for_task('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'hold-task-2-key')$$),
  'ok', 'employer funds second task');

select is(
  pg_temp.try_as('22222222-2222-2222-2222-222222222222',
    $$select public.accept_micro_task('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2')$$),
  'ok', 'runner accepts second task');

select is(
  pg_temp.try_as('33333333-3333-3333-3333-333333333333',
    $$select public.escrow_dispute_for_task('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'x')$$),
  'P0001', 'outsider cannot open a dispute');

select is(
  pg_temp.try_as('11111111-1111-1111-1111-111111111111',
    $$select public.escrow_dispute_for_task('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'work not done')$$),
  'ok', 'employer opens a dispute');

select is(
  (select status::text from public.escrow_transactions
    where micro_task_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'),
  'disputed', 'escrow is disputed');

select is(
  pg_temp.try_as('11111111-1111-1111-1111-111111111111',
    $$select public.escrow_resolve_dispute('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'refund', 'self-serve')$$),
  'P0001', 'non-admin cannot resolve a dispute');

select is(
  pg_temp.try_as('44444444-4444-4444-4444-444444444444',
    $$select public.escrow_resolve_dispute('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'refund', 'work not done')$$),
  'ok', 'admin resolves dispute with refund');

select is(
  (select balance from public.wallets where user_id = '11111111-1111-1111-1111-111111111111'),
  400000::bigint, 'refund returns funds to employer');

select is(
  (select status::text from public.micro_tasks where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'),
  'cancelled', 'refunded task is cancelled');

select is(
  pg_temp.try_as('44444444-4444-4444-4444-444444444444',
    $$select public.escrow_resolve_dispute('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'refund', 'again')$$),
  'P0001', 'a dispute cannot be resolved twice');

select * from finish();
rollback;
