import { expect, test } from "@playwright/test";

test("a new user can place an A/B prediction", async ({ page }) => {
  const username = `e2e${Date.now()}`;
  const questionTitle = "Will the E2E home team win?";

  await page.goto("/");
  await page.getByRole("button", { name: "Register" }).click();
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Email address").fill(`${username}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill("E2ePassword123");
  await page.getByRole("button", { name: "Create account" }).click();

  const question = page.getByRole("link", { name: questionTitle });
  await expect(question).toBeVisible();
  await expect(page.getByText("1,000 credits", { exact: true })).toBeVisible();
  await question.click();
  await expect(page).toHaveURL(/\/questions\/e2e-question$/);
  await expect(page.getByRole("heading", { name: questionTitle })).toBeVisible();

  await page.getByRole("radio", { name: "Yes" }).check();
  await page.getByLabel("Credits to spend").fill("50");
  const preview = page.getByRole("region", { name: "Preview" });
  await expect(preview).toBeVisible();
  const chargeText = await preview.getByText(/^Charge:/).innerText();
  const charge = Number(chargeText.match(/^Charge: ([\d,]+) credits$/)?.[1]?.replaceAll(",", ""));
  expect(charge).toBeGreaterThan(0);
  expect(charge).toBeLessThanOrEqual(50);
  await page.getByRole("button", { name: "Confirm prediction" }).click();
  await expect(page.getByText("Prediction placed. Your prediction cannot be changed or withdrawn.")).toBeVisible();
  await expect(page.getByText(`Balance: ${(1000 - charge).toLocaleString("en-US")} credits`)).toBeVisible();

  await page.getByRole("link", { name: "Back to Arena" }).click();
  await page.getByRole("button", { name: "My predictions" }).click();
  const entry = page.getByLabel("Prediction history").locator("article").filter({ hasText: questionTitle });
  await expect(entry).toHaveCount(1);
  await expect(entry).toContainText("Selected Yes");
  await expect(entry).toContainText(`${charge.toLocaleString("en-US")} credits`);
  await expect(entry).toContainText("Pending");
});

test("an organizer can create an A/B question draft", async ({ page }) => {
  await page.goto("/?view=sign-in");
  await page.getByLabel("Username or email").fill("E2EOrganizer");
  await page.getByLabel("Password", { exact: true }).fill("E2ePassword123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("button", { name: "Organizer" })).toBeVisible();
  await page.getByRole("button", { name: "Organizer" }).click();
  await expect(page.getByRole("heading", { name: "Create fair A/B questions." })).toBeVisible();
  await page.getByRole("button", { name: "New draft" }).click();

  const title = `E2E created question ${Date.now()}`;
  const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
  const eventTime = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16);
  await page.getByLabel("Question title").fill(title);
  await page.getByRole("combobox", { name: /^Category\b/ }).selectOption({ label: "E2E Sports" });
  await page.getByLabel("Answer A").fill("Yes");
  await page.getByLabel("Answer B").fill("No");
  await page.getByLabel("Deadline (Pacific Time)").fill(deadline);
  await page.getByLabel("Event time (Pacific Time)").fill(eventTime);
  await page.getByLabel("Outcome criteria").fill("The E2E fixture determines the result.");
  await page.getByLabel("Trusted source").fill("E2E test source");
  await page.getByRole("button", { name: "Save draft" }).click();

  await expect(page.getByRole("status")).toContainText("Draft saved.");
  await page.getByRole("tab", { name: "My Questions" }).click();
  const draft = page.locator("article").filter({ hasText: title });
  await expect(draft).toBeVisible();
  await draft.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("status")).toContainText("Question published.");
  await expect(draft).toContainText("OPEN");

  await page.getByRole("button", { name: "Arena" }).click();
  await expect(page.getByRole("link", { name: title })).toBeVisible();
});

test("an organizer can resolve a question and the result appears on the leaderboard", async ({ page }) => {
  await page.goto("/?view=sign-in");
  await page.getByLabel("Username or email").fill("E2EOrganizer");
  await page.getByLabel("Password", { exact: true }).fill("E2ePassword123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("button", { name: "Organizer" })).toBeVisible();
  await page.getByRole("button", { name: "Organizer" }).click();
  await expect(page.getByRole("heading", { name: "Create fair A/B questions." })).toBeVisible();
  await page.getByRole("tab", { name: /Resolve/ }).click();
  const target = page.locator("article").filter({ hasText: "E2E resolution question 5" });
  await expect(target).toBeVisible();
  await target.getByRole("button", { name: "Choose result" }).click();
  await expect(page.getByRole("heading", { name: "E2E resolution question 5" })).toBeVisible();
  await page.getByLabel("Evidence note").fill("Verified by the E2E fixture source.");
  await page.getByRole("button", { name: "Resolve and pay out" }).click();
  await expect(page.getByRole("status")).toContainText("Question resolved and payouts issued.");

  await page.getByRole("button", { name: "Leaderboard" }).click();
  await expect(page.getByRole("heading", { name: "Forecast well. Learn publicly." })).toBeVisible();
  const participant = page.getByRole("row").filter({ hasText: "E2EParticipant" });
  await expect(participant).toContainText("5");
  await expect(participant).toContainText("100%");
});
