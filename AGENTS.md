# AGENTS.md

Guidance for agents and contributors working on `@capgo/capacitor-background-task`.

## Commands

- Use Bun for repository work: `bun install`, `bun run build`, `bun run verify`.
- Use `bunx` for package binaries when needed.
- Documentation and marketing examples should use standard `npm` / `npx` commands.

## Verification

- Run `bun run build` after TypeScript API changes.
- Run `bun run verify:ios` after Swift changes.
- Run `bun run verify:android` after Android changes.
- Run `bun run lint` before publishing when the local toolchain is available.

## Native Notes

- Android scheduling is implemented with WorkManager in `android/src/main/java/app/capgo/backgroundtask`.
- iOS scheduling is implemented with BGTaskScheduler in `ios/Sources/BackgroundTaskPlugin`.
- iOS consumers must add `processing` to `UIBackgroundModes` and `app.capgo.backgroundtask.processing` to `BGTaskSchedulerPermittedIdentifiers`.

## API Docs

The generated README API section comes from `src/definitions.ts`. Update JSDoc there and run `bun run docgen`; do not edit the generated API section by hand.
