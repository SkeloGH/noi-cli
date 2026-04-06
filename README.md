# muril

**muril** (*murmur* + *‑il*) is a minimal CLI that plays **brown noise** through your default audio output. Stop with **Ctrl+C**.

## Requirements

- **Node.js 18+**
- **macOS** (x64 / arm64), **Windows** (x64 / arm64), or **Linux** (x64 / arm64) with a working default audio device

Audio output uses [`@echogarden/audio-io`](https://github.com/echogarden-project/audio-io) (prebuilt native addons, no compiler toolchain needed at install time).

## Install

```bash
npm install muril
```

## Run with npx

```bash
npx muril
```

That runs the `muril` binary from the package (no global install required).

**Options:** `--volume <0-1>` sets the starting level (default `1`). `-v` / `--version` prints the package version.

**Interactive (terminal only):** while running, **↑** / **↓** adjust volume in steps of 5%. **Ctrl+C** stops playback. If stdin isn’t a TTY (e.g. piped), only `--volume` applies and there are no key controls.

After a global install, you can run:

```bash
muril
```

## From source

```bash
git clone https://github.com/SkeloGH/muril.git
cd muril
npm install
npm run build
npm test
node dist/cli.js
```

To use the **`muril`** command name locally: `npm link` in this directory, then run `muril`.

## License

MIT
