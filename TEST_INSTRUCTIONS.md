# 🧪 Test Instructions - API Request Debug

## ⚠️ QUAN TRỌNG: Xem Background Script Logs

Background script logs **KHÔNG** xuất hiện trong Console của trang web!

### 📋 Cách Xem Background Script Logs:

#### Cách 1: Service Worker Console (Khuyến nghị)
```
1. Mở chrome://extensions/
2. Tìm "ActNow AI Assistant"
3. Click vào link "service worker" (màu xanh)
   - Nếu thấy "Inspect views: service worker (inactive)"
   - Click vào "service worker" để activate và mở console
4. Console mới sẽ mở ra - đây là console của background script
5. Trong console này bạn sẽ thấy logs của background:
   🎬 Background script loaded at ...
   🔧 Setting up event listeners...
   ✅ Background script ready - all listeners attached
```

#### Cách 2: Extension Inspect
```
1. Mở chrome://extensions/
2. Bật "Developer mode" nếu chưa bật
3. Tìm "ActNow AI Assistant"
4. Click "Inspect views: background page" hoặc "service worker"
```

## 🔍 Test Flow Hoàn Chỉnh

### Bước 1: Reload Extension
```
1. chrome://extensions/
2. Click nút Reload ở ActNow extension
3. Đợi 2 giây
```

### Bước 2: Mở 2 Console Tabs

**Tab 1: Background Console**
```
1. chrome://extensions/
2. Click "service worker" link
3. Để tab này mở
```

**Tab 2: Content Script Console**
```
1. Mở bất kỳ trang web nào (hoặc test-extension.html)
2. F12 → Console
```

### Bước 3: Reload Trang Web

Trong **Content Console** bạn sẽ thấy:
```
🎬 ActNow content script loaded
✅ No existing instance, proceeding with initialization
...
🔍 Auto-testing background connection...
🧪 Testing background script connection...
✅ Port created successfully
✅ Background script is running (port disconnected normally)
```

Trong **Background Console** đồng thời sẽ thấy:
```
🔌 Port connected: test-connection
```

### Bước 4: Gửi Message

1. Nhập message vào chat: "Hi"
2. Nhấn Enter

**Trong Content Console:**
```
⌨️ Keydown event: Enter shiftKey: false
✅ Enter key pressed, preventing default and calling sendMessage()
🔹 sendMessage() called
📝 Message content: Hi
🔑 API Key: Present
🤖 Model: openai/o4-mini
✅ All checks passed, processing message...
🚀 processMessage() started with content: Hi
📡 Connecting to background script...
✅ Port connected
📤 Sending chat request with model: openai/o4-mini
📤 Message payload: {action: "chat_completion", messageCount: 1, ...}
✅ Message sent to background script, waiting for response...
```

**Trong Background Console (QUAN TRỌNG):**
```
🔌 Port connected: actnow-stream
✅ ActNow stream port connected, setting up message listener
📨 Background received message: {action: "chat_completion", data: {...}}
✅ Chat completion action detected
Background: Calling OpenRouter API with model: openai/o4-mini
Background: Stream started successfully
[Các chunk đang stream...]
Background: Received [DONE], total chunks: XX
```

### Bước 5: Kiểm Tra Kết Quả

**Nếu THÀNH CÔNG:**
- Content console: `📨 Received message from background`
- Content console: `📦 Chunk received`
- Content console: `✅ Stream completed`
- Background console: Nhiều logs về streaming

**Nếu TIMEOUT (30s không có response):**
- Content console: `❌ Request timeout after 30s - no response from background script`
- Background console: KHÔNG CÓ LOGS GÌ SAU "Port connected"
  → **Background script KHÔNG nhận được message!**

**Nếu API Error:**
- Background console: `Background: API Error: 401` hoặc tương tự
- Content console: `❌ Error: [error message]`

## 🐛 Troubleshooting

### Issue: Background Console Không Có Logs

**Triệu chứng:**
- Content script logs OK
- Không thấy logs trong background console

**Giải pháp:**
```
1. Đảm bảo bạn đang xem đúng console:
   - Không phải Console của trang web
   - Phải là Console của Service Worker

2. Kiểm tra Service Worker có active không:
   chrome://extensions/ → service worker (active)

3. Nếu thấy "inactive":
   - Click vào link "service worker" để wake up
   - Hoặc reload extension

4. Nếu vẫn không có logs:
   - Background script có thể bị crash
   - Check chrome://extensions/ có error icon không
```

### Issue: Service Worker Inactive

Service Workers có thể bị suspend sau 30s không hoạt động.

**Cách Fix:**
```
1. Click vào "service worker" link để wake up
2. Hoặc thêm code để keep alive (nếu cần)
```

### Issue: Port Connected Nhưng Không Nhận Message

**Triệu chứng:**
- Background console: `🔌 Port connected: actnow-stream`
- Nhưng KHÔNG có: `📨 Background received message`

**Nguyên nhân có thể:**
1. Message listener chưa được attach
2. Message format không đúng
3. Service worker bị suspend giữa chừng

**Debug:**
```javascript
// Trong content console:
window.debugActNow()

// Check state
window.ActNowInstance.state
```

## 📊 Expected Logs Timeline

```
Time  | Content Console                          | Background Console
------|------------------------------------------|----------------------------------
0.0s  | 🎬 ActNow content script loaded         | 🎬 Background script loaded
0.1s  | 🚀 ActNow content script initializing   | 🔧 Setting up event listeners
0.5s  | 🔍 Auto-testing background connection   | 
0.6s  | 🧪 Testing background script connection | 🔌 Port connected: test-connection
0.7s  | ✅ Port created successfully            |
------|------------------------------------------|----------------------------------
USER SENDS MESSAGE "Hi"
------|------------------------------------------|----------------------------------
1.0s  | ⌨️ Keydown event: Enter                 |
1.0s  | 🔹 sendMessage() called                 |
1.0s  | ✅ All checks passed                    |
1.0s  | 📡 Connecting to background script      |
1.1s  | ✅ Port connected                       | 🔌 Port connected: actnow-stream
1.1s  | 📤 Sending chat request                 | 📨 Background received message
1.1s  | ✅ Message sent                         | ✅ Chat completion action detected
1.2s  |                                          | Background: Calling OpenRouter API
1.5s  |                                          | Background: Stream started
2.0s  | 📨 Received message from background     |
2.0s  | 📦 Chunk received                       |
...   | 📦 Chunk received                       |
5.0s  | ✅ Stream completed                     | Background: Received [DONE]
```

## 🎯 Next Steps

1. **Reload extension**
2. **Mở 2 console tabs** (background + content)
3. **Gửi message** và so sánh logs với timeline trên
4. **Chụp màn hình** hoặc copy logs nếu vẫn có lỗi
5. **Report** chính xác bước nào trong timeline bị missing logs

## 📸 Screenshot Cần Thiết

Nếu vẫn lỗi, chụp:
1. Background console - toàn bộ logs
2. Content console - toàn bộ logs  
3. chrome://extensions/ - trạng thái extension
4. Network tab (nếu có) - xem có request đến OpenRouter không
