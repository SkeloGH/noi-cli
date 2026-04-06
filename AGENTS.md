# AGENTS.md

Provider-agnostic orientation for AI agents (Claude, GPT-4, Gemini, Cursor, Copilot, etc.) working in this repository.

---

## What this project is

**muril** is a minimal CLI that synthesizes brown noise in real time and streams it to the system's default audio output. It has no network I/O, no configuration files, and no dependencies beyond a single native audio addon.

---

## File map

```
src/cli.ts                entry — compiles to dist/cli.js (the `muril` binary); composition, I/O, signals
src/helpers.ts            side-effect-free helpers (CLI parse, JSON version parse, interrupt key)
src/brownNoise.ts         brown noise + Int16 PCM fill (`createBrownNoiseState`, `fillPcmSamples`)
src/volumeUi.ts           stderr volume status line (`createVolumeLineWriter`)
src/interactiveVolume.ts  raw TTY stdin keypress (`bindStdinKeypress`, `VOLUME_STEP`)
test/*.test.cjs           unit tests (run after `npm run build`; `node --test test/`)
package.json              version, bin entry, npm scripts
tsconfig.json             target ES2020, module Node16, strict mode
dist/                     compiled output (not committed)
docs/learnings/           project-specific engineering principles — read before changing code
docs/learnings/cli-helpers-and-tests.md  helpers split, tests, npm publish scope
docs/testability-assessment.md  how each unit is testable and what stays integration-bound
```

There is no linting configuration. `**npm test**` builds and runs `**node --test test/**` (helpers, brown noise, volume UI, interactive stdin).

---

## Build and run

```bash
npm install        # first time only
npm run build      # tsc → dist/cli.js + dist/helpers.js
npm test           # build + unit tests (entire test/ directory)
npm run dev        # build + run immediately
npm start          # run dist/cli.js (requires prior build)
muril --volume 0.7
muril --version
```

From a dev checkout without `npm link`, use `node dist/cli.js` with the same flags.

TypeScript is the only build step. There is no bundler, no transpiler other than `tsc`, and no asset pipeline.

---

## Architecture

`**src/helpers.ts**` holds parsing and interrupt detection with **no** `process` / `console` / `exit` — unit-tested. `**src/brownNoise.ts`** holds synthesis state and `fillPcmSamples` (injectable `**random**` for tests). `**src/volumeUi.ts**` writes the stderr volume line. `**src/interactiveVolume.ts**` binds stdin keypress when TTY; interrupt detection is delegated via `**handlers.isInterruptKey**` from helpers (no direct import of interrupt rules there). `**src/cli.ts**` defines `parseCli()` and `getPackageVersion()` (side effects) and `**main()**` (wires audio + TTY + signals). Importing `helpers` / `brownNoise` / etc. does **not** run the CLI.

### Audio synthesis — `fillPcmSamples` (`brownNoise.ts`)

Brown noise is produced by a leaky integrator over white noise:

```
brown = brown * LEAK + white      (LEAK = 0.99925, state in `BrownNoiseState`)
output = tanh(brown * INTEGRATOR_SCALE) * MAX_SAMPLE * playbackVolume
```

`Math.tanh` soft-limits the output; combined with `DIGITAL_HEADROOM = 0.92`, the sample value is always within `[-30145, 30145]` — well inside Int16 range. No additional clamping is needed or present.

The callback is pull-style: `@echogarden/audio-io` calls the fill when it needs more samples. The callback is synchronous; `main()` is `async` only because the addon import is dynamic.

### Volume control — `bindStdinKeypress` + `createVolumeLineWriter`

Only active when `stdin.isTTY`. Enables raw mode, listens for ↑/↓ keys (±`VOLUME_STEP` = 5%), and routes Ctrl+C to `shutdown()`. Returns a teardown function that removes the listener, restores terminal state, and pauses stdin.

`createVolumeLineWriter` uses an internal first-paint flag to distinguish the first line (no cursor-up) from subsequent updates (`\x1b[A\r\x1b[K…\n`). After every paint the cursor lands on the line *below* the status display, keeping any other stderr output clean. The **initial** `writeVolumeLine` in `main()` runs only when `process.stdin.isTTY` (same contract as interactive keys: no stderr volume UI when stdin is piped or non-interactive).

### Shutdown — `shutdown()`

Idempotent via `shuttingDown` flag. Sequence:

1. Set `shuttingDown = true` — audio callback starts filling zeros
2. Call `teardownInteractive()` — restores terminal
3. `await audioOutput.dispose()` in try/catch — logs errors, sets `exitCode = 1`
4. `process.exit(process.exitCode ?? 0)` — unconditional, always reached

SIGINT, SIGTERM, and Ctrl+C in raw mode all route through the same function.

---

## Key invariants — do not break these


| Invariant                                             | Where it matters                                                                                                           |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `shutdown()` must always reach `process.exit()`       | Wrap `dispose()` in try/catch; never use bare `void shutdown()` without ensuring the function itself handles rejections    |
| Audio callback is synchronous                         | `fillPcmSamples` must not await, schedule, or allocate; it runs on every pull (~100 ms)                                    |
| `CHANNEL_COUNT = 1` is not configurable               | `fillPcmSamples` writes flat mono samples; changing `CHANNEL_COUNT` without rewriting the fill loop produces corrupt audio |
| `parseCli()` runs inside `main()`, not at module load | Side-effect-free module top level; `process.exit()` must not be reachable on import                                        |
| Status line cursor model                              | `createVolumeLineWriter` lines always end with `\n`; do not add extra newlines in teardown or setup                        |


---

## Principles from past work

Derived from `docs/learnings/interactive-cli-and-reviews.md`:

- **Async cleanup must guarantee exit.** A rejected teardown must log, set a non-zero exit code, and still terminate.
- **Parse defensively.** Validate types and required fields on any value read from disk. Do not trust unchecked casts.
- **Side effects belong in the entry path.** Argument parsing, version printing, and `process.exit()` must not run while the module loads.
- **Terminal status lines need a clear model.** Either live-update with explicit cursor control (cursor always ends on a fresh row), or one-shot print with no in-place refresh. Blank lines do not substitute for cursor control.
- **Document single-mode settings.** If an option (e.g. `CHANNEL_COUNT`) implies configurability that is not implemented, say so next to the declaration.
- **No dead guards.** If the math or types already prevent a value from being out of range, do not add a clamp. A guard that cannot fire implies the impossible is possible.

---

## What agents should avoid

- Duplicating parse/validation logic outside `src/helpers.ts` — keep a single source of truth for testable behavior.
- Adding a heavy test framework — `node:test` + `test/*.test.cjs` is enough for unit tests.
- Changing `bufferDuration` (100 ms) or `SAMPLE_RATE` (44100) without understanding the downstream effects on the pull callback timing.
- Touching `LEAK` or `INTEGRATOR_SCALE` without understanding the noise spectrum implications; these values were tuned by ear.

