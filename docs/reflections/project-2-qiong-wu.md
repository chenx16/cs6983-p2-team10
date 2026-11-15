# Individual Reflection — Qiong Wu

My biggest lesson from Project 2 is that a complete feature must work across
the browser, API, database, deployment, and documentation. Organizer,
resolution, payout, live-update, leaderboard, and administrator features all
had to agree on permissions, deadlines, privacy, and accounting rules.
Reviewing the PRD and `AGENTS.md` helped me treat those rules as shared
requirements rather than isolated issue details.

I worked on the product requirements, design references, project scaffold,
organizer and administrator workflows, Arena integration, A/B resolution and
payouts, prediction history, live updates, leaderboard, API documentation,
and category management. Resolution and accounting taught me the most:
original prediction charges must remain immutable, while payouts and refunds
must be separate append-only ledger entries. Transactions, authorization
checks, evidence requirements, and regression tests made these rules
enforceable. I also learned to test edge cases such as early resolution,
payout ledger collisions, cancelled questions, and public responses that
could expose private prediction data.

Feature sequencing was equally important. Organizer and resolution work
depended on authentication and prediction foundations, while the Arena
depended on published questions and stable public contracts. Narrowing Sprint
2 to a complete A/B workflow was the right decision because it let us finish
registration, browsing, prediction, live prices, resolution, payouts, and the
leaderboard instead of delivering several incomplete features. Consolidating
the meeting notes into planning, descoping, retrospective, and standup
documents also showed me that project history is part of the deliverable.

Working with Xinlai was positive and productive. We divided work by area,
reviewed each other's pull requests, and rebalanced tasks when dependencies
changed. I also learned that documentation and branch structure matter: an
API documentation pull request targeted a feature branch instead of `main`,
which we corrected before finalizing the documentation. Pull requests also
cannot be treated as finished until every check passes. If a failing check is
left unresolved before merge, it can remain visible as a permanent failure in
the project history, so fixing all checks before merging is essential. When I
reviewed documentation and rate-limit PRs, I compared their claims with the
routes, tests, workflows, and current release scope instead of reviewing only
the prose.

The AI IDE improved my productivity for route wiring, tests, OpenAPI updates,
and documentation, but it required active oversight. I learned to verify
generated changes against the PRD, accounting invariants, privacy rules, and
tests, while keeping human approval for Git and database commands. I also
learned to respect safety checks rather than bypass them: when the integration
tests initially rejected the development database, the correct solution was
to configure the dedicated local test database and rerun the suite, not weaken
the reset guard.

Next time I would establish the complete end-to-end journey and production
verification earlier, organize issues around dependencies, and reserve time
for deployment, documentation, and PR review before the deadline. A green test
suite is valuable evidence, but it does not replace checking that the deployed
system, its data, and its documented behavior work together.
