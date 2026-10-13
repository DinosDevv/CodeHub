import { BrowserWindow } from 'electron'

export type ChangeChannel =
  'sessions:changed' | 'tasks:changed' | 'terminals:changed' | 'claude:changed'

/** Sends a message with arguments to every open window. */
export function sendToWindows(channel: string, ...args: unknown[]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, ...args)
  }
}

/** Tells every open window that some data changed, so it can reload. */
export function broadcast(channel: ChangeChannel): void {
  sendToWindows(channel)
}
