import { test, expect } from "@playwright/test";
test("farmer first run, daily record, sample, survival, market and scenario", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 393, height: 851 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "New to AquaIntel? Create an account" })
    .click();
  await page
    .getByLabel("Email", { exact: true })
    .fill("pilot-" + Date.now() + "@example.test");
  await page
    .getByLabel("Password", { exact: false })
    .fill("Safe-pilot-password-123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByRole("button", { name: "Create my farm" }).click();
  await page.getByLabel("Farm name").fill("Synthetic E2E Farm");
  await page.getByLabel("Total farm area").fill("4");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await page.getByRole("button", { name: "Add pond", exact: true }).click();
  await page.getByLabel("Pond name").fill("Pond A");
  await page.getByLabel("Pond area").fill("4");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await page
    .getByRole("button", { name: "Add current crop", exact: true })
    .click();
  await page.getByLabel("Original stocking date").fill("2026-01-01");
  await page.getByLabel("Number stocked").fill("300000");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your crop, at a glance." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Log today’s feed", exact: true })
    .first()
    .click();
  await page.getByLabel("Feed total").fill("100");
  await page
    .getByRole("button", { name: "Save daily log", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Add a sampling" }).click();
  await page.getByLabel("Number of shrimp sampled").fill("100");
  await page.getByLabel("Total measured weight").fill("2000");
  await page
    .getByLabel("Sampling method")
    .fill("Four representative locations");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Set survival", exact: true }).click();
  await page.getByLabel("Low survival").fill("70");
  await page.getByLabel("Base survival").fill("75");
  await page.getByLabel("High survival").fill("80");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Market", exact: true })
    .click();
  await page.getByRole("button", { name: "Add price", exact: true }).click();
  await page.getByLabel("Market / location").fill("Synthetic buyer");
  await page.getByLabel("Count per kg").fill("50");
  await page.getByLabel("Quoted price").fill("300");
  await page.getByLabel("Source (buyer").fill("Test only");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Price book" })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Home", exact: true })
    .click();
  await page.getByRole("button", { name: "Harvest", exact: true }).click();
  await page.getByLabel("Assumed sale price").fill("300");
  await page.getByLabel("Planned daily feed").fill("100");
  await page.getByLabel("Feed price").fill("80");
  await page.getByLabel("Other daily cost").fill("2000");
  await page.getByLabel("Optional assumed growth").fill("0.2");
  await page.getByRole("button", { name: "Compare scenarios" }).click();
  await expect(page.getByText("WAIT 7 DAYS", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Save this scenario snapshot" })
    .click();
  await expect(
    page.getByRole("button", { name: "Snapshot saved" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Record a decision", exact: true })
    .click();
  await page.getByLabel("Decision *", { exact: true }).fill("Wait seven days");
  await page.getByLabel("Why did you decide").fill("Synthetic scenario review");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Costs", exact: true }).click();
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  await page.getByLabel("Category").fill("Electricity");
  await page.getByLabel("Amount").fill("1500");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("cell", { name: "Electricity", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sampling", exact: true }).click();
  await page.getByRole("button", { name: "0 photos", exact: true }).click();
  await page
    .getByLabel("Add photos")
    .setInputFiles("apps/web/public/icon-192.png");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Upload originals" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "1 photo(s) saved." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close photos" }).click();
  await expect(
    page.getByRole("button", { name: "1 photos", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Timeline", exact: true })
    .click();
  await page.getByRole("button", { name: "Record actual outcome" }).click();
  await page.getByLabel("Actual outcome").fill("Synthetic outcome recorded");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "More", exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export crop records (CSV)" }).click();
  expect((await downloadPromise).suggestedFilename()).toContain(
    "aquaintel-cycle-",
  );

  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
for (const [name, width, height] of [
  ["small-android", 360, 800],
  ["android", 393, 851],
  ["tablet", 768, 1024],
  ["desktop", 1440, 1000],
] as const) {
  test("demo layout " + name, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page
      .getByLabel("Email", { exact: true })
      .fill("demo@aquaintel.local");
    await page
      .getByLabel("Password", { exact: false })
      .fill("Demo-shrimp-2026!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Your crop, at a glance." }),
    ).toBeVisible();
    await expect(
      page.getByText("DEMO · Synthetic records.", { exact: false }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "outputs/screenshots/" + name + ".png",
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}

test("PWA assets and safe offline page", async ({ page, context }) => {
  await page.goto("/");
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  expect((await manifest.json()).display).toBe("standalone");
  expect((await page.request.get("/icon-192.png")).ok()).toBe(true);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "You’re offline" }),
  ).toBeVisible();
  await context.setOffline(false);
});
