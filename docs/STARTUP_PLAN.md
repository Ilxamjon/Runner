# Runner — Startup launch plan (Nukus-first)

Last updated: 2026-10-20

## 1. Startup goal

Validate whether Runner can reliably connect people who need work with local employers and people who need small tasks completed. Start in Nukus and expand to other districts only after repeat usage is demonstrated.

Runner is currently a development product, not a production-ready marketplace. This plan is a validation plan, not a claim that legal, payment, security, or operational readiness has been completed.

## 2. Initial target groups

### Supply side
- Job seekers looking for full-time, part-time, or temporary work.
- Adults who can complete clearly scoped local tasks.
- Students only where the work is lawful, age-appropriate, and does not interfere with education; do not target minors for hazardous or restricted work.

### Demand side
- Small shops and service businesses.
- Cafes and food businesses.
- Training centres and local offices.
- Residents needing low-risk errands or simple technical help.

## 3. Narrow first market

For the first pilot, do not launch every category at once.

Test two categories:
1. Local vacancies: retail, service, office assistant, entry-level roles.
2. Small tasks: errands, document delivery, basic computer setup, and other clearly described low-risk tasks.

Exclude hazardous work, regulated services, unclear tasks, and any task that could put a worker at risk. Verify the poster and task details before publishing during the pilot.

## 4. Value proposition

- Uzbek and Russian interface.
- Local-first search, starting with Nukus.
- Clear pay, location, schedule, and task scope.
- Simple contact/application flow.
- A trust and reporting process for suspicious listings.

Do not advertise guaranteed employment, guaranteed earnings, verified employers, or secure escrow until the corresponding features and operating process are implemented and tested.

## 5. First 30 days

### Week 1 — Discovery
- Interview at least 15 job seekers and 15 local employers.
- Ask employers how they currently recruit, what it costs, and what makes candidates unreliable.
- Ask job seekers how they find work, which information is missing from listings, and what scams they worry about.
- Record findings without collecting unnecessary personal or identity data.
- Choose one or two categories based on evidence.

### Week 2 — Concierge pilot
- Recruit 5–10 employers willing to provide real, current vacancies.
- Manually review each listing before it is shared.
- Help 20–30 adult job seekers test the demo or staging app.
- Until server-backed flows have passed QA, do not represent demo actions as real submissions.
- Track each listing from publication to employer response and interview.

### Week 3 — Controlled live test
Only after staging, privacy, security, and legal checks are complete:
- Publish a small number of real vacancies.
- Confirm each employer and the vacancy details using a documented process.
- Provide a support contact and a way to report or remove suspicious listings.
- Do not enable real wallet deposits or escrow until official payment-provider integrations, security tests, and required approvals are complete.

### Week 4 — Review
- Review funnel metrics and interview participants.
- Fix the three biggest usability or trust issues.
- Decide whether to continue, change the target segment, or pause.

## 6. Metrics to measure

Track weekly:
- Employers interviewed and employers who actually publish a listing.
- Active, approved listings.
- Unique job seekers who view a listing.
- Applications started and successfully submitted.
- Employer response rate within 72 hours.
- Interviews or completed task matches reported by both sides.
- Time from listing publication to first qualified response.
- Repeat employers within 30 days.
- Reports, suspected scams, removals, and support response time.

Do not count sample/demo activity as real marketplace traction. Report sample size and date range with every metric.

## 7. Initial monetisation hypotheses

Do not charge job seekers to apply during the validation pilot.

Test with employers, after value is demonstrated:
- Free introductory listing quota, then a transparent paid listing.
- Featured listings with clear labelling.
- Business subscription for repeat hiring.

Do not introduce transaction commissions or wallet-based escrow until payment-provider integration, dispute/refund processes, accounting, and local legal requirements have been reviewed. Validate willingness to pay before implementing billing.

## 8. Trust and safety baseline

Before live public use:
- Publish Terms of Use, Privacy Policy, support contact, and listing/reporting rules.
- Collect only data required for the service; do not expose personal phone numbers publicly by default.
- Provide report/block/remove workflows and a human review process.
- Define employer verification and explain exactly what “verified” means.
- Never promise that every listing is safe or every employer is verified.
- Restrict or moderate scams, advance-fee requests, unlawful work, discriminatory listings, and dangerous tasks.
- Keep test accounts and test data separate from real users.
- Review Uzbekistan-specific labour, personal-data, consumer, tax, and payment requirements with a qualified local professional before public launch.

## 9. Current technical release gates

As of 2026-10-20, the production audit records:
- TypeScript check passed in the inspected CI run.
- Supabase migration reset passed in the inspected CI run.
- Production dependency audit failed with 32 reported advisories (10 moderate, 21 high, 1 critical).
- Official Click/Payme/Uzum payment protocols and sandbox tests remain incomplete.
- RLS/security regression tests and real-device end-to-end QA remain mandatory.
- The demo APK build must be confirmed successful and installed on a real Android device.

Therefore:
- Keep live payments disabled.
- Do not merge dependency updates blindly with `npm audit fix --force`.
- Resolve compatible dependency updates, run full CI and build checks, then review the resulting diff.
- Do not call the product production-ready until the launch gates are checked off.

## 10. Decision gate

Continue beyond the pilot only if:
- Real employers supply current listings repeatedly.
- Job seekers can complete the core flow without staff intervention.
- Employers respond to candidates at a useful rate.
- There is a repeatable way to moderate fraud and resolve complaints.
- The team can support the service consistently.

A good startup result may be evidence to narrow or change the idea; it is not necessarily immediate growth.
