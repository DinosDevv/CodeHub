import { getDb } from '.'
import type { ClaudeSessionSummary } from '../../shared/api'

interface EventRow {
  type: string
  payload: string
  at: number
}

/** A project's recent Claude Code conversations, rebuilt from the hook event log. */
export function claudeHistory(projectId: number, limit: number): ClaudeSessionSummary[] {
  const rows = getDb()
    .prepare(
      'SELECT type, payload, at FROM claude_events WHERE project_id = ? ORDER BY at DESC, id DESC LIMIT 2000'
    )
    .all(projectId) as EventRow[]

  const sessions = new Map<string, ClaudeSessionSummary>()
  // Oldest first, so prompts come out in the order you sent them.
  for (const row of rows.reverse()) {
    let payload: { sessionId?: string; resumeId?: string | null; detail?: string | null }
    try {
      payload = JSON.parse(row.payload)
    } catch {
      continue
    }
    if (!payload.sessionId) continue
    let s = sessions.get(payload.sessionId)
    if (!s) {
      s = {
        sessionId: payload.sessionId,
        resumeId: null,
        startedAt: row.at,
        lastAt: row.at,
        ended: false,
        prompts: [],
        waits: 0
      }
      sessions.set(payload.sessionId, s)
    }
    s.lastAt = row.at
    if (payload.resumeId) s.resumeId = payload.resumeId
    if (row.type === 'UserPromptSubmit' && payload.detail) s.prompts.push(payload.detail)
    if (row.type === 'Notification') s.waits++
    if (row.type === 'SessionEnd') s.ended = true
  }

  return [...sessions.values()]
    .filter((s) => s.prompts.length > 0)
    .sort((a, b) => b.lastAt - a.lastAt)
    .slice(0, limit)
}
