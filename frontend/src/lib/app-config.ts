export const DEFAULT_APP_NAME = 'Holos Secrets Manager'

interface InjectedAppConfig {
  app_name?: string
}

declare global {
  interface Window {
    __APP_CONFIG__?: InjectedAppConfig
  }
}

export interface AppConfig {
  appName: string
}

export function getAppConfig(): AppConfig {
  return {
    appName: window.__APP_CONFIG__?.app_name || DEFAULT_APP_NAME,
  }
}
