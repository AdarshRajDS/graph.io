import { expect, test } from "@playwright/test";

test("branding shows graph.io without the old subtitle", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "graph.io" })).toBeVisible();
  await expect(page.locator("h1.wordmark")).toHaveText("graph.io");
  await expect(page.locator("header img.brand-mark")).toHaveAttribute("src", /brand\/logo\.png/);
  await expect(page.getByText("Pick a type, try an example, or type your own formula")).toHaveCount(0);
  await expect(page.getByText("Ready")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Copy URL" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download video" })).toBeVisible();
});

test("rounded canvas card fills the middle column", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const column = page.locator(".canvas-column");
  const stage = page.locator(".canvas-stage");
  await expect(stage).toBeVisible();
  const columnBox = await column.boundingBox();
  const stageBox = await stage.boundingBox();
  expect(columnBox).toBeTruthy();
  expect(stageBox).toBeTruthy();
  expect(stageBox!.width).toBeGreaterThan(columnBox!.width * 0.88);
  expect(stageBox!.height).toBeGreaterThan(columnBox!.height * 0.92);
  expect(stageBox!.x).toBeGreaterThan(columnBox!.x + 2);
  expect(stageBox!.y).toBeGreaterThan(columnBox!.y + 2);
  await expect(stage).toHaveCSS("border-radius", "18px");
});

test("expressions sit in a centered row at the bottom of the canvas", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Polar", exact: true }).first().click();
  const stage = page.locator(".canvas-stage");
  const overlay = page.locator(".canvas-equations");
  const expressions = overlay.getByLabel("Expressions");
  await expect(page.locator("header.masthead").getByLabel("Expressions")).toHaveCount(0);
  await expect(expressions).toBeVisible();
  const stageBox = await stage.boundingBox();
  const exprBox = await expressions.boundingBox();
  expect(stageBox).toBeTruthy();
  expect(exprBox).toBeTruthy();
  const stageMid = stageBox!.x + stageBox!.width / 2;
  const exprMid = exprBox!.x + exprBox!.width / 2;
  expect(Math.abs(stageMid - exprMid)).toBeLessThan(24);
  expect(exprBox!.y).toBeGreaterThan(stageBox!.y + stageBox!.height * 0.7);
  const items = overlay.locator(".equation-item");
  await expect(items).toHaveCount(2);
  const first = await items.nth(0).boundingBox();
  const second = await items.nth(1).boundingBox();
  expect(first).toBeTruthy();
  expect(second).toBeTruthy();
  expect(Math.abs(first!.y - second!.y)).toBeLessThan(14);
  expect(second!.x).toBeGreaterThan(first!.x + first!.width - 8);
});

test("workbench stacks into one column on a phone-sized viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Diagram type" });
  const canvas = page.locator(".canvas-column");
  const navBox = await nav.boundingBox();
  const canvasBox = await canvas.boundingBox();
  expect(navBox).toBeTruthy();
  expect(canvasBox).toBeTruthy();
  expect(canvasBox!.y).toBeGreaterThan(navBox!.y + navBox!.height - 2);
  expect(Math.abs(navBox!.x - canvasBox!.x)).toBeLessThan(24);
});

test("parameter fields accept a typed value instead of a slider", async ({ page }) => {
  await page.goto("/?a=1&b=2");
  const field = page.getByLabel("a value");
  await expect(field).toHaveAttribute("placeholder", "1");
  await field.fill("3");
  await expect(page).toHaveURL(/a=3/);
});

test("invalid URL parameters revert to defaults", async ({ page }) => {
  await page.goto("/?a=not-a-number&b=999");
  await expect(page.getByLabel("a value")).toHaveValue("1");
});

test("adding another type plots it on the same canvas", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Polar", exact: true }).first().click();
  await expect(page.getByLabel("Expressions")).toContainText("sin");
  await expect(page.getByLabel("Expressions")).toContainText("cos");
});

test("examples update the plot without the loading fallback", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sine", exact: true }).click();
  await expect(page.getByText("Setting the table")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "graph.io" })).toBeVisible();
  await expect(page.getByLabel("Function expression")).toHaveValue(/sin/);
});

test("custom function expressions update the URL", async ({ page }) => {
  await page.goto("/");
  const input = page.getByLabel("Function expression");
  await input.fill("cos(x)");
  await expect(page).toHaveURL(/expr=cos/);
});

test("example menu loads a polar curve", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Polar", exact: true }).first().click();
  await page.getByRole("button", { name: "Rose curve", exact: true }).click();
  await expect(page.getByLabel("Polar expression")).toHaveValue(/cos/);
});

test("surface kind shows a 3D canvas or contour fallback", async ({ page }) => {
  await page.goto("/?kind=surface");
  await expect(page.locator(".canvas-wrap canvas, .canvas-wrap svg").first()).toBeVisible();
});
