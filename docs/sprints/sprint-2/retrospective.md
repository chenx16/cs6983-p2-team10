# Sprint 2 Retrospective

- **Sprint:** Sprint 2 (November 5–15, 2026; the project deadline was extended to November 15)
- **Participants:** Xinlai Chen (`chenx16`), Qiong Wu (`qiong-wu-2317`)
- **Format:** Retrospective meeting at the end of the sprint; decisions were made jointly. During the sprint we posted daily standups in Microsoft Teams and met roughly every three days.

## What went well

- **Rebalancing unblocked both of us.** We re-split the remaining work by story points. Xinlai took the foundation issues (authentication #4, LMSR #7, predictions #8, question detail #9, Arena #5) so that Qiong's resolution, live updates, leaderboard and administrator work could build on merged code.
- **Deliberate descoping.** We cut multi-answer questions, shared pools, coupons, weekly credits, the private profile and the history chart, and documented why in [descoping.md](descoping.md). This kept a complete A/B flow: register → browse → predict → live prices → resolve → leaderboard.
- **Stronger testing infrastructure.** API integration tests run against an isolated PostgreSQL `_test` database; the reset guard requires a local/CI test host and a database name ending in `_test`. A native-Node smoke check and a Playwright end-to-end journey now run in CI. The organizer-resolution-to-leaderboard E2E coverage remains outstanding in #17.
- **Test-first fixes.** For the later fixes (#74–#77, #79) the failing regression or coverage test was committed and pushed before the fix, so the red → green sequence is visible in the history.
- **Code review found real bugs.** Reviewing each other's work surfaced a WebSocket crash on malformed paths, cancelled predictions still shown as pending, leaderboard ranking on rounded rates, and resolution allowed before the event time. Each was fixed with a regression test.
- **Money-safety design.** Predictions run in one transaction with row locks, `minShares` price protection and idempotency keys, with focused tests including concurrency cases.

## What didn't go well

- **Production was silently stale.** From #50 until the fix in #56 (November 12–13), Render deployments crashed because the shared package used extensionless ESM imports that `tsx` and Vitest tolerated. CI stayed green, so features we believed were live were not (#55).
- **Balancing speed and process near the deadline.** Keeping dependent work moving meant some merges happened quickly, with partner reviews following or missing. Our final fixes (#74–#77, #79) show the test-first sequence, but do not demonstrate consistent pre-merge partner review.
- **Stacked branches need a final check.** One documentation PR (#72) targeted a feature branch rather than `main`; we caught it in review and brought full Swagger coverage to `main` in #79.
- **The AI agent sometimes went too far.** It once tried to auto-confirm Prisma prompts and merged pull requests without waiting for approval. `AGENTS.md` prohibits auto-confirming non-local database prompts and instructs contributors to request reviewers and resolve review comments before merging. We also use explicit human authorization for Git operations.
- **Production had no data.** The seed script creates demo accounts with publicly known passwords, so it was unsafe for production; categories and questions had to be created manually.
- **Static-analysis surprises.** CodeQL flagged missing rate limiting on new routes twice; the second time we added pre-authentication and per-user limits up front.

## What we'll do differently

- **Keep the test-first commit pattern from our final fixes** as the default for every new feature.
- **Add smoke and E2E checks at the start of a project**, and verify the live deployment after every merge.
- **Keep the AI agent on a short leash:** it proposes commands, and a human confirms each commit, push and merge.
- **Plan production data** (categories, an administrator bootstrapped from environment variables) instead of relying on a development seed.
- **Add rate limiting when a route is created**, not after a scanner flags it.

## Partner feedback

**Xinlai → Qiong**

- *What went well:* Delivered a large set of features in Sprint 2 (organizer workspace, resolution and payouts, administrator tools, live WebSocket updates, leaderboard and API documentation) and picked up Arena data loading when it was needed.
- *Looking ahead:* A goal for both of us is to make test-first commits and pre-merge reviews visible in every PR.

**Qiong → Xinlai**

> TODO — Qiong writes this section in their own words (what went well, what to improve).
