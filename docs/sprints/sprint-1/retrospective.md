# Sprint 1 Retrospective

- **Sprint:** Sprint 1 (milestone due November 4, 2026)
- **Participants:** Xinlai Chen (`chenx16`), Qiong Wu (`qiong-wu-2317`)
- **Format:** Retrospective meeting at the end of the sprint; decisions were made jointly. During the sprint we posted daily standups in Microsoft Teams and met roughly every three days.

## What went well

- **Joint planning from the PRD.** We turned the PRD user stories into GitHub issues with acceptance criteria, labels, priorities and story-point estimates, and split them across two milestones (see [planning.md](planning.md)).
- **CI/CD early.** The multi-stage pipeline was in place before most features: install, typecheck, lint, test and build on every pull request, Vercel preview deployments, and automated deployment to Vercel (web) and Render (API) after the tests pass on `main`.
- **Delivery readiness was made explicit.** Meeting 3 clarified the deployment boundary, required pull-request checks, emitted API and shared-package build artifacts, and secret-handling rules. This led directly to the CI, build, deployment, and security pull requests recorded in [planning.md](planning.md).
- **A shared rules file from day one.** `AGENTS.md`, refined during HW3, gave both of us the same conventions for branches, commits, TDD and architecture when working with the AI IDE.
- **Production infrastructure.** Vercel, Render and Neon were connected early, with secrets kept in GitHub, Vercel and Render rather than in the repository.

## What didn't go well

- **Deployment problems consumed much of the sprint.** In sequence: the API build emitted no files because the base `tsconfig` set `noEmit` (#27); the third-party Vercel deploy action shipped a 2022 CLI that could not read our monorepo project (#29); an environment variable created as a Vercel *Secret* was unavailable to builds run in GitHub Actions; and the Swagger link caused an infinite redirect between Next.js and Express trailing-slash rules (#30). Each fix was small, but finding the cause took time.
- **Feature issues slipped.** Several Sprint 1 feature issues (#4–#9) were not finished by the November 4 milestone date and carried into the Sprint 2 window.
- **Feature dependencies were clearer in hindsight.** Authentication (#4) and the LMSR engine (#7) underpin most other features; our initial task order did not yet reflect that, which we corrected in Sprint 2.
- **Security scanning surfaced debt we could not fix quickly.** `npm audit` surfaced high-severity findings in Prisma and Next.js dependencies that required major-version upgrades (#32); CodeQL scanning was also added in #31, and Dependabot opened eleven pull requests at once.
- **The build contract needed early confirmation.** The API and shared package initially did not produce the runtime JavaScript and declaration files needed by deployment, so local and CI build output had to be checked explicitly.

## What we'll do differently

- **Order work by dependencies.** Build foundations first (authentication, pricing, predictions), then the features that depend on them.
- **Rebalance by story points, not issue count**, taking already-completed work into account.
- **Verify a real deployment as soon as the pipeline exists**, rather than assuming a green CI run means production works.
- **Reduce dependency noise:** group minor and patch Dependabot updates and ignore major versions until we schedule them deliberately (#45).
- **Track deferred security work explicitly** in an issue and in the README instead of letting it block the pipeline.
