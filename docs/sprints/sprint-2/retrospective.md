# Sprint 2 Retrospective

- **Sprint:** Sprint 2 (November 5–15, 2026; the project deadline was extended to November 15)
- **Participants:** Xinlai Chen (`chenx16`), Qiong Wu (`qiong-wu-2317`)
- **Format:** Retrospective meeting at the end of the sprint; decisions were made jointly. During the sprint we posted daily standups in Microsoft Teams and met roughly every three days.

## What went well

- **Rebalancing unblocked both of us.** We re-split the remaining work by story points. Xinlai took the foundation issues (authentication #4, LMSR #7, predictions #8, question detail #9, Arena #5) so that Qiong's resolution, live updates, leaderboard and administrator work could build on merged code.
- **Deliberate descoping.** We cut multi-answer questions, shared pools, coupons, weekly credits, the private profile and the history chart, and documented why in [descoping.md](descoping.md). This kept a complete A/B flow: register → browse → predict → live prices → resolve → leaderboard.
- **Stronger testing infrastructure.** API integration tests run against an isolated PostgreSQL `_test` database; the reset guard requires a local/CI test host and a database name ending in `_test`. A native-Node smoke check and Playwright journeys run in CI. Organizer resolution and the seeded participant's leaderboard result are covered in [PR #84](https://github.com/chenx16/cs6983-p2-team10/pull/84), separately from the new user's prediction journey.
- **Test-first fixes.** For the later fixes (#74–#77, #79) the failing regression or coverage test was committed and pushed before the fix, so the red → green sequence is visible in the history.
- **Code review found real bugs.** Reviewing each other's work surfaced a WebSocket crash on malformed paths, cancelled predictions still shown as pending, leaderboard ranking on rounded rates, and resolution allowed before the event time. Each was fixed with a regression test.
- **Money-safety design.** Predictions run in one transaction with row locks, `minShares` price protection and idempotency keys, with focused tests including concurrency cases.
- **Scope decisions stayed connected to implementation.** Meetings 4–6 turned the A/B-only decision into concrete server-authority, privacy, organizer, Arena, resolution, and ledger requirements. The resulting work shipped through the prediction, question-management, Arena, resolution, and private-history pull requests listed in [descoping.md](descoping.md).

## What didn't go well

- **Production was silently stale.** From #50 until the fix in #56 (November 12–13), Render deployments crashed because the shared package used extensionless ESM imports that `tsx` and Vitest tolerated. CI stayed green, so features we believed were live were not (#55).
- **Balancing speed and feedback near the deadline.** We needed to merge finished work and move to dependent issues without waiting for a partner review every time. We shared review feedback when time allowed, including after merging.
- **Stacked branches need a final check.** One documentation PR (#72) targeted a feature branch rather than `main`; we caught it in review and brought full Swagger coverage to `main` in #79.
- **The AI agent sometimes went too far.** It once tried to auto-confirm Prisma prompts and merged pull requests without waiting for approval. `AGENTS.md` prohibits auto-confirming non-local database prompts. We also use explicit human authorization for Git operations.
- **Production had no data.** The seed script creates demo accounts with publicly known passwords, so it was unsafe for production; categories and questions had to be created manually.
- **Static-analysis surprises.** CodeQL flagged missing rate limiting on new routes twice; the second time we added pre-authentication and per-user limits up front.
- **Integration coordination was necessary.** The organizer, Arena, prediction, and resolution work depended on one another, so the team had to review lifecycle, deadline, permission, and accounting boundaries together rather than treating each UI/API change as independent.

## What we'll do differently

- **Keep the test-first commit pattern from our final fixes** as the default for every new feature.
- **Add smoke and E2E checks at the start of a project**, and verify the live deployment after every merge.
- **Keep the AI agent on a short leash:** it proposes commands, and a human confirms each commit, push and merge.
- **Plan production data** (categories, an administrator bootstrapped from environment variables) instead of relying on a development seed.
- **Add rate limiting when a route is created**, not after a scanner flags it.

## Partner feedback

**Xinlai → Qiong**

- *What went well:* Delivered a large set of features in Sprint 2 (organizer workspace, resolution and payouts, administrator tools, live WebSocket updates, leaderboard and API documentation) and picked up Arena data loading when it was needed.
- *Looking ahead:* Keep sharing useful feedback when time allows while continuing to make progress on the next issue.

**Qiong → Xinlai**

- *What went well:* Xinlai was consistently positive, proactive, and dependable throughout the sprint. She made significant contributions to several important areas of the project, including the initial project setup, CI/CD pipeline, deployment process, testing infrastructure, and core user-facing functionality. She demonstrated strong technical skills and a good understanding of how different parts of the system work together. She was also very responsible when handling her assigned tasks and actively communicated with teammates to coordinate work across dependent issues. Her willingness to help others, share progress, and address problems made the development process smoother and helped the team maintain steady progress throughout the sprint.
- *Looking ahead:* Continue the same proactive collaboration while leaving time near the deadline for final integration checks and production verification. Overall, I look forward to working with Xinlai again and believe her contributions will continue to have a positive impact on the team's efficiency and project quality.
