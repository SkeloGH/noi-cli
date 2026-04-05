#!/usr/bin/env node
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import * as readline from "node:readline";
import { parseArgs } from "node:util";

const SAMPLE_RATE = 44100;
/** Mono only; multi-channel output is not implemented (see `createAudioOutput` below). */
const CHANNEL_COUNT = 1;

/** Step size for interactive ↑ / ↓ (fraction of 0–1). */
const VOLUME_STEP = 0.05;

const LEAK = 0.99925;
const WHITE_SCALE = 1 - LEAK;

/**
 * Peak PCM amplitude as a fraction of Int16 full scale. This is the app's "max loudness"
 * in digital form; use the OS / device volume control for listening level.
 */
const DIGITAL_HEADROOM = 0.92;
const MAX_SAMPLE = Math.floor(32767 * DIGITAL_HEADROOM);

/** Scales integrator state before soft limiting (affects timbre vs how often the limiter engages). */
const INTEGRATOR_SCALE = 5.5;

function getPackageVersion(): string {
  try {
    const scriptPath = process.argv[1];
    if (!scriptPath) {
      return "0.0.0";
    }
    const dir = dirname(realpathSync(scriptPath));
    const pkgPath = join(dir, "..", "package.json");
    const raw = readFileSync(pkgPath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("version" in parsed) ||
      typeof (parsed as { version: unknown }).version !== "string"
    ) {
      return "0.0.0";
    }
    const v = (parsed as { version: string }).version.trim();
    return v.length > 0 ? v : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function parseVolume(raw: string | undefined): number {
  if (raw === undefined) {
    return 1;
  }
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    console.error("noi: --volume expects a number between 0 and 1");
    process.exit(1);
  }
  return n;
}

function parseCli(): { volume: number } {
  let values: { version?: boolean; volume?: string };
  try {
    ({ values } = parseArgs({
      args: process.argv.slice(2),
      options: {
        version: { type: "boolean", short: "v" },
        volume: { type: "string" },
      },
      allowPositionals: false,
      strict: true,
    }));
  } catch {
    console.error("Usage: noi [--volume <0-1>] [-v|--version]");
    process.exit(1);
  }

  if (values.version) {
    console.log(getPackageVersion());
    process.exit(0);
  }

  return { volume: parseVolume(values.volume) };
}

async function main(): Promise<void> {
  const { volume: initialVolume } = parseCli();
  let playbackVolume = initialVolume;
  let brown = 0;
  let shuttingDown = false;
  /** After the first paint, updates move up with `\x1b[A` so stderr below stays clean. */
  let volumeStatusLineInitialized = false;

  function fillPcmChunk(samples: Int16Array): void {
    for (let i = 0; i < samples.length; i++) {
      const white = (Math.random() * 2 - 1) * WHITE_SCALE;
      brown = brown * LEAK + white;
      const w = Math.tanh(brown * INTEGRATOR_SCALE);
      const scaled = w * MAX_SAMPLE * playbackVolume;
      samples[i] = Math.round(scaled);
    }
  }

  function writeVolumeLine(): void {
    const pct = Math.round(playbackVolume * 100);
    const line = `Volume: ${pct}%   `;
    if (!volumeStatusLineInitialized) {
      process.stderr.write(`\r\x1b[K${line}\n`);
      volumeStatusLineInitialized = true;
      return;
    }
    process.stderr.write(`\x1b[A\r\x1b[K${line}\n`);
  }

  /**
   * When stdin is a TTY, enable ↑ / ↓ to change volume. Restores the terminal on teardown.
   * In raw mode, Ctrl+C may arrive as a keypress; we handle that and still listen for SIGINT.
   */
  function setupInteractiveVolume(requestShutdown: () => void): () => void {
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      return () => {};
    }

    readline.emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();

    const onKeypress = (_str: string, key: readline.Key | undefined): void => {
      if (!key) {
        return;
      }
      if (key.ctrl && key.name === "c") {
        requestShutdown();
        return;
      }
      if (key.name === "up") {
        playbackVolume = Math.min(1, playbackVolume + VOLUME_STEP);
        writeVolumeLine();
        return;
      }
      if (key.name === "down") {
        playbackVolume = Math.max(0, playbackVolume - VOLUME_STEP);
        writeVolumeLine();
        return;
      }
    };

    stdin.on("keypress", onKeypress);
    writeVolumeLine();

    return () => {
      stdin.removeListener("keypress", onKeypress);
      try {
        stdin.setRawMode(false);
      } catch {
        /* ignore if stream cannot be restored */
      }
      stdin.pause();
    };
  }

  const { createAudioOutput } = await import("@echogarden/audio-io");

  const audioOutput = await createAudioOutput(
    {
      sampleRate: SAMPLE_RATE,
      channelCount: CHANNEL_COUNT,
      bufferDuration: 100,
    },
    (outputBuffer: Int16Array) => {
      if (shuttingDown) {
        outputBuffer.fill(0);
        return;
      }
      fillPcmChunk(outputBuffer);
    }
  );

  let teardownInteractive: () => void = () => {};

  const shutdown = async (): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    teardownInteractive();
    try {
      await audioOutput.dispose();
    } catch (err: unknown) {
      console.error(err);
      process.exitCode = 1;
    }
    process.exit(process.exitCode ?? 0);
  };

  teardownInteractive = setupInteractiveVolume(() => {
    void shutdown();
  });

  process.once("SIGINT", () => {
    void shutdown();
  });
  process.once("SIGTERM", () => {
    void shutdown();
  });
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
