export type Route =
  | { page: 'dashboard' }
  | { page: 'projects' }
  | { page: 'project'; id: number }
  | { page: 'settings' }

export type Navigate = (route: Route) => void

/** Stable key per route, used to replay page entrance animations. */
export function routeKey(route: Route): string {
  return route.page === 'project' ? `project-${route.id}` : route.page
}
