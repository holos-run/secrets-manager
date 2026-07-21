import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_APP_NAME, getAppConfig } from './app-config'

type AppConfigWindow = Window & { __APP_CONFIG__?: { app_name?: string } }

afterEach(() => {
  delete (window as AppConfigWindow).__APP_CONFIG__
})

describe('getAppConfig', () => {
  it('returns the Holos Secrets Manager default', () => {
    expect(getAppConfig()).toEqual({ appName: DEFAULT_APP_NAME })
    expect(DEFAULT_APP_NAME).toBe('Holos Secrets Manager')
  })

  it('returns the server-provided app name', () => {
    ;(window as AppConfigWindow).__APP_CONFIG__ = { app_name: 'Acme Secrets Manager' }

    expect(getAppConfig()).toEqual({ appName: 'Acme Secrets Manager' })
  })
})
