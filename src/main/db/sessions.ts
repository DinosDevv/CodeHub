import { getDb } from '.'
import type { ActiveSession, PauseReason, SessionRecord, SessionStats } from '../../shared/api'
import { activeElapsedMs } from '../../shared/sessions'

interface SessionRow {
  id: number
  project_id: number
  project_name: string
  started_at: number
  ended_at: number | null
  paused_ms: number
  note: string | null
  summary: string | null
}

interface PauseRow {
  id: number
  started_at: number
  reason: PauseReason
}

const SELECT_SESSION = `
  SELECT s.*, p.name AS project_name
  FROM sessions s JOIN projects p ON p.id = s.project_id`

function openPause(sessionId: number): PauseRow | undefined {
  return getDb()
    .prepare(
      'SELECT id, started_at, reason FROM session_pauses WHERE session_id = ? AND ended_at IS NULL'
    )
    .get(sessionId) as PauseRow | undefined
}

export function getActiveSession(): ActiveSession | null {
  const row = getDb()
    .prepare(`${SELECT_SESSION} WHERE s.ended_at IS NULL ORDER BY s.started_at DESC LIMIT 1`)
    .get() as SessionRow | undefined
  if (!row) return null
  const pause = openPause(row.id)
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    startedAt: row.started_at,
    pausedMs: row.paused_ms,
    pausedAt: pause?.started_at ?? null,
    pauseReason: pause?.reason ?? null
  }
}

export function insertSession(projectId: number, at: number): void {
  getDb().prepare('INSERT INTO sessions (project_id, started_at) VALUES (?, ?)').run(projectId, at)
}

export function insertPause(sessionId: number, at: number, reason: PauseReason): void {
  getDb()
    .prepare('INSERT INTO session_pauses (session_id, started_at, reason) VALUES (?, ?, ?)')
    .run(sessionId, at, reason)
}

/** Ends the running pause (if any) and adds its length to the session's paused time. */
export function closePause(sessionId: number, at: number): void {
  const db = getDb()
  const pause = openPause(sessionId)
  if (!pause) return
  const end = Math.max(at, pause.started_at)
  db.transaction(() => {
    db.prepare('UPDATE session_pauses SET ended_at = ? WHERE id = ?').run(end, pause.id)
    db.prepare('UPDATE sessions SET paused_ms = paused_ms + ? WHERE id = ?').run(
      end - pause.started_at,
      sessionId
    )
  })()
}

export function finishSession(id: number, at: number, note: string | null, summary: unknown): void {
  getDb()
    .prepare('UPDATE sessions SET ended_at = ?, note = ?, summary = ? WHERE id = ?')
    .run(at, note, JSON.stringify(summary), id)
}

function toRecord(row: SessionRow): SessionRecord {
  const endedAt = row.ended_at ?? Date.now()
  const summary = row.summary ? (JSON.parse(row.summary) as { commits?: unknown[] }) : null
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    startedAt: row.started_at,
    endedAt,
    durationMs: Math.max(0, endedAt - row.started_at - row.paused_ms),
    note: row.note,
    commitCount: summary?.commits?.length ?? 0
  }
}

export function listSessions(projectId: number | null, limit: number): SessionRecord[] {
  const rows = getDb()
    .prepare(
      `${SELECT_SESSION}
       WHERE s.ended_at IS NOT NULL AND (@projectId IS NULL OR s.project_id = @projectId)
       ORDER BY s.started_at DESC LIMIT @limit`
    )
    .all({ projectId, limit }) as SessionRow[]
  return rows.map(toRecord)
}

function dayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Monday 00:00 of the week containing `ms`. */
function startOfWeek(ms: number): number {
  const d = new Date(startOfDay(ms))
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

const MIN_STREAK_MS = 60_000
const STREAK_LOOKBACK_DAYS = 400

/** Totals count each session on the day it started. */
export function getStats(now: number): SessionStats {
  const today = startOfDay(now)
  const week = startOfWeek(now)
  const since = today - STREAK_LOOKBACK_DAYS * 86_400_000

  const rows = getDb()
    .prepare(`${SELECT_SESSION} WHERE s.ended_at IS NOT NULL AND s.started_at >= ?`)
    .all(since) as SessionRow[]
  const records = rows.map(toRecord)

  const active = getActiveSession()
  if (active) {
    records.push({
      id: active.id,
      projectId: active.projectId,
      projectName: active.projectName,
      startedAt: active.startedAt,
      endedAt: now,
      durationMs: activeElapsedMs(active, now),
      note: null,
      commitCount: 0
    })
  }

  let todayMs = 0
  let weekMs = 0
  const perDay = new Map<string, number>()
  const perProject = new Map<number, { projectId: number; projectName: string; ms: number }>()

  for (const r of records) {
    perDay.set(dayKey(r.startedAt), (perDay.get(dayKey(r.startedAt)) ?? 0) + r.durationMs)
    if (r.startedAt >= today) todayMs += r.durationMs
    if (r.startedAt >= week) {
      weekMs += r.durationMs
      const p = perProject.get(r.projectId) ?? {
        projectId: r.projectId,
        projectName: r.projectName,
        ms: 0
      }
      p.ms += r.durationMs
      perProject.set(r.projectId, p)
    }
  }

  // Count back day by day; today may still be empty without breaking the streak.
  let streakDays = 0
  const cursor = new Date(today)
  if ((perDay.get(dayKey(cursor.getTime())) ?? 0) < MIN_STREAK_MS)
    cursor.setDate(cursor.getDate() - 1)
  while ((perDay.get(dayKey(cursor.getTime())) ?? 0) >= MIN_STREAK_MS) {
    streakDays++
    cursor.setDate(cursor.getDate() - 1)
  }

  return {
    todayMs,
    weekMs,
    streakDays,
    byProject: [...perProject.values()].sort((a, b) => b.ms - a.ms),
    recent: listSessions(null, 6)
  }
}
