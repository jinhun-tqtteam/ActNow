<div align="center">

<img src="icons/icon128.png" alt="ActNow logo" width="120" height="120" />

# ActNow AI Assistant

**Your intelligent AI companion for the web.**

A Manifest V3 Chrome extension that injects a fast, non-intrusive AI chat widget
into any website — bring your own key and connect to **OpenRouter** or any
**OpenAI-compatible** endpoint.

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/develop/migrate)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Features](#-features) • [Installation](#-installation) • [Configuration](#-configuration) •
[Usage](#-usage) • [Architecture](#-architecture) • [Contributing](#-contributing)

</div>

---

## 📋 Overview

**ActNow** is a Chrome extension that brings a context-aware AI chat assistant to
every page you visit. Instead of a sidebar that squeezes the page, ActNow uses a
floating, resizable widget rendered inside a **Shadow DOM**, so its styles never
conflict with the host website.

Connect it to **[OpenRouter](https://openrouter.ai)** to reach practically any LLM
(Claude, GPT-4o, Gemini, Llama, Mistral, and more) with a single key, or point it
at any **OpenAI-compatible** API (OpenAI, LocalAI, vLLM, Ollama, …) with a custom
base URL.

## ✨ Features

### 🤖 Flexible AI providers
- **OpenRouter** — one key, hundreds of models.
- **OpenAI-compatible** — custom base URL for OpenAI, LocalAI, vLLM, etc.
- **Dynamic model list** — models are loaded live from the provider.
- **Streaming responses** — tokens appear in real time.

### 🧠 Context awareness
- **Smart selection** — highlight text on a page and ActNow captures it as context.
- **"Ask about this"** — perfect for explaining paragraphs, translating, or debugging code.

### 🎨 Modern UI/UX
- **Glassmorphism design** that blends with any site.
- **Shadow DOM isolation** — no style bleed in either direction.
- **Resizable & draggable** floating window.
- **Collapsible** to a small floating bubble.

### ⚡ Productivity
- **Custom chips** — one-click prompt shortcuts (e.g. "Summarize", "Fix Grammar").
- **Request queue** — queue multiple questions without waiting.
- **Markdown support** — code blocks, lists, tables, and syntax highlighting.

### 💾 Robust management
- **Local history** — conversations are saved in your browser.
- **Sidebar organization** — manage multiple active conversations.
- **Encrypted key storage** — your API key is encrypted before being stored.
- **Export / import** — back up your history and settings to JSON.

## 🚀 Installation

> ActNow is currently distributed as a **developer-mode (unpacked) extension**.
> A Chrome Web Store release is planned.

1. **Clone the repository**

   ```bash
   git clone https://github.com/jinhun-tqtteam/ActNow.git
   cd ActNow
   ```

2. **(Optional) Validate the build**

   ```bash
   ./build.sh      # macOS / Linux
   build.bat       # Windows
   ```

3. **Open Chrome's extension page**

   Navigate to `chrome://extensions/`.

4. **Enable Developer mode**

   Toggle **Developer mode** on in the top-right corner.

5. **Load the extension**

   Click **Load unpacked** and select the repository root folder
   (the folder containing `manifest.json`).

6. **Done** — the extension opens its options page automatically on first install.

## ⚙️ Configuration

Before using ActNow you need an API provider.

### 1. Pick a provider

1. Open the Options page (click the toolbar icon, or right-click it → **Options**).
2. Choose a **Provider**:
   - **OpenRouter** (default) — create a key at [openrouter.ai/keys](https://openrouter.ai/keys).
   - **OpenAI / Compatible** — enter a **Base URL** (e.g. `https://api.openai.com/v1`)
     and an API key. Works with OpenAI, LocalAI, vLLM, and other OpenAI-compatible servers.

### 2. Verify and select a model

1. Paste your key and click **Test Key** — the model list loads automatically.
2. Choose a model (e.g. `anthropic/claude-3.5-sonnet`).
3. **Tuning** — adjust *Creativity* (temperature) and *Max Tokens* as desired.

### 3. Custom chips

In the Options page you can add prompt shortcuts that appear above the chat input:

| Field    | Description                                                        |
| -------- | ------------------------------------------------------------------ |
| **Label** | Text shown on the button (e.g. `Refactor`).                         |
| **Prompt**| Text prepended to your message (e.g. `Refactor this code: `).       |

## 📖 Usage

### Basic chat
1. Click the **floating lightning button** (bottom-right) to open.
2. Type your query and press **Enter** (use **Shift + Enter** for a new line).

### Using page context
1. Highlight any text on the page.
2. ActNow shows a **context preview** above the input.
3. Ask a question (e.g. "Explain this") — the selection is sent along as context.

### Managing conversations
- **New chat** — click the **+** icon in the sidebar.
- **History** — open the sidebar to browse past conversations.
- **Delete** — use the trash icon on a conversation.

### Window management
- **Resize** — drag any edge or corner.
- **Minimize** — click the down arrow or the floating bubble.

## 🏗️ Architecture

### Components

| File | Responsibility |
| ---- | -------------- |
| `manifest.json` | Extension configuration (Manifest V3). |
| `background.js` | Service worker — calls the provider API and streams the response (avoids CORS in content scripts). |
| `content/content.js` | The core content script — injects the Shadow DOM host, manages UI state, drag/resize, and events. |
| `content/chat-widget.html` | Markup for the chat widget. |
| `content/chat-widget.css` | Widget styles (glassmorphism, themes). |
| `options/options.html` | Options / settings page. |
| `options/options.js` | Settings logic, provider handling, API key validation, model loading. |
| `utils/constants.js` | Centralized configuration and magic numbers. |
| `utils/encryption.js` | Encrypts sensitive values (API keys) before storage. |
| `utils/storage-manager.js` | Wraps `chrome.storage` access. |
| `utils/state-manager.js` | Manages runtime application state. |
| `utils/api-manager.js` | Handles provider communication and streaming. |
| `utils/markdown-engine.js` | Lightweight Markdown renderer with syntax highlighting. |

### Data flow

```
User types  ──▶  content.js
                   │  runtime Port
                   ▼
              background.js  ──▶  Provider API (OpenRouter / OpenAI-compatible, streaming)
                   │  chunks over Port
                   ▼
              content.js  ──▶  live UI update
```

### Storage

- `chrome.storage.sync` — settings (provider, keys, model, theme, preferences, chips).
- `chrome.storage.local` — conversations and message history.

## 🔒 Privacy & Security

ActNow is built privacy-first:

- **Local storage** — chat history lives only in your browser.
- **Direct API calls** — prompts go straight from your browser to the provider you
  configure. No middleman.
- **Encrypted keys** — your API key is encrypted before being stored.
- **No analytics** — no tracking or telemetry scripts.

Found a security issue? Please read [`SECURITY.md`](SECURITY.md) before filing a report.

## 🤝 Contributing

Contributions are welcome and appreciated! Please read
[`CONTRIBUTING.md`](CONTRIBUTING.md) and our
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) first.

Quick start:

1. Fork the repo and create a branch: `git checkout -b feature/amazing-feature`.
2. Make your change and test it via **Load unpacked**.
3. Commit (`git commit -m "feat: add amazing feature"`).
4. Push and open a Pull Request.

## 🗺️ Roadmap

- [ ] Chrome Web Store release.
- [ ] Firefox / Edge packaging.
- [ ] i18n / localization.
- [ ] Per-site conversation isolation options.

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

## 🙏 Acknowledgements

- [OpenRouter](https://openrouter.ai) for unified LLM access.
- The Chrome Extensions team for the Manifest V3 platform.

---

<div align="center">
Made with ⚡ by the ActNow community.
</div>
