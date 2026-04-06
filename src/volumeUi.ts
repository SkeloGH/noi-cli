/**
 * TTY volume status line (stderr). Encapsulates first-paint vs cursor-up refresh.
 */
export type VolumeLineWriter = {
  writeVolumeLine: (playbackVolume: number) => void;
};

/**
 * @param stderr — inject for tests (`{ write(s: string): void }`).
 */
export function createVolumeLineWriter(stderr: {
  write: (chunk: string) => void;
}): VolumeLineWriter {
  let initialized = false;

  return {
    writeVolumeLine(playbackVolume: number): void {
      const pct = Math.round(playbackVolume * 100);
      const line = `Volume: ${pct}%   `;
      if (!initialized) {
        stderr.write(`\r\x1b[K${line}\n`);
        initialized = true;
        return;
      }
      stderr.write(`\x1b[A\r\x1b[K${line}\n`);
    },
  };
}
