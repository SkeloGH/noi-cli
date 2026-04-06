# Testability assessment

## Layout

| Module | Role |
|--------|------|
| [`src/helpers.ts`](../src/helpers.ts) | Side-effect-free helpers: `parseCliArgs`, `parseVolumeInput`, `parsePackageJsonVersion`, `isInterruptKey`, `ParsedCli`. No `process`, no `main`. |
| [`src/brownNoise.ts`](../src/brownNoise.ts) | Brown noise state + `fillPcmSamples(state, samples, playbackVolume, random?)`. No I/O; **`random`** is injectable for deterministic tests. |
| [`src/volumeUi.ts`](../src/volumeUi.ts) | `createVolumeLineWriter(stderr)` — stderr writes only; **`stderr`** is injectable. |
| [`src/interactiveVolume.ts`](../src/interactiveVolume.ts) | `bindStdinKeypress(stdin, handlers)`, `VOLUME_STEP`. Non-TTY stdin → no-op teardown (unit-tested). |
| [`src/cli.ts`](../src/cli.ts) | **I/O + composition:** `getPackageVersion` (fs + argv), `parseCli` (exits), `main` (audio + signals + wiring). |

Automated tests: **`node --test test/`** after `npm run build` — see [`test/`](../test/).

---

## Function matrix

| Unit | Kind | Hard dependencies | Tests |
|------|------|-------------------|--------|
| **`parsePackageJsonVersion`** | no I/O | none | `npm test` |
| **`parseVolumeInput`** | no I/O | none | `npm test` |
| **`parseCliArgs`** | no I/O | Node `parseArgs` | `npm test` |
| **`isInterruptKey`** | no I/O | none | `npm test` |
| **`fillPcmSamples`** | stateful | optional `random` | `npm test` (`brownNoise.test.cjs`) |
| **`createVolumeLineWriter`** | I/O | inject `stderr.write` | `npm test` (`volumeUi.test.cjs`) |
| **`bindStdinKeypress`** | I/O | `stdin`, `readline` | non-TTY path in `npm test`; TTY path manual / pty |
| **`getPackageVersion`** | I/O | `process.argv[1]`, fs, path | manual / future mock `fs` |
| **`parseCli`** | side effects | helpers + `console` + `process.exit` | integration |
| **Audio callback** | native | `@echogarden/audio-io` | integration |
| **`shutdown`** | lifecycle | `process.exit`, `dispose` | integration + second-SIGINT path |
| **`main`** | orchestration | all above | e2e |

## Principles applied

1. **Parsing and decisions** live in **`src/helpers.ts`** without `process` / `console` / `exit`.
2. **Synthesis and TTY helpers** live in **`brownNoise`**, **`volumeUi`**, **`interactiveVolume`** with injectable collaborators where practical.
3. **Side effects** stay in **`cli.ts`** (`parseCli`, `getPackageVersion`, `main`).
4. **Published tarball** lists `dist/cli.js`, `dist/helpers.js`, `dist/brownNoise.js`, `dist/volumeUi.js`, `dist/interactiveVolume.js` (see `package.json` `files`) so tests are not shipped.

## Related

- [`docs/learnings/cli-helpers-and-tests.md`](./learnings/cli-helpers-and-tests.md) — naming, boundaries, npm `files`.

## Optional follow-ups

- **TTY path:** mock `stdin` with `isTTY: true` + spies on `setRawMode` / `on("keypress")` if CI needs coverage without a pty.
- **`parseCli` / `main`:** integration test harness or subprocess smoke tests.
