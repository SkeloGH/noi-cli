# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install dependencies
npm run build      # compile TypeScript → dist/
npm run dev        # build + run immediately
npm start          # run dist/cli.js (requires prior build)
```

There are no tests in this project.

## Architecture

Single-file CLI: `src/cli.ts` compiles to `dist/cli.js`, which is the `noi` binary entry point.

**Audio generation** — brown noise is synthesized in real time using a leaky integrator over white noise (`LEAK = 0.99925`). Each audio callback calls `fillPcmChunk`, which writes Int16 PCM samples into the buffer handed to `@echogarden/audio-io`.

**Audio output** — `@echogarden/audio-io` (`createAudioOutput`) drives a pull-style callback at 44100 Hz, mono, 100 ms buffer. The callback is synchronous; `main()` is async only because the import of `@echogarden/audio-io` is dynamic (native addon).

**Volume control** — `playbackVolume` is a module-level `let`. When stdin is a TTY, raw mode is enabled and ↑/↓ keys adjust it in 5% steps. In non-TTY contexts (pipes, scripts) the keypress handler is skipped entirely.

**Shutdown** — `shutdown()` is idempotent (guarded by `shuttingDown`). It zeros the audio buffer, disposes the audio output, and exits. Both SIGINT/SIGTERM and Ctrl+C in raw-TTY mode route through the same function.

**CLI parsing** — uses Node's built-in `parseArgs`; supports `--volume <0–1>` and `-v`/`--version`.
