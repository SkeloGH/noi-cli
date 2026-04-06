#!/usr/bin/env node
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  createBrownNoiseState,
  fillPcmSamples,
} from "./brownNoise.js";
import { isInterruptKey, parseCliArgs, parsePackageJsonVersion } from "./helpers.js";
import {
  VOLUME_STEP,
  bindStdinKeypress,
} from "./interactiveVolume.js";
import { createVolumeLineWriter } from "./volumeUi.js";

const SAMPLE_RATE = 44100;
/** Mono only; multi-channel output is not implemented (see `createAudioOutput` below). */
const CHANNEL_COUNT = 1;

function getPackageVersion(): string {
  try {
    const scriptPath = process.argv[1];
    if (!scriptPath) {
      return "0.0.0";
    }
    const dir = dirname(realpathSync(scriptPath));
    const pkgPath = join(dir, "..", "package.json");
    const raw = readFileSync(pkgPath, "utf8");
    return parsePackageJsonVersion(raw);
  } catch {
    return "0.0.0";
  }
}

function parseCli(): { volume: number } {
  const parsed = parseCliArgs(process.argv.slice(2));
  switch (parsed.kind) {
    case "version":
      console.log(getPackageVersion());
      process.exit(0);
    case "usage":
      console.error("Usage: noi [--volume <0-1>] [-v|--version]");
      process.exit(1);
    case "invalid-volume":
      console.error("noi: --volume expects a number between 0 and 1");
      process.exit(1);
    case "run":
      return { volume: parsed.volume };
  }
}

async function main(): Promise<void> {
  const { volume: initialVolume } = parseCli();
  let playbackVolume = initialVolume;
  let shuttingDown = false;

  const brownState = createBrownNoiseState();
  const volumeWriter = createVolumeLineWriter(process.stderr);

  let teardownInteractive: () => void = () => {};

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
      fillPcmSamples(brownState, outputBuffer, playbackVolume, Math.random);
    }
  );

  const shutdown = async (): Promise<void> => {
    if (shuttingDown) {
      process.exit(process.exitCode ?? 1);
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

  teardownInteractive = bindStdinKeypress(process.stdin, {
    isInterruptKey,
    onInterrupt: () => {
      void shutdown();
    },
    onVolumeUp: () => {
      playbackVolume = Math.min(1, playbackVolume + VOLUME_STEP);
      volumeWriter.writeVolumeLine(playbackVolume);
    },
    onVolumeDown: () => {
      playbackVolume = Math.max(0, playbackVolume - VOLUME_STEP);
      volumeWriter.writeVolumeLine(playbackVolume);
    },
  });

  if (process.stdin.isTTY) {
    volumeWriter.writeVolumeLine(playbackVolume);
  }

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
