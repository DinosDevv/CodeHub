# codehub

A cozy, personal coding command center. Open it at the start of every coding session: it knows your projects, tracks your time and tasks, and ties together VS Code, git and Claude Code.

Built with Electron, React, TypeScript, Tailwind and SQLite (local only).

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build:win
```

## Layout

- `src/main`: Electron main process (database, git, scanning, launchers, IPC)
- `src/preload`: the typed `window.api` bridge
- `src/shared`: types shared by main and renderer
- `src/renderer`: React UI. Logic lives in `lib/` and `hooks/`, components only render. Colors and motion are set by the tokens in `assets/main.css`.
