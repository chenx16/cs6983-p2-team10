# ForecastHub Team Meeting Notes

**Team 10:** Xinlai Chen, Qiong Wu

---

## Meeting 1 — Project Kickoff and HW3 Planning

**Date:** October 28, 2026
**Attendees:** Xinlai Chen, Qiong Wu

### Agenda
1. Choose the Project 2 topic
2. Review HW3 and Project 2 requirements
3. Agree on the tech stack
4. Divide HW3 tasks and set the sprint timeline

### Discussion
- **Topic selection.** Our first idea was a simplified Kalshi-style prediction market. Because Project 1 ideas cannot be reused, we refined it into a new product: **ForecastHub**, a friendly prediction platform for groups such as clubs, classes, and friends. It uses virtual credits only, with no real money, purchases, or betting.
- **Requirements review.** We went through the HW3 and Project 2 rubrics together, focusing on the pair workflow (partner PR reviews, balanced commits), 2+ sprints with 5+ issues each, TDD visible in Git history, CI/CD, and the documentation package.
- **Tech stack.** We chose from the Project 2 list: Next.js + TailwindCSS for the frontend, Express for the API, PostgreSQL + Prisma for the database, JWT for authentication, Zod for shared contracts, and Vitest + Supertest for testing.

### Decisions
| Decision | Details |
|---|---|
| HW3 task split | Xinlai: Task 1 (Scrum setup) and Task 3 (before/after test). Qiong: Task 2 (`AGENTS.md`) and Task 4 (reflection). |
| PRD and design | Both partners write and revise the PRD together. Qiong creates the mockups and visual references. |
| Sprint timeline | Two one-week sprints: Sprint 1 due November 4, Sprint 2 due November 11. Final Project 2 submission on November 12. |

### Action Items
| Owner | Task |
|---|---|
| Xinlai | Create the GitHub repository, labels, milestones, issues, and project board |
| Qiong | Draft the detailed PRD and the Arena mockup |
| Qiong | Build the repository scaffold and write `AGENTS.md` |

---

## Meeting 2 — PRD Alignment, Sprint 1 Planning, and HW3 Results

**Date:** October 29, 2026
**Attendees:** Xinlai Chen, Qiong Wu

### Agenda
1. Align GitHub issues with the updated PRD
2. Plan Sprint 1 and Sprint 2 and divide Project 2 work
3. Choose the feature for the HW3 before/after test
4. Review the test results and decide on rule changes

### Discussion
- **PRD alignment.** The detailed PRD replaced the early draft. It now uses A/B questions priced with LMSR, multi-answer shared pools, weekly free credits, and a success-rate leaderboard. Xinlai rewrote all 17 issues to match the new PRD, kept the same issue numbers, and linked each issue to its PRD user story.
- **Sprint scope.** We reviewed the scope and story-point estimates for both sprints. Sprint 1 (36 points) delivers the MVP: scaffold, schema, CI, authentication, the Arena list, question creation, LMSR pricing, A/B predictions, and the question detail page. Sprint 2 (30 points) covers shared pools, live updates, resolution and payouts, the leaderboard, credits and coupons, admin tools, the public API, and E2E/security work.
- **HW3 test feature.** We chose issue #5 (the Arena question list) because it covers UI, API, and tests, so differences in design fidelity, architecture, and test quality would be visible.
- **HW3 results.** With `AGENTS.md`, the agent followed PRD rules more closely: tests cited PRD IDs, LMSR pricing was implemented correctly, and a privacy test was added. However, both runs used in-memory seed data, created no migration, and wrote tests after the code.

### Decisions
| Decision | Details |
|---|---|
| Project 2 work split | Split by area to reduce overlap, about 33 story points each. Xinlai: question display, real-time updates, and DevOps (#2, #3, #5, #6, #9, #11, #13, #16, #17). Qiong: authentication, credit accounting, and admin tools (#1, #4, #7, #8, #10, #12, #14, #15). |
| Git workflow | Use issue branches and pull requests, share partner feedback, and coordinate dependent work. |
| Rules file update | Add three rules to `AGENTS.md` based on the HW3 results: API routes must use Prisma, every schema change needs a migration, and business-rule tests must be committed before the implementation. |
| Experiment branches | Keep `experiment/5-without-rules` and `experiment/5-with-rules` as draft PRs (#19, #20) for reference. They will not be merged. |

### Action Items
| Owner | Task |
|---|---|
| Xinlai | Finish the HW3 before/after comparison document |
| Xinlai | Open PR #22 to fix the setup steps and add the new `AGENTS.md` rules |
| Qiong | Review and merge PR #22 |
| Qiong | Complete the [HW3 reflection](../../reflections/hw3-context-engineering.md) |
| Both | Start Sprint 1 issues and record standups in `docs/sprints/sprint-1/` |

---

## Meeting 3 — Sprint 1 Implementation and Delivery Readiness

**Date:** November 2, 2026
**Attendees:** Xinlai Chen, Qiong Wu

### Discussion
- We reviewed the scaffold, database, authentication, Arena, and prediction work against the Sprint 1 plan. Feature work continued through issue-specific branches and pull requests with partner reviews.
- Pull requests must pass typecheck, lint, tests, and build checks before merge. The web application deploys to Vercel and the API deploys to Render after a successful merge to `main`.
- The API and shared package must emit runtime JavaScript and declaration files for deployment, with consistent Node and build configuration across local development and CI.
- We agreed to add dependency auditing, CodeQL analysis, Dependabot updates, and protected production environment controls. Deployment credentials remain in GitHub or provider secrets.

### Decisions
| Decision | Details |
|---|---|
| Required pull-request checks | Keep typecheck, lint, tests, and build as required validation before merging. |
| Deployment boundary | Deploy the web app through Vercel and the API through Render only after validation succeeds on `main`. |
| Secret handling | Store deployment and application secrets in GitHub or provider environment settings; keep them out of source control. |
| Sprint workflow | Continue issue-specific branches, partner reviews, and focused commits while completing the Sprint 1 MVP. |

### Results
| Result | Pull request |
|---|---|
| Added CI checks and the deployment workflow | [PR #26](https://github.com/chenx16/cs6983-p2-team10/pull/26) |
| Fixed API build output for deployment | [PR #28](https://github.com/chenx16/cs6983-p2-team10/pull/28) |
| Switched production web deployment to the official Vercel CLI | [PR #29](https://github.com/chenx16/cs6983-p2-team10/pull/29) |
| Added security scanning and production environment controls | [PR #31](https://github.com/chenx16/cs6983-p2-team10/pull/31) |

### Action Items
| Owner | Task |
|---|---|
| Xinlai | Continue the question display, Arena, real-time, and DevOps-related Sprint 1 work. |
| Qiong | Continue authentication, accounting, and administration-related Sprint 1 work. |
| Both | Run the complete validation suite before merging Sprint 1 pull requests. |
| Both | Keep standup notes and implementation results updated in the Sprint 1 documentation. |
