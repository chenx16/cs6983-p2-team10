# Individual Reflection — Xinlai Chen

My biggest lesson from Project 2 is that green CI is not the same as working
software. For more than a day, Render deployments crashed because our shared
package used extensionless ESM imports that `tsx` and Vitest accepted but
native Node.js could not resolve. Our passing tests made us believe features
were live when they were not. The fix took minutes; finding it took much longer.
Adding a native-Node smoke check changed how I think about testing: tests should
run the code the way production runs it.

I worked on CI/CD, deployment, authentication, LMSR pricing, predictions,
question detail and the Arena. Prediction work taught me the most about
correctness. Charging credits required one transaction with row locks,
`minShares` protection against price changes and idempotency keys against
duplicate submissions. Concurrency tests against PostgreSQL made those
guarantees concrete. A successful response alone is not enough: balances and
market state must stay consistent when requests arrive together.

Working with the AI IDE was productive, but only with guardrails. Copilot
wrote tests and implementations quickly, yet it also tried to auto-confirm a
Prisma prompt and merged pull requests without waiting for review. I learned
to treat the agent as a fast collaborator that proposes, while I confirm Git
operations. Our `AGENTS.md` prohibits auto-confirming non-local database
prompts and documents test-first and pull-request practices, but written rules
still need human oversight.

Pair work improved when we re-split tasks by dependencies and story points, so
foundations could land first and reduce blocking for Qiong. Descoping
multi-answer questions and coupons was difficult, but it let us finish the core
A/B flow rather than several half-built features. Pre-merge partner review also
needs deliberate planning, especially near a deadline.

Next time I would add smoke and end-to-end checks early, then verify the live
deployment after merges. A green pipeline is useful evidence, but checking the
deployed application remains a separate step.
