import { useCallback, useEffect, useState } from 'react'
import { getRecipe, saveRecipe, type SessionRecipe } from '../lib/recipes'

/** A project's session recipe; changes are saved right away. */
export function useRecipe(projectId: number | null): {
  recipe: SessionRecipe | null
  update: (patch: Partial<SessionRecipe>) => void
} {
  const [recipe, setRecipe] = useState<{ id: number; recipe: SessionRecipe } | null>(null)

  useEffect(() => {
    if (projectId === null) return
    let cancelled = false
    getRecipe(projectId).then((r) => !cancelled && setRecipe({ id: projectId, recipe: r }))
    return () => {
      cancelled = true
    }
  }, [projectId])

  const current = recipe && recipe.id === projectId ? recipe.recipe : null

  const update = useCallback(
    (patch: Partial<SessionRecipe>) => {
      if (projectId === null || !current) return
      const optimistic = { ...current, ...patch }
      setRecipe({ id: projectId, recipe: optimistic })
      saveRecipe(projectId, optimistic).then(
        (saved) => saved && setRecipe({ id: projectId, recipe: saved })
      )
    },
    [projectId, current]
  )

  return { recipe: current, update }
}
