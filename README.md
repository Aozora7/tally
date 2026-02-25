# Tally

A local-first personal finance tracking desktop application built with Tauri, React, and TypeScript. Transactions live in your browser's IndexedDB and can optionally sync to Google Drive.

![screenshot](https://github.com/Aozora7/tally/raw/master/images/screenshot.png)

---

## DISCLAIMER

**This project is for my personal use. I will not distribute binaries, provide installation packages, offer support of any kind, or respond to bug reports or feature requests.**

If you want to use this software, you are welcome to fork the repository and build it yourself. You are entirely on your own. Do not open issues asking for help, do not expect documentation to be maintained for your benefit, and do not expect the codebase to be stable between commits. This is a personal tool that I modify to suit my own needs without consideration for anyone else's workflow or environment.

---

## Development Prerequisites

- **Node.js** (v20 or later recommended)
- **Rust** toolchain — install via [rustup](https://rustup.rs/)
- **Tauri v2 system dependencies** — see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/) for your platform. On Windows this means WebView2 (usually already present) and the MSVC build tools.
- **NASM** — required by the Rust crypto dependencies (`aws-lc-sys`). Install via [nasm.us](https://nasm.us/) and ensure it is on your `PATH`.

## Setup

```bash
npm install
```

## Development

```bash
npm run tauri:dev
```

## Build

```bash
npm run tauri:build
```

The installer and binary will be output to `src-tauri/target/release/bundle/`.

## Other Scripts

```bash
npm run dev          # Frontend only (Vite dev server, no Tauri shell)
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
npm run format       # Prettier
```
