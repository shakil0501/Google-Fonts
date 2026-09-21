import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', async route => {
    const specification = new URL(route.request().url()).searchParams.get('family');
    const [family, axes] = specification.split(':');
    const [italic, weight] = axes.split('@')[1].split(',');
    await route.fulfill({ contentType: 'text/css', body: `@font-face { font-family: ${JSON.stringify(family)}; src: local("Arial"); font-style: ${italic === '1' ? 'italic' : 'normal'}; font-weight: ${weight}; }` });
  });
  await page.goto('/');
  await expect(page.locator('.font-card')).toHaveCount(12);
});
test('search, script filter and empty state', async ({ page }) => {
  await page.getByRole('button', { name: 'অ বাংলা' }).click();
  await expect(page.locator('#subset')).toHaveValue('bengali');
  await expect(page.locator('.font-preview').first()).toContainText('আমার সোনার বাংলা');
  await page.locator('#search').fill('Hind Siliguri');
  await expect(page.locator('.font-card')).toHaveCount(1);
  await page.locator('#search').fill('not-a-real-font-xyz');
  await expect(page.locator('#empty')).toBeVisible();
  await page.getByRole('button', { name: 'Show all fonts' }).click();
  await expect(page.locator('.font-card')).toHaveCount(12);
});
test('favorites survive reload and can be removed', async ({ page }) => {
  await page.locator('#search').fill('ABeeZee');
  await page.getByRole('button', { name: 'Save ABeeZee', exact: true }).click();
  await page.reload();
  await page.locator('#saved-fonts').click();
  await expect(page.locator('.font-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Unsave ABeeZee', exact: true }).click();
  await expect(page.locator('#empty')).toBeVisible();
});
test('sample text, size, weight, CSS dialog and keyboard close', async ({ page }) => {
  await page.locator('#search').fill('ABeeZee');
  await page.locator('#preview').fill('Design with confidence');
  await expect(page.locator('.font-preview')).toHaveText('Design with confidence');
  await page.locator('#size').fill('64');
  await expect(page.locator('.font-preview')).toHaveCSS('font-size', '64px');
  await page.locator('#weight').selectOption('700');
  await page.locator('#italic').click();
  await page.getByRole('button', { name: 'Get CSS for ABeeZee' }).click();
  await expect(page.locator('#code')).toHaveValue(/font-style: italic/);
  await expect(page.locator('#code')).toHaveValue(/font-weight: 400/);
  await page.getByRole('button', { name: 'Copy CSS', exact: true }).click();
  await expect(page.locator('#toast')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#code-dialog')).not.toBeVisible();
});
test('pagination, theme persistence, layout and screenshots', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'Next →' }).click();
  await expect(page.locator('#page-label')).toContainText('Page 2');
  await page.getByRole('button', { name: '← Previous' }).click();
  await page.locator('#theme').click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-dark.png`, fullPage: true });
  await page.locator('#theme').click();
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-light.png`, fullPage: true });
});
test('catalog network failure offers recovery', async ({ page }) => {
  await page.route('**/catalog.json', route => route.abort());
  await page.reload();
  await expect(page.locator('#load-error')).toBeVisible();
  await page.unroute('**/catalog.json');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.font-card')).toHaveCount(12);
  await expect(page.locator('#load-error')).not.toBeVisible();
});
