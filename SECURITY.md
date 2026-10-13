# Security Policy

## Supported Versions

Only the latest release receives security fixes.

| Version | Supported |
| ------- | --------- |
| 1.0.x   | ✅        |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, report them privately by opening a
[GitHub Security Advisory](https://github.com/jinhun-tqtteam/ActNow/security/advisories/new)
or by emailing the maintainers. Include:

- A description of the vulnerability and its impact.
- Steps to reproduce it.
- The affected version(s) and environment (browser, OS).

You can expect an acknowledgement within a few days. We will keep you informed
about the progress of the fix and credit you in the release notes unless you
prefer to stay anonymous.

## Scope & Notes

ActNow runs entirely in the browser:

- It communicates only with the AI provider you configure (OpenRouter or an
  OpenAI-compatible endpoint).
- Your API key and conversations are stored in Chrome's storage and are never sent
  anywhere except the provider you configure. API keys are encrypted before storage.
- The extension has no analytics, telemetry, or third-party tracking.

Areas of particular interest for security review include the Markdown renderer
(XSS via model output), the encryption module, message handling over the runtime
Port, and the permissions declared in `manifest.json`.
