/**
 * Side-effect-free helpers (parse, interrupt detection) — safe to import from tests
 * without running the CLI entrypoint.
 */
import type { Key } from "node:readline";
import { parseArgs } from "node:util";

/** Parse result without I/O — use `parseCli()` in cli.ts for the full entrypoint with exits. */
export type ParsedCli =
  | { kind: "version" }
  | { kind: "run"; volume: number }
  | { kind: "usage" }
  | { kind: "invalid-volume" };

/**
 * Extract semver string from package.json file contents. Returns `"0.0.0"` if invalid.
 */
export function parsePackageJsonVersion(raw: string): string {
  try {
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

/**
 * Volume from CLI flag value. `undefined` → default `1`. Invalid → `null`.
 */
export function parseVolumeInput(raw: string | undefined): number | null {
  if (raw === undefined) {
    return 1;
  }
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    return null;
  }
  return n;
}

/**
 * argv without `node` / script path — i.e. `process.argv.slice(2)`.
 */
export function parseCliArgs(args: string[]): ParsedCli {
  let values: { version?: boolean; volume?: string };
  try {
    ({ values } = parseArgs({
      args,
      options: {
        version: { type: "boolean", short: "v" },
        volume: { type: "string" },
      },
      allowPositionals: false,
      strict: true,
    }));
  } catch {
    return { kind: "usage" };
  }

  if (values.version) {
    return { kind: "version" };
  }

  const volume = parseVolumeInput(values.volume);
  if (volume === null) {
    return { kind: "invalid-volume" };
  }
  return { kind: "run", volume };
}

/**
 * Raw mode often delivers Ctrl+C as ETX (0x03) only; `key` may be undefined or not `name: "c"`.
 * `str` may be undefined for some keys (e.g. arrows) — `emitKeypressEvents` still invokes the listener.
 */
export function isInterruptKey(str: string | undefined, key: Key | undefined): boolean {
  if (key?.ctrl === true && key.name === "c") {
    return true;
  }
  if (str === undefined || str.length === 0) {
    return false;
  }
  for (let i = 0; i < str.length; i += 1) {
    if (str.charCodeAt(i) === 3) {
      return true;
    }
  }
  return false;
}
