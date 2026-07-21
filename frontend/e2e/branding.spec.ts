import { test, expect } from '@playwright/test'
import { loginViaProfilePage } from './helpers'

test('shows Holos Secrets Manager branding in the sidebar', async ({ page }) => {
  await loginViaProfilePage(page)

  await expect(page.getByText('Holos Secrets Manager', { exact: true }).first()).toBeVisible()
})
