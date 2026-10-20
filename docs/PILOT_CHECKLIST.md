# Runner — Nukus pilot checklist

Use this checklist as an operational document. Do not mark a step complete until evidence exists.

## A. Before inviting testers

- [ ] Confirm the demo build is green in GitHub Actions.
- [ ] Download the APK from the successful workflow artifact; install it on a test Android phone.
- [ ] Verify Uzbek/Russian language switching.
- [ ] Verify job search, job details, task list, profile, and all visible actions.
- [ ] Confirm the demo banner clearly says that data is local/sample data and no real payment is processed.
- [ ] Prepare a short feedback form and support contact.
- [ ] Do not ask testers to submit real identity documents or sensitive data in the demo.

## B. User discovery

- [ ] Interview 15 job seekers.
- [ ] Interview 15 employers/business owners.
- [ ] Record the problem, current alternative, urgency, and willingness to try Runner.
- [ ] Ask permission before quoting or recording a participant.
- [ ] Do not collect more personal data than necessary.

## C. Employer onboarding

For every pilot employer:
- [ ] Confirm business/contact identity through a documented manual process.
- [ ] Confirm the vacancy is current and the employer authorised publication.
- [ ] Record pay range, schedule, location, requirements, and application method.
- [ ] Reject listings asking candidates for advance fees or making misleading promises.
- [ ] Explain what the platform has and has not verified.

## D. Live pilot release gates

- [ ] Separate Supabase staging project is configured.
- [ ] OTP authentication works end-to-end.
- [ ] RLS tests confirm cross-user data isolation.
- [ ] Listing create/search/apply flows pass on real devices.
- [ ] Chat and report/removal workflows are tested.
- [ ] Privacy Policy, Terms, and support contact are published.
- [ ] Local legal review is complete for the intended operating model.
- [ ] Dependency audit has no unresolved high/critical production findings, or each exception is reviewed and explicitly accepted by a qualified maintainer.
- [ ] No real wallet deposits or escrow until official provider protocols, sandbox tests, and refund/dispute handling are complete.

## E. Weekly scorecard

Date range: __________

- Employers contacted: _____
- Employer interviews completed: _____
- Employers with current approved listings: _____
- Approved live listings: _____
- Job seekers who used the live service: _____
- Applications submitted: _____
- Employers responding within 72 hours: _____
- Interviews / matches confirmed: _____
- Repeat employers: _____
- Reports / suspicious listings: _____
- Top 3 user complaints: 1) _____ 2) _____ 3) _____
- Decision: continue / change segment / pause
