import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'
import { loginViaProfilePage } from './helpers'

test('shows Holos Secrets Manager branding in the sidebar', async ({ page }) => {
  await loginViaProfilePage(page)

  await expect(page.getByText('Holos Secrets Manager', { exact: true }).first()).toBeVisible()
})

test('serves the app name configured through the CLI', async ({ request }, testInfo) => {
  const appName = 'Acme Secrets Manager'
  const basePort = Number(process.env.HOLOS_BACKEND_PORT || '8443')
  const port = basePort + 1000 + testInfo.workerIndex
  const baseURL = `http://localhost:${port}`
  const binary = fileURLToPath(new URL('../../bin/secrets-manager', import.meta.url))
  const server = spawn(binary, [
    '--plain-http',
    '--listen',
    `:${port}`,
    '--app-name',
    appName,
  ])
  let stderr = ''
  server.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString()
  })

  try {
    await expect
      .poll(
        async () => {
          if (server.exitCode !== null) {
            throw new Error(`custom-branding server exited early: ${stderr}`)
          }
          try {
            return (await request.get(baseURL)).status()
          } catch {
            return 0
          }
        },
        { timeout: 15_000 },
      )
      .toBe(200)

    const response = await request.get(baseURL)
    const html = await response.text()

    expect(html).toContain(`<title>${appName}</title>`)
    expect(html).toContain(`window.__APP_CONFIG__={"app_name":"${appName}"}`)
  } finally {
    server.kill('SIGTERM')
    if (server.exitCode === null) {
      await once(server, 'exit')
    }
  }
})
