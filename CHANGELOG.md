# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-10-13

First public release.

### Added
- Floating, resizable, and draggable AI chat widget injected into all websites.
- Shadow DOM isolation so widget styles never conflict with host pages.
- Streaming responses through the background service worker.
- **OpenRouter** and **OpenAI-compatible** provider support with a custom base URL.
- Dynamic model loading from the configured provider.
- Context awareness — highlighted page text is captured as prompt context.
- Custom prompt chips (one-click shortcuts) configurable in the options page.
- Request queue for sending multiple questions in a row.
- Markdown rendering with syntax highlighting for code blocks.
- Local conversation history with a sidebar to manage multiple chats.
- Encrypted storage for API keys.
- Options page with provider selection, key validation, and tuning controls.
- Export / import of chat history and settings as JSON.

[Unreleased]: https://github.com/jinhun-tqtteam/ActNow/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/jinhun-tqtteam/ActNow/releases/tag/v1.0.0
