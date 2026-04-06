# Learnings — CLI helpers module and tests

Follow-up to splitting testable logic out of the entry file and adding `npm test`. Complements [`interactive-cli-and-reviews.md`](./interactive-cli-and-reviews.md).

---

## Name: `helpers`, not `pure`

The file is **`src/helpers.ts`**: parsing and interrupt-key detection without I/O. The word **helpers** reads clearly in a small CLI; **pure** was accurate but vague (everything should strive to be honest and predictable). Reserve “pure” for describing *properties*, not filenames.

---

## What belongs in `helpers.ts`

- **Argv → structured result** (`parseCliArgs`, `parseVolumeInput`, `ParsedCli`).
- **String → version** from package.json contents (`parsePackageJsonVersion`).
- **TTY key detection** (`isInterruptKey`).

Do **not** put `process.exit`, `console.*`, or `readFileSync` here — those stay in **`cli.ts`** so importing `helpers` never starts audio or exits the process.

---

## What belongs in `cli.ts`

- **`getPackageVersion`**: resolves path from `process.argv[1]`, reads disk, delegates to `parsePackageJsonVersion`.
- **`parseCli`**: maps `ParsedCli` to user-visible errors and exits.
- **`main`**: composes **`brownNoise`**, **`volumeUi`**, **`interactiveVolume`**, dynamic audio import, signals.

## Companion modules (loose coupling)

- **`src/brownNoise.ts`** — `BrownNoiseState` + `fillPcmSamples`; **`random`** injectable for deterministic tests.
- **`src/volumeUi.ts`** — `createVolumeLineWriter(stderr)`; **`stderr`** injectable.
- **`src/interactiveVolume.ts`** — `bindStdinKeypress(stdin, handlers)`; interrupt detection stays in **`handlers`** (from `helpers`), not duplicated inside this module.

---

## Tests and publish scope

- **Unit tests** import compiled **`dist/*.js`** from `test/*.test.cjs`; **`npm test`** runs **`node --test test/`** (build first).
- **`package.json` `files`** lists **`dist/cli.js`**, **`dist/helpers.js`**, **`dist/brownNoise.js`**, **`dist/volumeUi.js`**, **`dist/interactiveVolume.js`** explicitly so test artifacts and stray `dist/*.test.js` are not published if they appear in `dist/`.

---

## Integration boundary

Helpers, brown noise, volume UI, and the non-TTY branch of stdin binding are unit-testable. **Native audio**, **full raw TTY keypress**, and **`process.exit`** in **`parseCli` / `main`** remain **integration** or **manual** until you add fakes, subprocess tests, or a pty — that is expected, not a failure of the split.
