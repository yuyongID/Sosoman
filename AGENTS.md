# Repository Guidelines

## Project Structure & Module Organization
The app is split across `src`: `main` bootstraps Electron (app lifecycle, window creation, IPC wiring) via `src/main/app.ts`; `renderer` hosts the React UI (`main.tsx`, `features`, `components`, `layouts`, `store`); `api` wraps HTTP/IPC clients; `shared` carries types/constants reused on both sides; `utils` contains pure helpers. Development tooling lives in `scripts` (see `scripts/dev.ts`), packaged assets in `resources`, and exploratory specs belong in `tests`, mirroring the `src` tree once real suites land.

## Build, Test, and Development Commands
- `npm run dev` starts the Vite renderer and Electron main process together via the TypeScript bootstrapper.
- `npm run typecheck` runs `tsc --noEmit` with the strict config in `tsconfig.json`.
- `npm run lint` is stubbed; wire ESLint + Prettier soon and keep the command green before pushing.
- `npm run build` and `npm test` are placeholders; document any interim scripts you add (e.g., `npx vite build`, `npx vitest`) inside package.json comments or README.

## Coding Style & Naming Conventions
Use TypeScript everywhere with the strict options already enabled. Prefer functional React components in `.tsx`, PascalCase component files, camelCase utilities, and `use*` prefixes for hooks. Follow the project’s prevailing 2-space indentation and keep semicolons (see `scripts/dev.ts`). Import shared modules through the path aliases defined in `tsconfig.json` (`@main/*`, `@renderer/*`, etc.) to avoid brittle relative paths. Co-locate feature-specific styles/assets under the matching `features/<name>` folder to keep modules autonomous.

## Testing Guidelines
Add Vitest unit tests under `tests/unit/<feature>.spec.ts` (mirroring the module path) and Playwright specs under `tests/e2e`. Group renderer component tests by feature and exercise both success and failure states. When touching IPC or scheduler code, include contract tests that validate channel names and payload shapes in `tests/main`. Keep snapshots deterministic and document any required environment flags alongside the test command.

## Commit & Pull Request Guidelines
The current history favors concise, capitalized, imperative subjects (“Update README with project overview and tech stack”). Follow that pattern, keep bodies wrapped at ~72 chars, and reference issue IDs when relevant. Every PR should describe the change set, list manual test steps, and attach UI screenshots or recordings when the renderer changes. Link to tracking issues/milestones, call out breaking migrations, and ensure CI (typecheck, lint, future tests) is green before requesting review.
