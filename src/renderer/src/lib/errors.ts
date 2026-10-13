/** Turns IPC rejections ("Error invoking remote method 'x': Error: msg") into just "msg". */
export function errorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  return raw.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
}
