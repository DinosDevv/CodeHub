import { spawn } from 'child_process'
import { shell } from 'electron'

/** Opens a folder in VS Code via its `code` CLI. */
export function openInVSCode(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // On Windows `code` is a .cmd script, which Node only runs through a shell.
    // Paths can't contain double quotes on Windows, so quoting is safe here.
    const child =
      process.platform === 'win32'
        ? spawn(`code "${path}"`, { shell: true, windowsHide: true })
        : spawn('code', [path])
    child.on('error', () => reject(new Error('Could not start VS Code.')))
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error("VS Code's `code` command isn't on your PATH."))
    )
  })
}

export async function openFolder(path: string): Promise<void> {
  const error = await shell.openPath(path)
  if (error) throw new Error(error)
}
