# HW3 Reflection: Context Engineering for ForecastHub

## Contribution breakdown

The project has four major deliverable areas, and we divided the work so that
each teammate had clear ownership while still reviewing and supporting the
other person's work.

| Deliverable area | Primary contributor | Contribution |
|---|---|---|
| 1. Scrum Setup | Xinlai Chen | Set up and maintained the GitHub project board, columns, milestones, issue organization, labels, assignments, and Sprint 1 tracking. |
| 2. Rules File | Qiong Wu | Created and maintained `AGENTS.md`, including the project context, architecture, conventions, PRD and design references, branching and pull request workflow, testing guidance, and do's and don'ts. |
| 3. Before/After Test | Xinlai Chen | Designed and documented the comparison methodology, tested the same feature with and without the rules, and recorded the differences and measurable results. |
| 4. Reflection | Xinlai Chen and Qiong Wu | We worked together on the reflection. Qiong Wu wrote the sections on how the rules file bridges the PRD and implementation and what worked, what did not, and what changed, based on the setup of the initial repository and project. Xinlai Chen focused on the detailed implementation experience and results from Part 3. Xinlai Chen completed the parts of the before-and-after comparison; Qiong Wu created the other content, and Xinlai Chen modified and reviewed them. |

We both created and revised the PRD. This included discussing requirements,
correcting unclear or incomplete behavior, and keeping the product rules
consistent with the implementation plan. Qiong Wu also created the project
mockups and visual references used to communicate the intended user
experience. These shared activities supported all four deliverables rather
than belonging to only one rubric section. For Part 4, we combined Qiong
Wu's observations from setting up the initial repository and rules with
Xinlai Chen's detailed experience implementing and testing the feature from
Part 3. This allowed the reflection to connect written guidance with actual
coding results.

## How the rules file bridges the PRD and implementation

The `AGENTS.md` file turns the ForecastHub PRD from a product document into
working constraints for implementation. The PRD defines what the platform
should do, while the rules file repeatedly explains how those requirements
must affect engineering decisions. For example, the PRD says that credits are
virtual, predictions are immutable, and corrections must preserve history.
The rules file converts those ideas into implementation rules: keep accounting
on the server, use database transactions, write append-only ledger entries,
and never mutate or delete original predictions or transactions.

The rules file also creates traceability between product behavior and the
overall structure of the project. It identifies the web app, API, shared
contracts, database, tests, and documentation as separate responsibilities.
It also encourages the team to use shared UI patterns and common styling
guidelines instead of creating unrelated CSS structures for each feature.
This helps keep the interface consistent even when different team members
build different parts of it. It makes it less likely that a browser component
will accidentally become the source of truth for prices, balances,
permissions, or payouts. The rules also direct an agent to consult
`docs/PRD.md` and `DESIGN.md` before changing behavior or UI, connecting the
functional requirements with the visual reference.

Because most of this project is AI-assisted coding, `AGENTS.md` is also a
shared communication tool. We do not need to repeatedly explain every
implementation restriction or preferred behavior to one another while an
agent is working. The guidance is readable, specific, and available in the
repository, so both teammates and AI agents can use the same source of
context. This reduces misunderstandings while still leaving important
product choices visible for the team to review.

The most useful rules are the ones that protect high-risk behavior. LMSR
arithmetic, shared-pool payouts, Pacific Time deadlines, authentication,
moderation, refunds, and corrections all have explicit constraints. Requiring
focused tests before changing these areas gives the PRD measurable acceptance
criteria instead of leaving them as informal assumptions. The rules also
require public responses to exclude private data and require server-side
authorization, which helps preserve privacy even when a feature is being
implemented quickly with AI assistance.

This review also reminded us to create explicit non-functional requirements
for qualities such as reliability, security, privacy, performance, and
maintainability. As the PRD or `AGENTS.md` changes during development, an AI
agent should review previous work, requirements, tests, and decisions before
making new changes. That regression-oriented check helps preserve earlier
constraints and prevents successive AI-generated changes from introducing
recurring or compounding bugs.

## What worked, what did not, and what changed

The strongest part of the rules file was its use of concrete invariants. Rules
such as “the browser may display server results but must never be trusted to
calculate or authorize financial-like operations” provide a clear answer when
there are multiple possible implementations. The testing commands, required
issue workflow, naming conventions, and folder structure also reduce the
amount of project context that must be repeated in every task.

The Scrum guidance worked well as a planning boundary. Issues describe
user-facing stories and acceptance criteria, while the rules file reminds the
contributor to connect implementation work to an issue, branch, pull request,
and focused commit. This is especially important for an AI-assisted project:
the issue provides the scope, the PRD provides the expected behavior, and the
rules file provides the engineering guardrails. Since those guardrails are
written down in a reasonable and readable form, the team can spend less time
repeating instructions in conversation and more time reviewing the actual
implementation and test results.

One limitation is that a large rules file can become repetitive and can
contain guidance for parts of the architecture that are not implemented yet.
For example, the repository reserves API, architecture, sprint, test, and E2E
directories even when some of those artifacts are still future work. There is
also a risk that requirements in the PRD and a newly proposed issue can
conflict. The rules file addresses this by making the PRD the source of truth
and requiring discrepancies to be called out, but the process would be
stronger if each issue linked directly to the relevant PRD section.

Based on this review, the rules were refined to emphasize three practices:
server authority for all accounting and permissions, append-only records for
every adjustment, and focused validation for business-critical behavior. The
role-specific permission work also exposed a product decision that should be
recorded explicitly: whether organizers may predict on their own questions
and whether administrators may predict at all. That decision should be
resolved in the PRD before implementation rather than inferred from a UI
mockup.

After the before-and-after comparison, we added three rules to `AGENTS.md`:
API routes must use Prisma, with in-memory stores allowed only in tests and
seed scripts; every schema change must include a migration; and business-rule
tests must be committed before the implementation. We also removed a setup
step that referenced a file that does not exist. These changes are in the pull
request for issue #21.

## Before-and-after comparison

The full methodology, results table, and screenshots are in the before/after
comparison section of our submission. In short, with `AGENTS.md` active the
agent followed the PRD more closely: 5 of 20 test names cite PRD identifiers
(versus 0 of 19), it implemented the CR-6 LMSR pricing rule correctly, and it
added a privacy test for public responses. However, both runs still used
in-memory seed data instead of PostgreSQL, created no migration, and wrote
tests after the code. This showed us that a rules file improves alignment with
written requirements but does not guarantee that every rule is followed; rules
that must always hold need enforcement through CI checks or hooks.

## How Scrum on GitHub supports AI-assisted development

GitHub Issues provide a practical task boundary for an AI agent. A well-written
issue contains a user story, acceptance criteria, dependencies, and an
estimate, so the agent can implement a reviewable slice instead of attempting
to build the entire platform at once. Labels and assignees make ownership
visible, and dependencies such as resolution before leaderboard work help
sequence features correctly.

The repository rules extend this process with focused branches, conventional
commits, pull requests, reviewer requirements, and validation commands. Pull
requests are especially important because they provide a controlled way to
manage the Git source code. Each change can be reviewed as a diff before it
enters the shared codebase, and conflicts can be identified and resolved on
the feature branch instead of being discovered after changes have already
been merged. Partner reviews and CI checks help protect the `main` branch from
unfinished, conflicting, or untested work.

This workflow also improved how work was distributed. Instead of both
teammates changing the same files or choosing overlapping tasks, issues made
responsibilities visible through assignees, labels, estimates, and
dependencies. Larger features could be divided into independent backend,
frontend, testing, documentation, or infrastructure tasks. The project board
then made progress and blocked work easier to see, while pull requests gave
each teammate a clear place to review and contribute without directly
overwriting someone else's work.

The Scrum process also makes AI output accountable: a change can be compared
with its issue, PRD requirements, tests, and review comments rather than being
accepted only because the code looks plausible. In this way, GitHub is not
just a place to store code; it connects planning, source-code management,
review, conflict resolution, branch protection, and team collaboration.

## What we would change for Sprint 2

For Sprint 2, we would make the branch and environment workflow more
structured. In addition to feature branches, we would use smaller sub-branches
for focused bug fixes, such as `fix/` branches that start from the related
feature branch or current integration branch. We would also create a
dedicated test branch for tagged test builds. This would let the team test a
specific version consistently and identify which source changes were included
when a regression was found.

We would separate development, testing, and production environments more
clearly. The development environment could support rapid AI-assisted changes,
the test environment could use seeded and isolated data for automated and
workflow tests, and the production environment would contain only reviewed
and approved code with production configuration. Each environment should use
separate variables, databases, credentials, and deployment settings so that
test data cannot affect production data. Pull requests and tagged releases
would provide the promotion points between these environments.

We would also focus more strongly on testing the complete workflow instead of
testing only individual functions. A definition-of-done checklist should
include typecheck, lint, unit tests, API tests, database transaction tests,
and end-to-end tests covering the main user journey: registration, browsing
the Arena, placing a prediction, resolving a question, receiving a payout,
and viewing the leaderboard and balance history. The workflow tests should
also cover rejected actions, such as late predictions, insufficient credits,
unauthorized role actions, and correction or cancellation behavior.

Each issue should link to the exact PRD acceptance criteria it implements and
identify any intentional product decision that changes the PRD. For
accounting and permission features, the issue should require authorization,
immutability, rollback, and privacy tests before it can be closed. Finally,
we would keep `AGENTS.md` focused on high-value invariants while moving
detailed branch, release, environment, and testing procedures into the
relevant project documentation. During Sprint 2, we may also update
`AGENTS.md` when a user story or issue is biased, ambiguous, or conflicts with
the realities of implementing and testing the code. We would record the
clarification in the rules and review previous work affected by the change,
then fix any regression or incorrect behavior instead of allowing an old
interpretation to remain in the project.

Overall, this exercise showed us that context engineering is not just adding
more instructions. It is the process of selecting the product rules that
must never be lost, writing them clearly enough for both teammates and AI
agents to follow, connecting them to repository structure and Scrum
artifacts, and making them testable at the point where code is changed.
