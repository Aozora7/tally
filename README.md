# Tally

A local-first personal finance tracking desktop application built with Tauri, React, and TypeScript. Transactions are stored locally in IndexedDB and can optionally sync to Google Drive.  
Demo at [tally.aozora.one](https://tally.aozora.one/)

---

![screenshot_1](https://github.com/Aozora7/tally/raw/main/images/screenshot_1.png)

![screenshot_2](https://github.com/Aozora7/tally/raw/main/images/screenshot_2.png)

---

## DISCLAIMER

**This project is for my personal use. I will not distribute binaries, offer support, or respond to bug reports or feature requests.**

This basically my finance spreadhseet rewritten in JavaScript. I will modify to suit my own needs without consideration for anyone else's workflow or environment. There will be no instructions or documentation. I may make breaking changes at any point.

If you want to use this software, you should fork the repository, build it yourself, and adjust it for your own needs.

---

## Development Prerequisites

- **Node.js** (v20 or later recommended)
- **Rust** toolchain — install via [rustup](https://rustup.rs/)
- **Tauri v2 system dependencies** — see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/) for your platform. On Windows this means WebView2 (usually already present) and the MSVC build tools.

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
