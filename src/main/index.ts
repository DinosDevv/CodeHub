import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { closeDb, getDb } from './db'
import { registerIpc } from './ipc'
import { pauseForQuit, startIdleWatch } from './services/idle'
import { startFocusWatch } from './services/focus'
import { closeAllTerminals } from './services/terminals'
import { refreshHookScript } from './services/claudeHooks'
import { startHookServer, stopHookServer } from './services/hookServer'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#08121c',
    title: 'Lowtide',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Links (e.g. clicked in a terminal) open in the real browser — web links only.
  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (/^https?:\/\//i.test(details.url)) shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// A separate data folder (e.g. for testing without touching your real data).
if (process.env['LOWTIDE_DATA_DIR']) app.setPath('userData', process.env['LOWTIDE_DATA_DIR'])

// One Lowtide per data folder: two copies would both run the session clock.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.lowtide.app')

    // F12 toggles DevTools in dev; Ctrl+R is ignored in production.
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    getDb()
    registerIpc()
    startIdleWatch()
    startFocusWatch()
    startHookServer()
    refreshHookScript()
    createWindow()

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('will-quit', () => {
    closeAllTerminals()
    stopHookServer()
    pauseForQuit()
    closeDb()
  })
}
