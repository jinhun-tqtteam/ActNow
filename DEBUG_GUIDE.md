# ActNow Extension - Debug Guide

## 🔍 Đã thêm Debug Logging

Extension hiện đã có **logging chi tiết** để giúp debug vấn đề gửi API.

## 📋 Các Bước Debug

### 1. Reload Extension
```
1. Mở chrome://extensions/
2. Tìm "ActNow AI Assistant"
3. Click nút "Reload" (icon hình mũi tên tròn)
```

### 2. Mở Console để Xem Logs
```
1. Mở bất kỳ trang web nào
2. Nhấn F12 để mở DevTools
3. Chuyển sang tab Console
4. Reload trang (F5) để xem logs từ đầu
```

### 3. Kiểm Tra Logs Khởi Tạo

Khi extension load, bạn sẽ thấy các logs này:
```
🎬 ActNow content script loaded
✅ No existing instance, proceeding with initialization
🏁 Checking document ready state: complete
📄 Document already loaded, initializing ActNow immediately...
🚀 ActNow content script initializing...
✅ Host created
📦 Loading settings from storage...
📦 Settings loaded: {hasApiKey: false, model: null, theme: "light"}
✅ State initialized: {hasApiKey: false, model: "anthropic/claude-3.5-sonnet", conversationId: "conv_xxx"}
✅ Message input found, attaching event listeners
✅ Event listeners attached to message input
✅ Send button found, attaching click listener
🔘 Updating send button state: {missingApi: true, missingModel: false, busy: false, disabled: true}
✅ State initialization complete
✅ State initialization started
✅ Runtime listeners setup
✅ ActNow instance ready
💡 Debug commands available:
   window.debugActNow() - Show state info
   window.testActNowMessage("test") - Send a test message
```

### 4. Kiểm Tra Khi Nhập Message

Khi bạn type vào input box:
```
⌨️ Keydown event: Enter shiftKey: false
✅ Enter key pressed, preventing default and calling sendMessage()
🔹 sendMessage() called
📝 Message content: hello
🔑 API Key: Missing
🤖 Model: anthropic/claude-3.5-sonnet
⚙️ State: {isProcessingQueue: false, isStreaming: false}
❌ API Key is missing
```

### 5. Sau Khi Thêm API Key

Logs khi gửi message thành công:
```
🔹 sendMessage() called
📝 Message content: hello
🔑 API Key: Present
🤖 Model: anthropic/claude-3.5-sonnet
⚙️ State: {isProcessingQueue: false, isStreaming: false}
✅ All checks passed, processing message...
🚀 processMessage() started with content: hello
✅ User message added to state
✅ Assistant message placeholder created
📡 Connecting to background script...
✅ Port connected
Sending chat request with model: anthropic/claude-3.5-sonnet
```

Logs từ background script:
```
Background: Received chat completion request
Background: Calling OpenRouter API with model: anthropic/claude-3.5-sonnet
Background: Stream started successfully
Background: Received [DONE], total chunks: 45
```

## 🛠️ Debug Commands

### 1. Xem State Hiện Tại
```javascript
window.debugActNow()
```
Sẽ hiển thị:
- State object (API key, model, messages, etc.)
- Shadow DOM elements
- Input và button elements

### 2. Test Gửi Message
```javascript
window.testActNowMessage("Hello AI!")
```
Sẽ tự động:
- Điền message vào input
- Gọi sendMessage()
- Hiển thị tất cả logs

### 3. Xem Messages Hiện Tại
```javascript
window.ActNowInstance.state.messages
```

### 4. Manual Trigger Send
```javascript
window.ActNowInstance.sendMessage()
```

## 🐛 Common Issues & Solutions

### Issue 1: "API Key is missing"
**Triệu chứng:** Alert box xuất hiện khi nhấn Enter
**Giải pháp:**
1. Click Settings button (icon bánh răng)
2. Nhập OpenRouter API key
3. Click "Save Settings"
4. Thử gửi lại

### Issue 2: "Input element not found"
**Triệu chứng:** Log `❌ Input element not found in shadow DOM`
**Giải pháp:**
1. Reload extension
2. Reload trang web
3. Kiểm tra xem chat widget có hiển thị không

### Issue 3: Không thấy logs
**Triệu chứng:** Console không có logs nào
**Giải pháp:**
1. Đảm bảo Console filter = "All levels"
2. Clear console và reload trang
3. Kiểm tra extension có được enable không

### Issue 4: "Background: API Error"
**Triệu chứng:** Error từ OpenRouter API
**Giải pháp:**
1. Kiểm tra API key còn valid không
2. Kiểm tra account có credits không
3. Thử đổi sang model khác

## 📊 Logging Categories

| Icon | Category | Description |
|------|----------|-------------|
| 🎬 | Init | Script loading |
| 🚀 | Lifecycle | Component initialization |
| ⌨️ | Input | Keyboard events |
| 🖱️ | Click | Mouse clicks |
| 📝 | Data | Message content |
| 🔑 | Auth | API key status |
| 🤖 | Config | Model settings |
| 📡 | Network | API calls |
| ✅ | Success | Completed actions |
| ❌ | Error | Failed operations |
| ⚠️ | Warning | Potential issues |
| 🔍 | Debug | Debug info |
| 🧪 | Test | Test functions |

## 📝 Next Steps

1. **Reload extension** trong chrome://extensions/
2. **Reload trang web** bạn đang test
3. **Mở Console** (F12)
4. **Gõ `window.debugActNow()`** để xem state
5. **Thử gửi message** và xem logs
6. **Report logs** nếu vẫn có lỗi

## 🤝 Báo Lỗi

Khi báo lỗi, copy toàn bộ logs từ Console:
1. Right click trong Console
2. Select "Save as..."
3. Hoặc copy/paste logs vào issue report
