import type { AppInfo } from '../../../shared/api'

export type { AppInfo }

export function getAppInfo(): Promise<AppInfo> {
  return window.api.app.getInfo()
}
