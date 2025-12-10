# ActNow AI Assistant

<div align="center">
  <img src="icons/icon128.png" alt="ActNow Logo" width="128" height="128" />
  
  <h3>Your Intelligent AI Companion for the Web</h3>
  
  <p>
    Bring the power of advanced AI models like Claude 3.5 Sonnet, GPT-4o, and Llama 3 directly into your browsing experience. Works universally on any website with a modern, non-intrusive interface.
  </p>

  [Features](#key-features) • [Installation](#installation) • [Configuration](#configuration) • [Usage](#usage) • [Privacy](#privacy--security)
</div>

---

## 📋 Overview

**ActNow** is a Manifest V3 Chrome Extension that injects a powerful, context-aware AI chat assistant into every webpage you visit. Unlike sidebar extensions that squish page content, ActNow uses a floating, resizable glassmorphism widget isolated via Shadow DOM to ensure zero conflict with host website styles.

Powered by **OpenRouter**, it gives you access to practically any LLM (Large Language Model) available today, allowing you to choose the best intelligence for your specific task—whether it's coding help, summarization, or creative writing.

## ✨ Key Features

### 🤖 Universal Intelligence
- **Works Everywhere:** Injects seamlessly into any URL.
- **Model Agnostic:** Switch instantly between Claude 3.5 Sonnet, GPT-4o, Gemini Pro, Mistral, and more via OpenRouter.
- **Streaming Responses:** Real-time token streaming for a snappy, conversational feel.

### 🧠 Context Awareness
- **Smart Selection:** Highlight text on any webpage, and ActNow automatically captures it as context for your next prompt.
- **"Ask about this":** Perfect for explaining complex paragraphs, translating snippets, or debugging code found online.

### 🎨 Modern UI/UX
- **Glassmorphism Design:** Beautiful, neutral aesthetic that blends with any site.
- **Shadow DOM Isolation:** Styles never bleed into or out of the extension.
- **Resizable & Draggable:** Fully customizable window size and position.
- **Collapsible:** Minimized floating bubble when not in use.

### ⚡ Productivity Tools
- **Custom Chips:** Define your own prompt shortcuts (e.g., "Summarize", "Fix Grammar") for one-click actions.
- **Request Queue:** Queue up multiple questions without waiting for the previous response to finish.
- **Markdown Support:** Full rendering of code blocks, lists, and tables.

### 💾 Robust Management
- **Local History:** All conversations are saved locally in your browser.
- **Sidebar Organization:** Manage multiple active conversations.
- **Data Export/Import:** Backup your chat history and settings to JSON.

---

## 🚀 Installation

Currently, ActNow is installed via Chrome's **Developer Mode**.

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/actnow.git
   ```

2. **Prepare the Extension**
   - Navigate to the `chrome-extension` folder.
   - Ensure the `icons` folder contains `icon16.png`, `icon48.png`, and `icon128.png`.

3. **Load into Chrome**
   - Open Chrome and navigate to `chrome://extensions/`.
   - Toggle **Developer mode** in the top right corner.
   - Click **Load unpacked**.
   - Select the `chrome-extension` directory.

---

## ⚙️ Configuration

Before using ActNow, you must configure your AI provider.

### 1. Get an API Key
ActNow uses [OpenRouter](https://openrouter.ai/) to provide access to multiple AI models with a single API key.
1. Go to [OpenRouter.ai](https://openrouter.ai/).
2. Sign up/Log in.
3. Create a new API Key in your dashboard.

### 2. Configure Settings
1. Click the ActNow extension icon in your browser toolbar (or the floating lightning bolt if already visible).
2. Click the **Settings (Gear Icon)** or right-click the extension icon > **Options**.
3. **API Key:** Paste your OpenRouter key and click **Test Key**.
4. **Select Model:** Once verified, select your preferred model (e.g., `anthropic/claude-3.5-sonnet`) from the dropdown.
5. **Customize:** Adjust "Creativity" (Temperature) and "Max Tokens".

### 3. Custom Chips (Shortcuts)
In the Options page, you can create custom "Chips" that appear above the chat input:
- **Label:** What shows on the button (e.g., "Refactor").
- **Prompt:** Text prepended to your message (e.g., "Refactor this code to be more clean and efficient: ").

---

## 📖 Usage Guide

### Basic Chat
1. Click the **Floating Lightning Button** (bottom right) to open.
2. Type your query in the input field.
3. Press **Enter** to send.
4. Press **Shift + Enter** for a new line.

### Using Page Context
1. Highlight any text on the webpage you are viewing.
2. ActNow will show a "Context Preview" above the input bar showing the selected text.
3. Type your question (e.g., "Explain this").
4. The AI will receive your question *plus* the selected text as context.

### Managing Conversations
- **New Chat:** Click the "+" icon or "New Chat" button in the sidebar.
- **History:** Click the "Menu" icon (top left of chat) to open the sidebar and view past conversations.
- **Delete:** Use the trash icon in the sidebar to remove specific conversations.

### Window Management
- **Resize:** Drag any edge or corner of the chat window to resize it.
- **Minimize:** Click the down arrow or the floating bubble to minimize.

---

## 🏗️ Technical Architecture

### Structure
- **Manifest V3:** Uses modern Chrome extension standards for better security and performance.
- **Service Worker (`background.js`):** Handles API communication (to avoid CORS issues in content scripts) and manages the streaming connection.
- **Content Script (`content.js`):** The heavy lifter. Injects the Shadow DOM host, manages UI state, handles drag/resize logic, and captures user events.
- **Storage:** Uses `chrome.storage.local` for heavy chat history and `chrome.storage.sync` for settings (API keys, preferences).

### Data Flow
1. User types message -> `content.js`
2. Message sent via Runtime Port -> `background.js`
3. `background.js` calls OpenRouter API (Stream enabled)
4. Chunks received -> forwarded via Port -> `content.js`
5. UI updates in real-time.

---

## 🔒 Privacy & Security

ActNow is designed with a **privacy-first** approach:

- **Local Storage:** Your chat history and conversations are stored *only* in your browser's local storage. They are never sent to any remote server (other than the AI provider for processing).
- **Direct API Calls:** Your prompts are sent directly from your browser to OpenRouter. No middleman servers.
- **API Key Safety:** Your API key is stored in Chrome's secure sync storage.
- **No Analytics:** The extension contains no tracking or analytics scripts.

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
