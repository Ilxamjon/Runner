# Trust & Communication

## Chat

- Conversations linked to `micro_task_id` or `vacancy_application_id`
- Created via `get_or_create_task_conversation` / `get_or_create_application_conversation`
- Realtime on `messages` table
- Screens: `(tabs)/messages`, `/chat/[id]`

## Reviews

- Double-sided after task `completed` / `verified`
- `submit_task_review` RPC enforces parties + uniqueness
- Trigger `refresh_profile_rating` updates `profiles.rating_avg` / `rating_count`

## Verification

- Phone: via Auth OTP (`phone_verified` on profile)
- Identity: image upload to `verification-docs` bucket + `verifications` row (`pending`)
- Admin approval is out of band (service role / dashboard)

## Entry points

| From | Action |
|------|--------|
| Task detail | Open chat, leave review |
| Applicants list | Open chat with candidate |
| Profile | Verifications, Reviews, Wallet |
| Messages tab | Conversation list |
