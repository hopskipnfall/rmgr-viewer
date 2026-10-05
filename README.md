# rmgr-viewer

A browser-based playback viewer for `.rmgr` replay files — per-match recordings of
controller inputs and in-memory game state for _Super Smash Bros. (N64) — Smash Remix_,
produced by [RMG-K](https://github.com/hopskipnfall/RMG-K).

**[Live demo](https://hopskipnfall.github.io/rmgr-viewer/)** (loads a sample replay by
default; use the file picker to load your own `.rmgr` file — nothing is uploaded, it's
read entirely in your browser).

> **Alpha software.** Everything here — the UI, the viewer's own code, and the `.rmgr`
> format it reads — is under active early development and subject to change without
> notice. Replay files created with the current version of RMG-K are not guaranteed to
> keep working with future versions of this viewer, or vice versa.

> This is an unofficial, fan-made project and is not affiliated with, endorsed by, or
> sponsored by Nintendo. "Super Smash Bros." and other referenced trademarks are the
> property of their respective owners.

## Features

- **Match Playback**: Scrub, play/pause, step frame-by-frame, and variable speed modifier (`1x`, `0.5x`, `0.25x`).
- **Interactive Visualizers**: Directional Influence (DI) vectors and controller overlays, Pikachu Quick Attack recovery paths, and real-time controller stick input pads.
- **Situational Analysis**: Offstage Edge Guarding & Recovery, Ledge Trapping & Getups (<100% vs ≥100%), Neutral Openings & Whiff Punish classification, Kill Combos, and Angel Invincibility.
- **Multi-Replay Library**: Cross-game aggregate statistics, historical matchup baselines ($\Delta\%$), and session identity resolution.
- **Documentation**: See [Analysis Engine Specifications](docs/ANALYSIS_SPECIFICATIONS.md) for full mathematical definitions, state taxonomies, and coordinate systems.

## Local development

This depends on [`rmgr-ts`](https://github.com/hopskipnfall/rmgr-ts) via a local
`file:../rmgr-ts` reference, so it expects that repository cloned as a sibling directory
with its `dist/` already built:

```bash
git clone https://github.com/hopskipnfall/rmgr-ts.git ../rmgr-ts
(cd ../rmgr-ts && npm install && npm run build)

npm install
npm run dev
```

```bash
npm run build      # tsc -b && vite build, output in dist/
npm run typecheck  # tsc --noEmit
npm run lint
npm run format:check
```

## Desktop app

A Tauri desktop build (macOS, Windows, Linux) points at a library folder and keeps read access to it, so replays never need re-importing, and new recordings appear automatically.

**Install.** Download the installer for your OS from the [Releases](https://github.com/hopskipnfall/rmgr-viewer/releases) page (`.dmg`, `.msi`/`-setup.exe`, `.AppImage`/`.deb`). Builds are unsigned, so the first launch needs one extra step:

- **macOS (Gatekeeper):** right-click the app and choose Open, then Open again. Or run `xattr -dr com.apple.quarantine "/Applications/RMGR Viewer.app"`.
- **Windows (SmartScreen):** click More info, then Run anyway.

**Library folder.** Defaults to `~/Documents/Replays` (created on first launch). Use Change… in the sidebar to pick another folder; Rescan re-reads it. The folder is scanned on launch and watched while the app runs. Replays are read-only; renaming one outside the app keeps its notes.

**Project file.** Notes, session and matchup comments, your identity, YouTube links and hand-set perspectives are saved to `rmgr-viewer-project.json` in the library folder (written atomically, with the last 3 backups as `.bak.1` to `.bak.3`), so they survive app updates and reinstalls. The stats cache stays inside the app and is rebuilt from your replays. Each library folder has its own project file.

**Bringing over web data.** The desktop app has its own storage. In the web app use project export, then project import in the desktop app to carry over notes, comments and settings.

**Development.** Requires the Rust toolchain and [Tauri's platform prerequisites](https://tauri.app/start/prerequisites/). Run `npm run tauri:dev` (or `npm run tauri:build`).

## Deployment

Pushes to `master` build and deploy automatically to GitHub Pages (see
`.github/workflows/`). The production build serves under the `/rmgr-viewer/` path
(`vite.config.ts` sets `base` accordingly whenever `CI` is set); local dev and
`npm run preview` serve from `/`.

## License

GPL-3.0-only.
