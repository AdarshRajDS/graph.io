import { expect, test } from "@playwright/test";

test("branding shows graph.io without the old subtitle", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "graph.io" })).toBeVisible();
  await expect(page.locator("h1.wordmark")).toHaveText("graph.io");
  await expect(page.locator("header img.brand-mark")).toHaveAttribute("src", /brand\/logo\.png/);
  await expect(page.getByText("Pick a type, try an example, or type your own formula")).toHaveCount(0);
  await expect(page.getByText("Ready")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Copy URL" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Create video" })).toBeVisible();
  await expect(page.getByLabel("Film preview")).toHaveCount(0);
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

test("workbench puts the canvas first on a phone-sized viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const canvas = page.locator(".canvas-column");
  const tabs = page.getByRole("tablist", { name: "Editor panels" });
  await expect(tabs).toBeVisible();
  const canvasBox = await canvas.boundingBox();
  const tabsBox = await tabs.boundingBox();
  expect(canvasBox).toBeTruthy();
  expect(tabsBox).toBeTruthy();
  expect(canvasBox!.y).toBeLessThan(tabsBox!.y);
});

test("parameter fields accept a typed value", async ({ page }) => {
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

test("share URLs keep the current pathname after edits", async ({ page }) => {
  await page.goto("/");
  const initialPath = new URL(page.url()).pathname;
  await page.getByRole("button", { name: "Polar", exact: true }).first().click();
  await page.getByRole("button", { name: "Cardioid", exact: true }).click();
  await expect(page.getByLabel("a value")).toHaveValue("1.5");
  expect(new URL(page.url()).pathname).toBe(initialPath);
  await expect(page).toHaveURL(/layers=/);
});

test("template parameters match the inspector after consecutive switches", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Parametric", exact: true }).first().click();
  await page.getByRole("button", { name: "Ellipse", exact: true }).click();
  await expect(page.getByLabel("a value")).toHaveValue("3");
  await page.getByRole("button", { name: "Parabola", exact: true }).click();
  await expect(page.getByLabel("a value")).toHaveValue("0.6");
  await page.getByRole("button", { name: "Polar", exact: true }).first().click();
  await page.getByRole("button", { name: "Cardioid", exact: true }).click();
  await expect(page.getByLabel("a value")).toHaveValue("1.5");
  await page.getByRole("button", { name: "Rose curve", exact: true }).click();
  await expect(page.getByLabel("a value")).toHaveValue("2");
  await page.getByRole("button", { name: "Implicit", exact: true }).first().click();
  await page.getByRole("button", { name: "Hyperbola", exact: true }).click();
  await expect(page.getByLabel("a value")).toHaveValue("1.5");
  await expect(page.getByLabel("b value")).toHaveValue("1.5");
  await page.getByRole("button", { name: "Geometry", exact: true }).first().click();
  await page.getByRole("button", { name: "Square", exact: true }).click();
  await expect(page.getByLabel("a value")).toHaveValue("2");
});

test("restart animation keeps stacked layers", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Polar", exact: true }).first().click();
  await page.getByRole("button", { name: "Play" }).click();
  await page.getByRole("button", { name: "Restart animation" }).click();
  await expect(page.getByLabel("Expressions")).toContainText("sin");
  await expect(page.getByLabel("Expressions")).toContainText("cos");
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
});

test("clear canvas asks before removing extra layers", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Polar", exact: true }).first().click();
  await page.getByRole("button", { name: "Clear canvas" }).click();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByLabel("Expressions")).toContainText("sin");
  await expect(page.getByLabel("Expressions")).not.toContainText("cos");
});

test("invalid parameter text is announced and blocks playback", async ({ page }) => {
  await page.goto("/?a=1&b=2");
  await page.getByLabel("a value").fill("abc");
  await expect(page.getByLabel("a value")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Enter a finite number.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Create video" })).toBeDisabled();
});

test("unsupported share schema shows a recovery notice", async ({ page }) => {
  await page.goto("/?schema=9&expr=sin(x)");
  await expect(page.getByText(/not supported/i)).toBeVisible();
});
