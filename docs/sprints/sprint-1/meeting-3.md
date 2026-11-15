# ForecastHub Team Meeting Notes

**Team 10:** Xinlai Chen, Qiong Wu

---

## Meeting 3 — Sprint 1 Implementation and Delivery Readiness

**Date:** November 2, 2026
**Attendees:** Xinlai Chen, Qiong Wu

### Agenda
1. Review Sprint 1 implementation progress
2. Confirm CI, deployment, and security requirements
3. Check that the build output is deployable in the selected environments
4. Coordinate the remaining Sprint 1 feature work and reviews

### Discussion
- **Sprint 1 progress.** We reviewed the scaffold, database, authentication, Arena, and prediction work against the Sprint 1 plan from Meeting 2. Feature work continued through issue-specific branches and pull requests, with both partners reviewing changes.
- **CI and deployment.** We confirmed that pull requests must run typecheck, lint, tests, and build checks before merge. The deployment workflow will deploy the web application to Vercel and trigger the API deployment on Render after a successful merge to `main`.
- **Build output.** We identified that the API and shared package must emit runtime JavaScript and declaration files for deployment. The Node version and build configuration must be consistent across local development and CI.
- **Security controls.** We agreed to add dependency auditing, CodeQL analysis, Dependabot updates, and protected production environment controls. Deployment credentials must remain in GitHub or provider secrets and must not be committed to the repository.
- **Remaining coordination.** The partners will continue the Sprint 1 feature branches, keep tests focused on observable behavior, and use partner review before merging. Work that depends on the CI and build foundations will be validated after those pull requests are available.

### Results

| Result | Pull request |
|---|---|
| Added CI checks and the deployment workflow | [PR #26](https://github.com/chenx16/cs6983-p2-team10/pull/26) |
| Fixed API build output for deployment | [PR #28](https://github.com/chenx16/cs6983-p2-team10/pull/28) |
| Switched production web deployment to the official Vercel CLI | [PR #29](https://github.com/chenx16/cs6983-p2-team10/pull/29) |
| Added security scanning and production environment controls | [PR #31](https://github.com/chenx16/cs6983-p2-team10/pull/31) |

### Decisions

| Decision | Details |
|---|---|
| Required pull-request checks | Keep typecheck, lint, tests, and build as required validation before merging. |
| Deployment boundary | Deploy the web app through Vercel and the API through Render only after validation succeeds on `main`. |
| Secret handling | Store deployment and application secrets in GitHub or provider environment settings; keep them out of source control. |
| Sprint workflow | Continue issue-specific branches, partner reviews, and focused commits while completing the Sprint 1 MVP. |

### Action Items

| Owner | Task |
|---|---|
| Xinlai | Continue the question display, Arena, real-time, and DevOps-related Sprint 1 work. |
| Qiong | Continue authentication, accounting, and administration-related Sprint 1 work. |
| Both | Run the complete validation suite before merging Sprint 1 pull requests. |
| Both | Keep standup notes and implementation results updated in the Sprint 1 documentation. |
