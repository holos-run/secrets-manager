import { test, expect } from '@playwright/test'
import { loginViaProfilePage } from './helpers'

test.describe('Visual design system', () => {
  test('applies the operator page shell, semantic header, and typography tokens', async ({ page }) => {
    await loginViaProfilePage(page)

    const layout = page.getByTestId('page-layout')
    await expect(layout).toHaveAttribute('data-layout', 'operator-page')

    const header = page.getByTestId('page-header')
    await expect(header).toBeVisible()
    await expect(header.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible()

    const bodyFont = await page.locator('body').evaluate((element) => getComputedStyle(element).fontFamily)
    const monoFont = await page.locator('.font-mono').first().evaluate((element) => getComputedStyle(element).fontFamily)

    expect(bodyFont).toContain('Inter')
    expect(monoFont).toContain('Berkeley Mono')
  })
})
