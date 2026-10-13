# Contributing to ActNow AI Assistant

Thanks for your interest in improving ActNow! 🎉
This document explains how to set up the project and the conventions we follow.

## Code of Conduct

By participating you agree to abide by our
[Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to the
maintainers.

## Ways to contribute

- 🐛 **Report bugs** — open an issue using the bug report template.
- 💡 **Suggest features** — open an issue using the feature request template.
- 📝 **Improve docs** — fixes to README or inline comments are welcome.
- 🔧 **Send code** — fix a bug or implement a feature via a Pull Request.

## Development setup

ActNow is a plain Manifest V3 extension with **no build step** — the extension is
loaded directly from source. (`build.sh` / `build.bat` only validate the project.)

1. **Fork and clone**

   ```bash
   git clone https://github.com/<your-username>/ActNow.git
   cd ActNow
   ```

2. **Load the extension in Chrome**

   - Open `chrome://extensions/`.
   - Enable **Developer mode**.
   - Click **Load unpacked** and select the repository root (the folder with `manifest.json`).

3. **Iterate**

   - After editing files, go back to `chrome://extensions/` and click the
     **Reload** (⟳) button on the extension card.
   - Refresh the page you are testing on.
   - Debug the content script via the page's DevTools (F12); debug the service
     worker via the **service worker** link on the extension card.

4. **Try it on a test page**

   Open [`test-extension.html`](test-extension.html) in the browser to verify the
   widget loads.

## Project layout

```
.
├── manifest.json            # MV3 manifest
├── background.js            # Service worker (provider proxy + streaming)
├── content/                 # Injected chat widget
│   ├── content.js
│   ├── chat-widget.html
│   └── chat-widget.css
├── options/                 # Settings page
│   ├── options.html
│   └── options.js
├── utils/                   # Shared modules (content-script scope)
│   ├── api-manager.js
│   ├── constants.js
│   ├── encryption.js
│   ├── markdown-engine.js
│   ├── state-manager.js
│   └── storage-manager.js
├── icons/
├── build.sh / build.bat     # Validation scripts
└── test-extension.html
```

## Coding conventions

- Ship **vanilla JavaScript** (no bundler or framework) to keep the extension
  loadable as-is.
- New shared utilities live in `utils/` and must be listed in `manifest.json`
  under `content_scripts.js` **in dependency order** (constants → … → `content/content.js`).
- Follow the existing file structure and naming.
- Keep the widget's styles scoped inside the Shadow DOM — never leak CSS into the
  host page.
- Escape any user- or model-provided text before injecting it as HTML (XSS safety).
- Prefer small, focused functions and clear names over comments that restate code.
- Remove `console.log` calls that are no longer useful before submitting — keep
  only logs that aid real debugging.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short summary>
```

Common types: `feat`, `fix`, `docs`, `refactor`, `style`, `chore`, `test`.

Examples:
- `feat: add conversation rename`
- `fix: prevent context loss on reload`
- `docs: correct install instructions`

## Pull request process

1. Create a branch off `main` with a descriptive name.
2. Make your change and verify it works via **Load unpacked**.
3. Update `README.md` / `CHANGELOG.md` if your change is user-facing.
4. Ensure your PR description explains **what** changed and **why**, and links any
   related issue (e.g. `Closes #12`).
5. Keep PRs focused — one logical change per PR.

## Reporting security issues

Do **not** open a public issue for security vulnerabilities. See
[SECURITY.md](SECURITY.md).
