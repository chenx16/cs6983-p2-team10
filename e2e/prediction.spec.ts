import { expect, test } from "@playwright/test";

test("a new user can register and make a prediction", async ({ page }) => {
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
