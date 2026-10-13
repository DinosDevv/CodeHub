import { existsSync } from 'fs'
import { readdir, readFile } from 'fs/promises'
import { basename, join } from 'path'

const MAX_DEPTH = 4

// Folders that never contain projects worth listing, or are too big to walk.
const SKIP = new Set([
  'node_modules',
  '.git',
  '.next',
  '.expo',
  '.venv',
  'venv',
  '__pycache__',
  'dist',
  'build',
  'out',
  'target',
  'vendor',
  'AppData',
  '$RECYCLE.BIN',
  'System Volume Information'
])

/** Finds every folder under `roots` that contains a `.git`. Doesn't descend into repos. */
export async function findRepos(roots: string[]): Promise<string[]> {
  const found = new Set<string>()

  async function walk(dir: string, depth: number): Promise<void> {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return // permission denied, vanished, etc.
    }
    if (entries.some((e) => e.name === '.git')) {
      found.add(dir)
      return
    }
    if (depth >= MAX_DEPTH) return
    await Promise.all(
      entries
        .filter((e) => e.isDirectory() && !SKIP.has(e.name) && !e.name.startsWith('.'))
        .map((e) => walk(join(dir, e.name), depth + 1))
    )
  }

  await Promise.all(roots.map((r) => walk(r, 0)))
  return [...found].sort()
}

const npmStack: [dep: string, label: string][] = [
  ['next', 'Next.js'],
  ['electron', 'Electron'],
  ['expo', 'Expo'],
  ['react-native', 'React Native'],
  ['react', 'React'],
  ['vue', 'Vue'],
  ['svelte', 'Svelte'],
  ['@angular/core', 'Angular'],
  ['express', 'Express'],
  ['@supabase/supabase-js', 'Supabase'],
  ['tailwindcss', 'Tailwind'],
  ['typescript', 'TypeScript']
]

const fileStack: [file: string, label: string][] = [
  ['pubspec.yaml', 'Flutter'],
  ['Cargo.toml', 'Rust'],
  ['go.mod', 'Go'],
  ['pyproject.toml', 'Python'],
  ['requirements.txt', 'Python'],
  ['composer.json', 'PHP'],
  ['pom.xml', 'Java'],
  ['build.gradle', 'Java/Kotlin'],
  ['build.gradle.kts', 'Kotlin']
]

/** Best-effort guess at a repo's tech from its manifest files. */
export async function detectStack(dir: string): Promise<string[]> {
  const stack: string[] = []

  try {
    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    for (const [dep, label] of npmStack) {
      if (!(dep in deps)) continue
      // Frameworks already imply React.
      if (dep === 'react' && stack.some((s) => ['Next.js', 'Expo', 'React Native'].includes(s)))
        continue
      if (dep === 'react-native' && stack.includes('Expo')) continue
      stack.push(label)
    }
    if (stack.length === 0) stack.push('Node')
  } catch {
    // no or invalid package.json
  }

  for (const [file, label] of fileStack) {
    if (existsSync(join(dir, file)) && !stack.includes(label)) stack.push(label)
  }

  try {
    const entries = await readdir(dir)
    if (entries.some((f) => f.endsWith('.csproj') || f.endsWith('.sln'))) stack.push('.NET')
    // Plain static sites have no manifest at all.
    if (stack.length === 0 && entries.some((f) => f.endsWith('.html'))) stack.push('HTML/CSS')
  } catch {
    // ignore
  }

  return stack
}

export function projectName(dir: string): string {
  return basename(dir)
}
