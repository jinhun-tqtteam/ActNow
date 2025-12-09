// Background Service Worker for ActNow AI Assistant

console.log('🎬 Background script loaded at', new Date().toISOString());
console.log('🔧 Setting up event listeners...');

let extensionEnabled = true;

// Initialize extension
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('📦 Extension installed/updated:', details.reason);
    if (details.reason === 'install') {
        // Set default settings on first install
        await chrome.storage.sync.set({
            enabled: true,
            model: 'anthropic/claude-3.5-sonnet',
            theme: 'light'
        });

        // Open options page on first install
        chrome.runtime.openOptionsPage();
    }
});

// Handle extension toggle and status
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleExtension') {
        extensionEnabled = !extensionEnabled;
        chrome.storage.sync.set({ enabled: extensionEnabled });
        sendResponse({ enabled: extensionEnabled });
    } else if (request.action === 'getExtensionStatus') {
        sendResponse({ enabled: extensionEnabled });
    }
    // Return true to indicate we might send a response asynchronously (though not used here)
    return true;
});

// Handle streaming chat requests via Port
chrome.runtime.onConnect.addListener((port) => {
    console.log('🔌 Port connected:', port.name);
    
    if (port.name === 'actnow-stream') {
        console.log('✅ ActNow stream port connected, setting up message listener');
        
        port.onMessage.addListener(async (msg) => {
            console.log('📨 Background received message:', msg);
            
            if (msg.action === 'chat_completion') {
                console.log('✅ Chat completion action detected');
                try {
                    const { apiKey, model, messages, maxTokens, temperature } = msg.data;

                    if (!apiKey) {
                        port.postMessage({ error: 'API key is missing' });
                        return;
                    }

                    if (!model) {
                        port.postMessage({ error: 'Model is not selected' });
                        return;
                    }

                    if (!messages || messages.length === 0) {
                        port.postMessage({ error: 'No messages to send' });
                        return;
                    }

                    console.log('Background: Calling OpenRouter API with model:', model);
                    
                    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                            'HTTP-Referer': 'https://actnow.ai',
                            'X-Title': 'ActNow AI Assistant'
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: messages,
                            max_tokens: maxTokens,
                            temperature: temperature,
                            stream: true
                        })
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Background: API Error:', response.status, errorText);
                        let errorMessage = `API Error: ${response.status} ${response.statusText}`;
                        
                        try {
                            const errorJson = JSON.parse(errorText);
                            if (errorJson.error?.message) {
                                errorMessage = errorJson.error.message;
                            }
                        } catch (e) {
                            // Use default error message
                        }
                        
                        port.postMessage({ error: errorMessage });
                        return;
                    }

                    console.log('Background: Stream started successfully');

                    const reader = response.body?.getReader();
                    if (!reader) {
                        port.postMessage({ error: 'No response body' });
                        return;
                    }

                    const decoder = new TextDecoder();
                    let buffer = '';
                    let chunkCount = 0;

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            console.log(`Background: Stream ended, received ${chunkCount} chunks`);
                            port.postMessage({ done: true });
                            break;
                        }

                        buffer += decoder.decode(value, { stream: true });
                        const segments = buffer.split('\n\n');
                        buffer = segments.pop() || '';

                        for (const segment of segments) {
                            const lines = segment.split('\n');
                            for (const line of lines) {
                                const trimmed = line.trim();
                                if (!trimmed || typeof trimmed !== 'string' || !trimmed.startsWith('data:')) continue;
                                const dataStr = trimmed.replace(/^data:\s*/, '');
                                if (dataStr === '[DONE]') {
                                    console.log(`Background: Received [DONE], total chunks: ${chunkCount}`);
                                    port.postMessage({ done: true });
                                    return;
                                }
                                try {
                                    const json = JSON.parse(dataStr);
                                    const delta = json?.choices?.[0]?.delta?.content;
                                    if (delta) {
                                        chunkCount++;
                                        port.postMessage({ chunk: delta });
                                    }
                                } catch (err) {
                                    console.error('Background: Stream parse error:', err, 'Data:', dataStr);
                                    // Don't send error for every parse issue, continue streaming
                                }
                            }
                        }
                    }

                } catch (error) {
                    console.error('Background: Request error:', error);
                    port.postMessage({ error: error.message || 'Unknown error occurred' });
                }
            }
        });
    }
});

// Handle storage changes
chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'sync' && changes.enabled) {
        extensionEnabled = changes.enabled.newValue;

        // Notify all tabs about the change
        const tabs = await chrome.tabs.query({});
        tabs.forEach(tab => {
            if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'extensionStatusChanged',
                    enabled: extensionEnabled
                }).catch(() => {
                    // Ignore errors if content script is not loaded
                });
            }
        });
    }
});

// Context menu for quick actions
chrome.runtime.onInstalled.addListener(() => {
    console.log('📋 Creating context menu items...');
    if (chrome.contextMenus) {
        chrome.contextMenus.create({
            id: 'actnow-toggle-chat',
            title: 'Toggle ActNow Chat',
            contexts: ['page']
        }, () => {
            if (chrome.runtime.lastError) {
                console.log('Context menu creation error (may already exist):', chrome.runtime.lastError.message);
            } else {
                console.log('✅ Context menu created successfully');
            }
        });
    }
});

if (chrome.contextMenus) {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === 'actnow-toggle-chat') {
            console.log('📋 Context menu clicked: toggle chat');
            // Send message to content script to toggle chat
            chrome.tabs.sendMessage(tab.id, {
                action: 'toggleChat'
            }).catch(() => {
                console.log('Could not toggle chat - content script not loaded');
            });
        }
    });
}

console.log('✅ Background script ready - all listeners attached');
console.log('💡 Background script is running and waiting for connections...');