import { BrowserWindow } from 'electron'

export type ChangeChannel = 'sessions:changed' | 'tasks:changed'

/** Tells every open window that some data changed, so it can reload. */
export function broadcast(channel: ChangeChannel): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel)
  }
}
