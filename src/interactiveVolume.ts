/**
 * Binds stdin keypress (raw TTY) to volume / interrupt actions. No knowledge of audio.
 */
import * as readline from "node:readline";
import type { Key } from "node:readline";

/** Step for interactive ↑ / ↓ (fraction of 0–1). */
export const VOLUME_STEP = 0.05;

export type StdinKeypressHandlers = {
  isInterruptKey: (str: string | undefined, key: Key | undefined) => boolean;
  onInterrupt: () => void;
  onVolumeUp: () => void;
  onVolumeDown: () => void;
};

type KeypressableStdin = NodeJS.ReadStream & {
  isTTY?: boolean;
  setRawMode?: (mode: boolean) => void;
  resume?: () => void;
  pause?: () => void;
};

/**
 * Returns teardown (remove listener, restore tty). No-op teardown if `stdin` is not a TTY.
 */
export function bindStdinKeypress(
  stdin: KeypressableStdin,
  handlers: StdinKeypressHandlers
): () => void {
  if (!stdin.isTTY) {
    return () => {};
  }

  readline.emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();

  const onKeypress = (str: string | undefined, key: Key | undefined): void => {
    if (handlers.isInterruptKey(str, key)) {
      handlers.onInterrupt();
      return;
    }
    if (!key) {
      return;
    }
    if (key.name === "up") {
      handlers.onVolumeUp();
      return;
    }
    if (key.name === "down") {
      handlers.onVolumeDown();
      return;
    }
  };

  stdin.on("keypress", onKeypress);

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
