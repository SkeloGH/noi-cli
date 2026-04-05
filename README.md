# @skelogh/noi-cli

Minimal CLI that plays **brown noise** through your default audio output. Stop with **Ctrl+C**.

## Requirements

- **Node.js 18+**
- **macOS** (x64 / arm64), **Windows** (x64 / arm64), or **Linux** (x64 / arm64) with a working default audio device

Audio output uses [`@echogarden/audio-io`](https://github.com/echogarden-project/audio-io) (prebuilt native addons, no compiler toolchain needed at install time).

## Install

```bash
npm install @skelogh/noi-cli
```

## Run with npx

```bash
npx @skelogh/noi-cli
```

That runs the `noi` binary from the package (no global install required).

**Options:** `--volume <0-1>` sets the starting level (default `1`). `-v` / `--version` prints the package version.

**Interactive (terminal only):** while running, **↑** / **↓** adjust volume in steps of 5%. **Ctrl+C** stops playback. If stdin isn’t a TTY (e.g. piped), only `--volume` applies and there are no key controls.

After a global install, you can run:

```bash
noi
```

## From source

```bash
git clone https://github.com/skelogh/noi-cli.git
cd noi-cli
npm install
npm run build
node dist/cli.js
```

## License

MIT
