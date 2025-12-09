# ActNow AI Assistant - Chrome Extension

A smart Chrome extension that brings an AI-powered chat assistant to every website you visit. Powered by OpenRouter API for access to multiple advanced AI models.

## Features

- 🤖 **Universal Chat**: Works on all websites
- 🎨 **Beautiful UI**: Modern, responsive chat interface
- 🔐 **Secure**: API keys stored locally in your browser
- 💾 **Context Memory**: Remembers conversation history
- 🌓 **Dark/Light Themes**: Multiple theme options
- ⚡ **Fast & Lightweight**: Optimized performance
- 🔧 **Customizable**: Multiple AI models to choose from

## Installation

### Method 1: Developer Mode Installation

1. **Download or clone this repository**:
   ```bash
   git clone https://github.com/yourusername/actnow.git
   cd actnow/chrome-extension
   ```

2. **Add icons**:
   - Create or download three PNG icons:
     - `icon16.png` (16x16 pixels)
     - `icon48.png` (48x48 pixels)
     - `icon128.png` (128x128 pixels)
   - Place them in the `icons/` folder

3. **Open Chrome Extensions page**:
   - Open Chrome browser
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right

4. **Load the extension**:
   - Click "Load unpacked"
   - Select the `chrome-extension` folder
   - The extension should now appear in your extensions list

### Method 2: Install from Chrome Web Store
*(Coming soon)*

## Setup

### 1. Get OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai)
2. Sign up for a free account
3. Navigate to [API Keys](https://openrouter.ai/keys)
4. Create a new API key
5. Copy the key for use in the extension

### 2. Configure the Extension

1. Click the ActNow icon in your browser toolbar
2. Click "Settings" or right-click the extension and select "Options"
3. Enter your OpenRouter API key
4. Choose your preferred AI model
5. Select your theme and other preferences
6. Click "Save Settings"

## Usage

### Starting a Chat

1. Navigate to any website
2. Click the floating chat button in the bottom-right corner
3. Type your message and press Enter or click Send
4. The AI assistant will respond with helpful information

### Chat Features

- **Send messages**: Type your question and press Enter
- **View history**: Scroll through previous messages
- **Settings**: Click the gear icon to access settings
- **Minimize**: Click the minimize button to hide the chat
- **Clear history**: Use Options page to clear all conversations

## Supported AI Models

The extension supports multiple models via OpenRouter:

- **Claude 3.5 Sonnet** (Recommended)
- **Claude 3 Opus**
- **GPT-4o**
- **GPT-4 Turbo**
- **Gemini Pro**
- **Llama 3.1**
- **Mixtral 8x7B**
- And many more...

## Privacy & Security

- ✅ API keys are stored locally in your browser using Chrome's secure storage
- ✅ Conversations are saved locally and never sent to third parties
- ✅ The extension only communicates with OpenRouter API for AI responses
- ✅ No tracking or analytics are collected
- ✅ Open-source code for full transparency

## Troubleshooting

### Extension Not Loading
1. Ensure Developer Mode is enabled in Chrome Extensions
2. Check for errors in the extension details page
3. Try reloading the extension

### API Errors
1. Verify your OpenRouter API key is valid
2. Check your OpenRouter account credits
3. Ensure you have an active internet connection

### Chat Not Appearing
1. Make sure the extension is enabled
2. Try refreshing the webpage
3. Check if the website blocks external scripts

### Performance Issues
1. Clear conversation history from Options page
2. Try switching to a lighter AI model
3. Disable unnecessary features in settings

## Development

### Project Structure

```
chrome-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker
├── content/
│   ├── content.js         # Main content script
│   ├── chat-widget.html   # Chat UI structure
│   ├── chat-widget.js     # Chat functionality
│   └── chat-widget.css    # Chat styles
├── options/
│   ├── options.html       # Settings page
│   └── options.js         # Settings logic
└── icons/
    ├── icon16.png         # 16x16 icon
    ├── icon48.png         # 48x48 icon
    └── icon128.png        # 128x128 icon
```

### Building from Source

1. Install Node.js (optional, for development tools)
2. Edit source files as needed
3. Load extension in Developer Mode
4. Test on various websites

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@actnow.ai
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/actnow/issues)
- 📖 Documentation: [ActNow Docs](https://actnow.ai/docs)

## Changelog

### Version 1.0.0
- Initial release
- Basic chat functionality
- OpenRouter integration
- Settings page
- Dark/Light themes
- Conversation history