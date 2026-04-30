# class-planner — Project-Specific Code Convention

> Extends `dev-pack/docs/code-convention.md` (global). Rules here override global where they conflict.

## Language Policy (overrides global)

- **Code, variable names, comments:** English only.
- **Commit message description:** English only. (e.g., `fix(schedule): fix duplicate student registration on IME Enter`)
- **Documentation (*.md):** Korean allowed. This is a Korean-language service; Korean docs reduce cognitive load.
- **UI strings:** Korean (end-user facing).

## File Size Target (applies global rule)

- Max 300 lines per file enforced for **new code**.
- **Existing violations** (17 files, e.g., `schedule/page.tsx` at 1032 lines): reduce incrementally during Phase 2B refactoring. Do not block PRs solely due to existing violations, but do not make them larger.

## Styling (overrides global TypeScript rule)

- **Tailwind CSS only** for new components. No inline styles.
- **CSS Modules (`*.module.css`):** existing files stay; do not add new ones. Migrate to Tailwind when touching the component.
- `globals.css` for CSS custom properties shared across pages.

## Branch Naming (extends global)

Allowed prefixes: `feature/`, `fix/`, `hotfix/`, `docs/`, `chore/`, `test/`, `phaseN/`

## Keyboard Event Handling

- `onKeyDown` + `!e.nativeEvent.isComposing` guard is mandatory for any Enter-key handler. Omitting the guard causes double-submit with Korean (and other CJK) IME input.
- Do not use `onKeyPress` (deprecated in HTML5, removed from React 19 roadmap). Replace with `onKeyDown`.
- Reference: `src/app/schedule/page.tsx:767`

## Testing

- Vitest for unit/integration. Playwright for E2E.
- All tests must pass before commit (`npm run check:quick`).
- When deleting a file, delete its `__tests__/` counterpart too.
- No orphaned test files (tests for deleted code).

## Local-First Data Pattern

- localStorage is SSOT for all data. Mutations update localStorage first, then fire-and-forget server sync via `apiSync.ts`.
- Never call API directly from components. Use `useXxxLocal` hooks.
- Anonymous users: no API calls. Server sync activates only after login.
