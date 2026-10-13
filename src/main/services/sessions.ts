import { getProject } from '../db/projects'
import { activeElapsedMs } from '../../shared/sessions'
import {
  closePause,
  finishSession,
  getActiveSession,
  insertPause,
  insertSession
} from '../db/sessions'
import { broadcast } from '../events'
import { tasksDoneInSession } from '../db/tasks'
import { getCommitsSince } from './git'
import type { ActiveSession, PauseReason, SessionSummary } from '../../shared/api'

// The main process owns the session clock, so it keeps running correctly
// across renderer reloads and can be paused by idle detection.

function notifyChanged(): void {
  broadcast('sessions:changed')
}

export function startSession(projectId: number): ActiveSession {
  if (getActiveSession()) throw new Error('Finish your current session first.')
  if (!getProject(projectId)) throw new Error('Unknown project.')
  insertSession(projectId, Date.now())
  notifyChanged()
  return getActiveSession()!
}

/** No-op when there's no session or it's already paused. `at` lets idle pauses be backdated. */
export function pauseSession(reason: PauseReason, at = Date.now()): void {
  const active = getActiveSession()
  if (!active || active.pausedAt) return
  insertPause(active.id, Math.max(at, active.startedAt), reason)
  notifyChanged()
}

/** Resumes a paused session. With `onlyIf`, only resumes pauses with that reason. */
export function resumeSession(onlyIf?: PauseReason): void {
  const active = getActiveSession()
  if (!active?.pausedAt) return
  if (onlyIf && active.pauseReason !== onlyIf) return
  closePause(active.id, Date.now())
  notifyChanged()
}

export async function stopSession(note: string | null): Promise<SessionSummary> {
  const active = getActiveSession()
  if (!active) throw new Error('No session is running.')

  const now = Date.now()
  closePause(active.id, now)
  const ended = getActiveSession()!
  const durationMs = activeElapsedMs(ended, now)

  const project = getProject(active.projectId)
  const commits = project?.exists ? await getCommitsSince(project.path, active.startedAt) : []
  const cleanNote = note?.trim() || null
  const tasksDone = tasksDoneInSession(active.id)

  finishSession(active.id, now, cleanNote, { commits, tasksDone })
  notifyChanged()

  return {
    id: active.id,
    projectName: active.projectName,
    durationMs,
    note: cleanNote,
    commits,
    tasksDone
  }
}
