import type { Commit, Project, RepoStatus, ScanResult } from '../../../shared/api'
import { errorMessage } from './errors'
import { toast } from './toast'

export type { Commit, Project, RepoStatus, ScanResult }

export const listProjects = (): Promise<Project[]> => window.api.projects.list()
export const getProject = (id: number): Promise<Project | null> => window.api.projects.get(id)
export const scanProjects = (): Promise<ScanResult> => window.api.projects.scan()
export const setProjectArchived = (id: number, archived: boolean): Promise<void> =>
  window.api.projects.setArchived(id, archived)

export const getRepoStatus = (path: string): Promise<RepoStatus> => window.api.git.status(path)
export const getCommits = (path: string, limit: number): Promise<Commit[]> =>
  window.api.git.log(path, limit)

export const getRoots = (): Promise<string[]> => window.api.settings.getRoots()
export const addRoot = (): Promise<string[]> => window.api.settings.addRoot()
export const removeRoot = (root: string): Promise<string[]> => window.api.settings.removeRoot(root)

export async function openInVSCode(project: Project): Promise<void> {
  try {
    await window.api.launch.vscode(project.path)
    toast(`opening ${project.name} in vs code…`)
  } catch (e) {
    toast(errorMessage(e), 'error')
  }
}

export async function openFolder(project: Project): Promise<void> {
  try {
    await window.api.launch.folder(project.path)
  } catch (e) {
    toast(errorMessage(e), 'error')
  }
}

export function filterProjects(projects: Project[], query: string, showHidden: boolean): Project[] {
  const q = query.trim().toLowerCase()
  return projects.filter(
    (p) =>
      (showHidden || !p.archived) &&
      (!q || p.name.toLowerCase().includes(q) || p.stack.some((s) => s.toLowerCase().includes(q)))
  )
}

/** "C:\Users\User\Desktop\shop" → "~\Desktop\shop" */
export function prettyPath(path: string): string {
  return path.replace(/^[A-Z]:\\Users\\[^\\]+/i, '~')
}
