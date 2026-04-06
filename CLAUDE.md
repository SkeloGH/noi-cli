# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install dependencies
npm run build      # compile TypeScript → dist/
npm run dev        # build + run immediately
npm start          # run dist/cli.js (requires prior build)
```

Unit tests cover **`helpers`**, **`brownNoise`**, **`volumeUi`**, and **`interactiveVolume`** (`npm test` runs `node --test test/`). Native audio and full TTY behavior remain manual or integration-level.

## Architecture

**`src/helpers.ts`** — side-effect-free helpers (`parseCliArgs`, `parseVolumeInput`, `parsePackageJsonVersion`, `isInterruptKey`); safe to import without running the CLI.

**`src/brownNoise.ts`** — `createBrownNoiseState` + `fillPcmSamples` (injectable `random` for tests).

**`src/volumeUi.ts`** — `createVolumeLineWriter(stderr)` for the stderr volume line.

**`src/interactiveVolume.ts`** — `bindStdinKeypress`, `VOLUME_STEP`; interrupt policy comes from handlers (typically `isInterruptKey` from helpers).

**`src/cli.ts`** — compiles to `dist/cli.js` (the `noi` binary) and composes the modules above.

**Audio generation** — brown noise is synthesized in real time using a leaky integrator over white noise (`LEAK = 0.99925`). Each audio callback calls `fillPcmSamples`, which writes Int16 PCM samples into the buffer handed to `@echogarden/audio-io`.

**Audio output** — `@echogarden/audio-io` (`createAudioOutput`) drives a pull-style callback at 44100 Hz, mono, 100 ms buffer. The callback is synchronous; `main()` is async only because the import of `@echogarden/audio-io` is dynamic (native addon).

**Volume control** — `playbackVolume` is a `let` inside `main()`. When stdin is a TTY, raw mode is enabled, the initial volume line is printed to stderr, and ↑/↓ keys adjust it in `VOLUME_STEP` (5%) steps. In non-TTY contexts (pipes, scripts) there is no keypress handler and no volume status line — only `--volume` applies.

**Shutdown** — `shutdown()` is idempotent (guarded by `shuttingDown`). It zeros the audio buffer, disposes the audio output, and exits. Both SIGINT/SIGTERM and Ctrl+C in raw-TTY mode route through the same function.

**CLI parsing** — uses Node's built-in `parseArgs`; supports `--volume <0–1>` and `-v`/`--version`.
