(function() {
    'use strict';

    console.log('🎬 ActNow content script loaded');

    // Prevent multiple injections
    if (window.ActNowInstance) {
        console.warn('⚠️ ActNow instance already exists, skipping initialization');
        return;
    }

    console.log('✅ No existing instance, proceeding with initialization');

    const DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet';

    class ActNowController {
        constructor() {
            this.shadowRoot = null;
            this.hostElement = null;
            this.port = null;
            
            this.state = {
                isOpen: false,
                isTyping: false,
                messages: [],
                apiKey: null,
                model: null,
                theme: 'light',
                maxTokens: 1000,
                temperature: 0.7,
                conversationId: null,
                messageQueue: [],
                isProcessingQueue: false,
                streamingMessageId: null,
                isStreaming: false,
                isResizing: false,
                isDragging: false,
                chatSize: { width: 380, height: 600 },
                chatPosition: { x: null, y: null }, // null = centered
                resizeStart: { x: 0, y: 0, width: 0, height: 0 },
                dragStart: { x: 0, y: 0, containerX: 0, containerY: 0 }
            };

            this.boundResizeMove = this.handleResizeMove.bind(this);
            this.boundResizeEnd = this.handleResizeEnd.bind(this);
            this.boundDragMove = this.handleDragMove.bind(this);
            this.boundDragEnd = this.handleDragEnd.bind(this);
        }

        async init() {
            console.log('🚀 ActNow content script initializing...');

            // Create Host
            this.createHost();
            console.log('✅ Host created');

            // Initialize State FIRST (loads API key)
            await this.initializeState();
            console.log('✅ State initialization completed');

            // Render Widget AFTER state is loaded
            this.renderWidget();
            console.log('✅ Widget rendered');

            // Setup Runtime Listeners
            this.setupRuntimeListeners();
            console.log('✅ Runtime listeners setup');

            window.ActNowInstance = this;
            
            // Expose debug helpers
            window.debugActNow = () => {
                console.log('🔍 ActNow Debug Info:');
                console.log('State:', this.state);
                console.log('Shadow Root:', this.shadowRoot);
                console.log('Host Element:', this.hostElement);
                console.log('Send Button:', this.shadowRoot.getElementById('actnow-send-btn'));
                console.log('Message Input:', this.shadowRoot.getElementById('actnow-message-input'));
            };
            
            window.testActNowMessage = (msg = 'Hello, test message!') => {
                console.log('🧪 Testing message send with:', msg);
                const input = this.shadowRoot.getElementById('actnow-message-input');
                if (input) {
                    input.value = msg;
                    this.sendMessage();
                } else {
                    console.error('❌ Input not found');
                }
            };
            
            window.testBackgroundConnection = async () => {
                console.log('🧪 Testing background script connection...');
                try {
                    const port = chrome.runtime.connect({ name: 'test-connection' });
                    console.log('✅ Port created successfully');
                    
                    let connectionWorked = false;
                    
                    port.onDisconnect.addListener(() => {
                        if (chrome.runtime.lastError) {
                            console.error('❌ Background script error:', chrome.runtime.lastError);
                        } else {
                            console.log('✅ Background script is running (port disconnected normally)');
                            connectionWorked = true;
                        }
                    });
                    
                    // Give it time to connect and disconnect
                    await new Promise(resolve => setTimeout(resolve, 100));
                    port.disconnect();
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    return connectionWorked;
                } catch (err) {
                    console.error('❌ Failed to connect to background:', err);
                    return false;
                }
            };
            
            console.log('✅ ActNow instance ready');
            console.log('💡 Debug commands available:');
            console.log('   window.debugActNow() - Show state info');
            console.log('   window.testActNowMessage("test") - Send a test message');
            console.log('   window.testBackgroundConnection() - Test background script');
            
            // Test background connection on startup
            setTimeout(() => {
                console.log('🔍 Auto-testing background connection...');
                window.testBackgroundConnection();
            }, 500);
        }

        createHost() {
            this.hostElement = document.createElement('div');
            this.hostElement.id = 'actnow-extension-host';
            // Reset all styles for the host to avoid inheritance issues
            this.hostElement.style.all = 'initial';
            // Ensure z-index is high enough for the host container
            this.hostElement.style.position = 'fixed';
            this.hostElement.style.zIndex = '2147483647';
            this.hostElement.style.bottom = '0';
            this.hostElement.style.right = '0';
            this.hostElement.style.width = '0';
            this.hostElement.style.height = '0';
            this.hostElement.style.overflow = 'visible';

            document.body.appendChild(this.hostElement);

            this.shadowRoot = this.hostElement.attachShadow({ mode: 'open' });
            
            // Inject Styles
            const styleLink = document.createElement('link');
            styleLink.rel = 'stylesheet';
            styleLink.href = chrome.runtime.getURL('content/chat-widget.css');
            this.shadowRoot.appendChild(styleLink);
        }

        renderWidget() {
            const container = document.createElement('div');
            container.innerHTML = `
                <div id="actnow-chat-widget">
                    <!-- Floating chat button -->
                    <div id="actnow-chat-button" class="actnow-chat-button" role="button" aria-expanded="false" aria-controls="actnow-chat-container" tabindex="0">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 2H4C2.9 2 2 2.9 2 4V18C2 19.1 2.9 20 4 20H18L22 24V4C22 2.9 21.1 2 20 2Z" fill="currentColor"/>
                        </svg>
                        <span class="actnow-chat-button-text">Chat</span>
                        <span class="actnow-notification-badge" id="actnow-notification-badge" style="display: none;">1</span>
                    </div>

                    <!-- Chat container -->
                    <div id="actnow-chat-container" class="actnow-chat-container actnow-chat-closed" aria-expanded="false">
                        <!-- Modern Header -->
                        <div id="actnow-chat-header" class="actnow-chat-header">
                            <div class="actnow-header-left">
                                <div class="actnow-bot-avatar">
                                    <div class="actnow-avatar-icon">✨</div>
                                    <div class="actnow-status-dot"></div>
                                </div>
                                <div class="actnow-header-info">
                                    <h3 class="actnow-header-title">ActNow Assistant</h3>
                                    <p class="actnow-header-subtitle">Reply in seconds</p>
                                </div>
                            </div>
                            <div class="actnow-header-actions">
                                <button id="actnow-minimize-btn" class="actnow-icon-btn-modern" title="Minimize">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <!-- Messages area -->
                        <div id="actnow-messages" class="actnow-messages">
                            <!-- Messages will be rendered here dynamically -->
                        </div>

                        <!-- Typing indicator -->
                        <div id="actnow-typing-indicator" class="actnow-typing-indicator" style="display: none;">
                            <span class="actnow-typing-dot"></span>
                            <span class="actnow-typing-dot"></span>
                            <span class="actnow-typing-dot"></span>
                        </div>

                        <!-- Modern Floating Input Area -->
                        <div class="actnow-input-container">
                            <!-- Model Selector -->
                            <div class="actnow-model-selector">
                                <label for="actnow-model-select" class="actnow-model-label">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                        <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                        <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    Model:
                                </label>
                                <select id="actnow-model-select" class="actnow-model-select">
                                    <option value="">Loading models...</option>
                                </select>
                            </div>
                            
                            <div class="actnow-input-area">
                                <div class="actnow-input-wrapper-modern">
                                    <button class="actnow-input-action-btn" title="Attach file">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </button>
                                    <textarea id="actnow-message-input" class="actnow-message-input-modern" placeholder="Type your message..." rows="1"></textarea>
                                    <button id="actnow-send-btn" class="actnow-send-btn-modern" disabled title="Send message">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </button>
                                </div>
                                <div id="actnow-send-hint" class="actnow-send-hint" style="display:none;"></div>
                            </div>
                        </div>

                        <!-- Resize handles - 8 directions -->
                        <div class="actnow-resize-handle actnow-resize-handle-n" data-resize="n"></div>
                        <div class="actnow-resize-handle actnow-resize-handle-s" data-resize="s"></div>
                        <div class="actnow-resize-handle actnow-resize-handle-w" data-resize="w"></div>
                        <div class="actnow-resize-handle actnow-resize-handle-e" data-resize="e"></div>
                        <div class="actnow-resize-handle actnow-resize-handle-nw" data-resize="nw"></div>
                        <div class="actnow-resize-handle actnow-resize-handle-ne" data-resize="ne"></div>
                        <div class="actnow-resize-handle actnow-resize-handle-sw" data-resize="sw"></div>
                        <div class="actnow-resize-handle actnow-resize-handle-se" data-resize="se"></div>
                    </div>
                </div>
            `;
            this.shadowRoot.appendChild(container);
            
            // Setup DOM Events
            this.setupDOMEvents();
        }

        setupDOMEvents() {
            // Helper to get element from Shadow DOM
            const get = (id) => this.shadowRoot.getElementById(id);

            // Chat Toggle
            const chatButton = get('actnow-chat-button');
            const minimizeBtn = get('actnow-minimize-btn');
            
            if (chatButton) chatButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleChat();
            });

            if (chatButton) chatButton.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleChat();
                }
            });

            if (minimizeBtn) minimizeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleChat(false);
            });

            // Settings
            // Model Selector
            const modelSelect = get('actnow-model-select');
            if (modelSelect) {
                modelSelect.addEventListener('change', (e) => {
                    this.state.model = e.target.value;
                    chrome.storage.sync.set({ model: e.target.value });
                    console.log('🤖 Model changed:', e.target.value);
                });
                console.log('✅ Model selector listener attached');
            } else {
                console.error('❌ Model selector not found');
            }
            
            // Load models on init
            console.log('🔄 Loading models...', { hasApiKey: !!this.state.apiKey });
            this.loadModelsToDropdown();

            // Messages
            const messageInput = get('actnow-message-input');
            const sendBtn = get('actnow-send-btn');

            if (messageInput) {
                console.log('✅ Message input found, attaching event listeners');
                messageInput.addEventListener('keydown', (e) => {
                    console.log('⌨️ Keydown event:', e.key, 'shiftKey:', e.shiftKey);
                    if (e.key === 'Enter' && !e.shiftKey) {
                        console.log('✅ Enter key pressed, preventing default and calling sendMessage()');
                        e.preventDefault();
                        e.stopPropagation();
                        this.sendMessage();
                    }
                });
                messageInput.addEventListener('input', () => {
                    this.updateSendButtonState();
                    messageInput.style.height = 'auto';
                    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
                });
                console.log('✅ Event listeners attached to message input');
            } else {
                console.error('❌ Message input element not found in shadow DOM');
            }

            if (sendBtn) {
                console.log('✅ Send button found, attaching click listener');
                sendBtn.addEventListener('click', () => {
                    console.log('🖱️ Send button clicked');
                    this.sendMessage();
                });
            } else {
                console.error('❌ Send button element not found in shadow DOM');
            }

            // Resizing
            const resizeHandles = this.shadowRoot.querySelectorAll('.actnow-resize-handle');
            resizeHandles.forEach(handle => {
                handle.addEventListener('mousedown', (e) => this.handleResizeStart(e));
            });

            // Dragging - TEMPORARILY DISABLED
            // TODO: Fix drag implementation to not break UI
            // const header = get('actnow-chat-header');
            // if (header) {
            //     header.addEventListener('mousedown', (e) => this.handleDragStart(e));
            //     console.log('✅ Drag listener attached to header');
            // } else {
            //     console.error('❌ Header element not found for drag');
            // }
            console.log('⚠️ Drag-to-move temporarily disabled - resize still works');

            // Chips
            // Since chips are dynamic, we might need delegation or re-attach
            const messagesArea = get('actnow-messages');
            if (messagesArea) {
                messagesArea.addEventListener('click', (e) => {
                    const chip = e.target.closest('.actnow-chip');
                    if (chip) {
                        const msg = chip.getAttribute('data-message');
                        const input = get('actnow-message-input');
                        if (input && msg) {
                            input.value = msg;
                            input.dispatchEvent(new Event('input'));
                            input.focus();
                            setTimeout(() => this.sendMessage(), 100);
                        }
                    }
                });
            }
        }

        async initializeState() {
            console.log('📦 Loading settings from storage...');
            const settings = await chrome.storage.sync.get([
                'apiKey', 'model', 'theme', 'maxTokens', 'temperature', 'conversationId', 'chatSize', 'chatPosition'
            ]);

            console.log('📦 Settings loaded:', {
                hasApiKey: !!settings.apiKey,
                model: settings.model,
                theme: settings.theme
            });

            this.state.apiKey = settings.apiKey || null;
            this.state.model = settings.model || DEFAULT_MODEL;
            this.state.theme = settings.theme || 'light';
            this.state.maxTokens = settings.maxTokens || 1000;
            this.state.temperature = settings.temperature || 0.7;
            this.state.conversationId = settings.conversationId || this.generateId('conv');

            console.log('✅ State initialized:', {
                hasApiKey: !!this.state.apiKey,
                model: this.state.model,
                conversationId: this.state.conversationId
            });

            if (!settings.model) {
                await chrome.storage.sync.set({ model: this.state.model });
            }
            
            if (settings.chatSize) {
                this.state.chatSize = settings.chatSize;
            }
            
            if (settings.chatPosition) {
                this.state.chatPosition = settings.chatPosition;
            }
            
            this.applyChatSizeAndPosition();

            this.applyTheme(this.state.theme);
            await this.loadConversation();
            this.updateSendButtonState();
            console.log('✅ State initialization complete');
        }

        setupRuntimeListeners() {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                if (request.action === 'toggleChat') {
                    this.toggleChat();
                } else if (request.action === 'extensionStatusChanged') {
                    if (!request.enabled) {
                        this.hostElement.style.display = 'none';
                    } else {
                        this.hostElement.style.display = 'block';
                    }
                }
            });

            chrome.storage.onChanged.addListener((changes, area) => {
                if (area === 'sync') {
                    if (changes.apiKey) this.state.apiKey = changes.apiKey.newValue;
                    if (changes.model) this.state.model = changes.model.newValue;
                    if (changes.theme) {
                        this.state.theme = changes.theme.newValue;
                        this.applyTheme(this.state.theme);
                    }
                    if (changes.maxTokens) this.state.maxTokens = changes.maxTokens.newValue;
                    if (changes.temperature) this.state.temperature = changes.temperature.newValue;
                    this.updateSendButtonState();
                }
            });
        }

        // Logic Implementation
        toggleChat(forceOpen = null) {
            const container = this.shadowRoot.getElementById('actnow-chat-container');
            const badge = this.shadowRoot.getElementById('actnow-notification-badge');
            const chatButton = this.shadowRoot.getElementById('actnow-chat-button');
            
            if (!container) return;

            const isCurrentlyOpen = container.classList.contains('actnow-chat-open');
            const shouldOpen = forceOpen !== null ? forceOpen : !isCurrentlyOpen;

            if (shouldOpen) {
                container.classList.add('actnow-chat-open');
                container.classList.remove('actnow-chat-closed');
                container.setAttribute('aria-expanded', 'true');
                this.state.isOpen = true;
                if (badge) badge.style.display = 'none';
                if (chatButton) chatButton.setAttribute('aria-expanded', 'true');
                
                setTimeout(() => {
                    const input = this.shadowRoot.getElementById('actnow-message-input');
                    if (input) input.focus();
                }, 100);
            } else {
                container.classList.remove('actnow-chat-open');
                container.classList.add('actnow-chat-closed');
                container.setAttribute('aria-expanded', 'false');
                this.state.isOpen = false;
                if (chatButton) chatButton.setAttribute('aria-expanded', 'false');
            }
        }

        async sendMessage() {
            console.log('🔹 sendMessage() called');
            const input = this.shadowRoot.getElementById('actnow-message-input');
            if (!input) {
                console.error('❌ Input element not found');
                return;
            }

            const content = input.value.trim();
            console.log('📝 Message content:', content);
            console.log('🔑 API Key:', this.state.apiKey ? 'Present' : 'Missing');
            console.log('🤖 Model:', this.state.model);
            console.log('⚙️ State:', {
                isProcessingQueue: this.state.isProcessingQueue,
                isStreaming: this.state.isStreaming
            });

            if (!content) {
                console.warn('⚠️ Empty message, skipping');
                return;
            }

            if (!this.state.apiKey) {
                console.error('❌ API Key is missing');
                alert('Please add your OpenRouter API key in Settings first!');
                return;
            }

            if (!this.state.model) {
                console.error('❌ Model is not selected');
                alert('Please select an AI model in Settings first!');
                return;
            }

            if (this.state.isProcessingQueue || this.state.isStreaming) {
                console.log('⏳ Already processing, adding to queue');
                this.state.messageQueue.push(content);
                input.value = '';
                return;
            }

            console.log('✅ All checks passed, processing message...');
            input.value = '';
            await this.processMessage(content);
        }

        async processMessage(content) {
            console.log('🚀 processMessage() started with content:', content);
            this.state.isProcessingQueue = true;
            this.updateSendButtonState();

            // Add user message
            const userMsg = {
                role: 'user',
                content: content,
                timestamp: Date.now(),
                id: this.generateId('msg')
            };
            this.state.messages.push(userMsg);
            console.log('✅ User message added to state');
            this.renderMessages();
            
            // Show typing indicator
            this.showTypingIndicator();

            // Setup Assistant Message
            const assistantMsg = {
                role: 'assistant',
                content: '',
                timestamp: Date.now(),
                id: this.generateId('msg')
            };
            this.state.messages.push(assistantMsg);
            this.state.streamingMessageId = assistantMsg.id;
            this.state.isStreaming = true;
            console.log('✅ Assistant message placeholder created');
            this.renderMessages();

            try {
                // Use Background Port for API Call
                console.log('📡 Connecting to background script...');
                const port = chrome.runtime.connect({ name: 'actnow-stream' });
                console.log('✅ Port connected');
                
                // Setup listeners BEFORE sending message to avoid race condition
                const streamPromise = new Promise((resolve, reject) => {
                    let hasEnded = false;
                    
                    // Timeout after 30 seconds
                    const timeout = setTimeout(() => {
                        if (!hasEnded) {
                            hasEnded = true;
                            console.error('❌ Request timeout after 30s - no response from background script');
                            reject(new Error('Request timeout - no response from background script. Background script may not be running.'));
                        }
                    }, 30000);
                    
                    let firstChunkReceived = false;
                    
                    port.onMessage.addListener((msg) => {
                        console.log('📨 Received message from background:', msg);
                        if (hasEnded) return;
                        
                        if (msg.error) {
                            hasEnded = true;
                            clearTimeout(timeout);
                            this.hideTypingIndicator();
                            console.error('API Error:', msg.error);
                            reject(new Error(msg.error));
                        } else if (msg.chunk) {
                            // Hide typing indicator on first chunk
                            if (!firstChunkReceived) {
                                firstChunkReceived = true;
                                this.hideTypingIndicator();
                                console.log('✅ First chunk received, hiding typing indicator');
                            }
                            
                            // Append chunk
                            console.log('📦 Chunk received:', msg.chunk.substring(0, 50) + '...');
                            const currentMsg = this.state.messages.find(m => m.id === assistantMsg.id);
                            if (currentMsg) {
                                currentMsg.content += msg.chunk;
                                this.updateStreamingMessageUI(currentMsg);
                            }
                        } else if (msg.done) {
                            hasEnded = true;
                            clearTimeout(timeout);
                            this.hideTypingIndicator();
                            console.log('✅ Stream completed');
                            resolve();
                        }
                    });
                    
                    port.onDisconnect.addListener(() => {
                        console.log('🔌 Port disconnected');
                        if (hasEnded) return;
                        hasEnded = true;
                        clearTimeout(timeout);
                        
                        if (chrome.runtime.lastError) {
                            console.error('Port disconnect error:', chrome.runtime.lastError);
                            reject(new Error(chrome.runtime.lastError.message || 'Connection lost'));
                        } else {
                            console.log('Port closed normally');
                            resolve();
                        }
                    });
                });
                
                // Now send the message after listeners are ready
                console.log('📤 Sending chat request with model:', this.state.model);
                const messagePayload = {
                    action: 'chat_completion',
                    data: {
                        apiKey: this.state.apiKey,
                        model: this.state.model,
                        messages: this.state.messages.slice(0, -1).map(m => ({
                            role: m.role,
                            content: m.content
                        })),
                        maxTokens: this.state.maxTokens,
                        temperature: this.state.temperature
                    }
                };
                console.log('📤 Message payload:', {
                    action: messagePayload.action,
                    messageCount: messagePayload.data.messages.length,
                    model: messagePayload.data.model,
                    hasApiKey: !!messagePayload.data.apiKey
                });
                
                try {
                    port.postMessage(messagePayload);
                    console.log('✅ Message sent to background script, waiting for response...');
                } catch (err) {
                    console.error('❌ Failed to send message to background:', err);
                    throw err;
                }

                await streamPromise;

            } catch (error) {
                console.error('Chat error:', error);
                this.hideTypingIndicator();
                const currentMsg = this.state.messages.find(m => m.id === assistantMsg.id);
                if (currentMsg) {
                    currentMsg.content = `❌ Error: ${error.message}\n\nPlease check:\n• API key is valid\n• Model is available\n• Internet connection is active`;
                }
            } finally {
                this.hideTypingIndicator();
                this.state.isStreaming = false;
                this.state.streamingMessageId = null;
                this.saveConversation();
                this.renderMessages();
                this.state.isProcessingQueue = false;
                this.updateSendButtonState();

                // Process Queue
                if (this.state.messageQueue.length > 0) {
                    const next = this.state.messageQueue.shift();
                    setTimeout(() => this.processMessage(next), 100);
                }
            }
        }

        updateStreamingMessageUI(msg) {
             const msgEl = this.shadowRoot.querySelector(`[data-message-id="${msg.id}"]`);
             if (msgEl) {
                 const contentEl = msgEl.querySelector('.actnow-message-content');
                 if (contentEl) {
                     // Update content with streaming cursor
                     contentEl.innerHTML = this.escapeHtml(msg.content) + '<span class="actnow-streaming-cursor"></span>';
                     this.scrollToBottom();
                 }
             } else {
                 // If element not found, re-render all messages
                 console.warn('⚠️ Streaming message element not found, re-rendering...');
                 this.renderMessages();
             }
        }

        showTypingIndicator() {
            const indicator = this.shadowRoot.getElementById('actnow-typing-indicator');
            if (indicator) {
                indicator.style.display = 'flex';
                console.log('👀 Typing indicator shown');
                this.scrollToBottom();
            }
        }

        hideTypingIndicator() {
            const indicator = this.shadowRoot.getElementById('actnow-typing-indicator');
            if (indicator) {
                indicator.style.display = 'none';
                console.log('👻 Typing indicator hidden');
            }
        }

        renderMessages() {
            const container = this.shadowRoot.getElementById('actnow-messages');
            if (!container) return;

            if (this.state.messages.length === 0) {
                container.innerHTML = this.getWelcomeHTML();
                return;
            }

            container.innerHTML = this.state.messages.map(msg => `
                <div class="actnow-message actnow-message-${msg.role} ${msg.id === this.state.streamingMessageId ? 'actnow-message-streaming' : ''}" data-message-id="${msg.id}">
                    <div class="actnow-message-avatar">${msg.role === 'user' ? '👤' : '✨'}</div>
                    <div class="actnow-message-content-wrapper">
                        <div class="actnow-message-content">
                            ${this.escapeHtml(msg.content)}
                            ${msg.id === this.state.streamingMessageId ? '<span class="actnow-streaming-cursor"></span>' : ''}
                        </div>
                        <div class="actnow-message-time">
                            ${new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                    </div>
                </div>
            `).join('');

            this.scrollToBottom();
        }

        getWelcomeHTML() {
            return `
                <div class="actnow-welcome-message">
                    <div class="actnow-welcome-icon">👋</div>
                    <div class="actnow-welcome-text">
                        <h4>Welcome to ActNow Assistant!</h4>
                        <p>I'm here to help you with any questions.</p>
                    </div>
                </div>
                <div class="actnow-suggested-chips">
                    <button class="actnow-chip" data-message="Summarize this page">📄 Summarize Page</button>
                    <button class="actnow-chip" data-message="Explain key concepts">💡 Explain Concepts</button>
                    <button class="actnow-chip" data-message="Analyze sentiment">📊 Analyze Sentiment</button>
                </div>
            `;
        }

        scrollToBottom() {
            const container = this.shadowRoot.getElementById('actnow-messages');
            if (container) container.scrollTop = container.scrollHeight;
        }

        async saveConversation() {
             await chrome.storage.local.set({
                 ['conversation_' + this.state.conversationId]: this.state.messages
             });
        }

        async loadConversation() {
            const data = await chrome.storage.local.get('conversation_' + this.state.conversationId);
            this.state.messages = data['conversation_' + this.state.conversationId] || [];
            this.renderMessages();
        }
        
        // Drag Logic - Move container
        handleDragStart(e) {
            console.log('🖱️ handleDragStart called, target:', e.target.className);
            
            // Don't drag if clicking on buttons or interactive elements
            if (e.target.closest('button') || 
                e.target.closest('.actnow-icon-btn-modern') ||
                e.target.closest('.actnow-header-actions')) {
                console.log('⏭️ Skipping drag - clicked on button');
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            this.state.isDragging = true;
            
            const container = this.shadowRoot.getElementById('actnow-chat-container');
            const rect = container.getBoundingClientRect();
            
            this.state.dragStart = {
                x: e.clientX,
                y: e.clientY,
                containerX: rect.left,
                containerY: rect.top
            };
            
            document.addEventListener('mousemove', this.boundDragMove);
            document.addEventListener('mouseup', this.boundDragEnd);
            
            // Disable transitions and animations during drag
            container.style.transition = 'none';
            container.style.animation = 'none';
            
            document.body.style.cursor = 'move';
            console.log('✅ Drag started at:', { x: e.clientX, y: e.clientY }, 'containerRect:', rect);
        }

        handleDragMove(e) {
            if (!this.state.isDragging) return;
            
            e.preventDefault();
            
            const deltaX = e.clientX - this.state.dragStart.x;
            const deltaY = e.clientY - this.state.dragStart.y;
            
            let newX = this.state.dragStart.containerX + deltaX;
            let newY = this.state.dragStart.containerY + deltaY;
            
            // Constraints - keep at least 50px visible
            const minVisible = 50;
            const maxX = window.innerWidth - minVisible;
            const maxY = window.innerHeight - minVisible;
            const minX = minVisible - this.state.chatSize.width;
            const minY = minVisible - this.state.chatSize.height;
            
            newX = Math.max(minX, Math.min(newX, maxX));
            newY = Math.max(minY, Math.min(newY, maxY));
            
            // Ensure position is valid
            if (isNaN(newX) || isNaN(newY)) {
                console.error('❌ Invalid position calculated:', { newX, newY });
                return;
            }
            
            this.state.chatPosition = { x: Math.round(newX), y: Math.round(newY) };
            this.applyChatSizeAndPosition();
        }

        handleDragEnd() {
            if (!this.state.isDragging) return;
            
            console.log('🖱️ Drag ended');
            this.state.isDragging = false;
            document.removeEventListener('mousemove', this.boundDragMove);
            document.removeEventListener('mouseup', this.boundDragEnd);
            
            const container = this.shadowRoot.getElementById('actnow-chat-container');
            if (container) {
                container.style.transition = '';
            }
            
            document.body.style.cursor = '';
            
            // Save position
            chrome.storage.sync.set({ chatPosition: this.state.chatPosition });
            console.log('💾 Position saved:', this.state.chatPosition);
        }

        // Resize Logic
        handleResizeStart(e) {
            e.preventDefault();
            e.stopPropagation();
            
            this.state.isResizing = true;
            
            const container = this.shadowRoot.getElementById('actnow-chat-container');
            const rect = container.getBoundingClientRect();
            
            this.state.resizeStart = {
                x: e.clientX,
                y: e.clientY,
                width: this.state.chatSize.width,
                height: this.state.chatSize.height,
                left: rect.left,
                top: rect.top,
                type: e.target.getAttribute('data-resize')
            };
            
            document.addEventListener('mousemove', this.boundResizeMove);
            document.addEventListener('mouseup', this.boundResizeEnd);
            
            container.style.transition = 'none';
            console.log('📏 Resize started:', this.state.resizeStart.type);
        }

        handleResizeMove(e) {
            if (!this.state.isResizing) return;
            
            const deltaX = e.clientX - this.state.resizeStart.x;
            const deltaY = e.clientY - this.state.resizeStart.y;
            
            let newW = this.state.resizeStart.width;
            let newH = this.state.resizeStart.height;
            let newX = this.state.resizeStart.left;
            let newY = this.state.resizeStart.top;
            
            const type = this.state.resizeStart.type;

            // Handle width changes
            if (type.includes('e')) {
                newW = this.state.resizeStart.width + deltaX;
            } else if (type.includes('w')) {
                newW = this.state.resizeStart.width - deltaX;
                newX = this.state.resizeStart.left + deltaX;
            }
            
            // Handle height changes
            if (type.includes('s')) {
                newH = this.state.resizeStart.height + deltaY;
            } else if (type.includes('n')) {
                newH = this.state.resizeStart.height - deltaY;
                newY = this.state.resizeStart.top + deltaY;
            }

            // Constraints
            const minW = 320;
            const minH = 400;
            const maxW = window.innerWidth - 40;
            const maxH = window.innerHeight - 40;
            
            // Apply constraints
            if (newW < minW) {
                if (type.includes('w')) newX = this.state.resizeStart.left + (this.state.resizeStart.width - minW);
                newW = minW;
            } else if (newW > maxW) {
                newW = maxW;
            }
            
            if (newH < minH) {
                if (type.includes('n')) newY = this.state.resizeStart.top + (this.state.resizeStart.height - minH);
                newH = minH;
            } else if (newH > maxH) {
                newH = maxH;
            }

            this.state.chatSize = { width: newW, height: newH };
            if (this.state.chatPosition.x !== null) {
                this.state.chatPosition = { x: newX, y: newY };
            }
            this.applyChatSizeAndPosition();
        }

        handleResizeEnd() {
            if (!this.state.isResizing) return;
            
            this.state.isResizing = false;
            document.removeEventListener('mousemove', this.boundResizeMove);
            document.removeEventListener('mouseup', this.boundResizeEnd);
            
            const container = this.shadowRoot.getElementById('actnow-chat-container');
            if (container) container.style.transition = '';
            
            // Save both size and position
            chrome.storage.sync.set({ 
                chatSize: this.state.chatSize,
                chatPosition: this.state.chatPosition 
            });
            console.log('💾 Size & position saved');
        }

        applyChatSizeAndPosition() {
            const container = this.shadowRoot.getElementById('actnow-chat-container');
            if (!container) {
                console.error('❌ Container not found in applyChatSizeAndPosition');
                return;
            }
            
            // Apply size
            container.style.width = this.state.chatSize.width + 'px';
            container.style.height = this.state.chatSize.height + 'px';
            
            // DRAG DISABLED - Always use default position
            // Default centered position
            container.style.position = 'absolute';
            container.style.top = '50%';
            container.style.right = '56px';
            container.style.left = 'auto';
            container.style.bottom = 'auto';
            container.style.transform = 'translateY(-50%)';
            console.log('📍 Using default centered position (drag disabled)');
        }

        applyChatSize() {
            // Legacy function - redirect to new one
            this.applyChatSizeAndPosition();
        }

        // Model Selector
        async loadModelsToDropdown() {
             const select = this.shadowRoot.getElementById('actnow-model-select');
             if (!select) {
                 console.error('❌ Model select not found');
                 return;
             }
             
             if (!this.state.apiKey) {
                 select.innerHTML = '<option value="">Configure API key in options</option>';
                 console.warn('⚠️ No API key configured');
                 return;
             }
             
             select.innerHTML = '<option value="">Loading models...</option>';
             
             try {
                 const res = await fetch('https://openrouter.ai/api/v1/models', {
                     headers: { Authorization: `Bearer ${this.state.apiKey}` }
                 });
                 
                 if (!res.ok) {
                     throw new Error('Failed to load models');
                 }
                 
                 const data = await res.json();
                 
                 select.innerHTML = '';
                 data.data.sort((a,b) => a.id.localeCompare(b.id)).forEach(model => {
                     const opt = document.createElement('option');
                     opt.value = model.id;
                     opt.textContent = model.name || model.id;
                     select.appendChild(opt);
                 });
                 
                 // Set current model
                 if (this.state.model) {
                     select.value = this.state.model;
                 } else if (select.options.length > 0) {
                     this.state.model = select.options[0].value;
                     select.value = this.state.model;
                     await chrome.storage.sync.set({ model: this.state.model });
                 }
                 
                 console.log(`✅ Loaded ${data.data.length} models`);
                 this.updateSendButtonState();
             } catch (e) {
                 console.error('❌ Error loading models:', e);
                 select.innerHTML = '<option value="">Error loading models</option>';
                 this.updateSendButtonState();
             }
        }

        // Utils
        generateId(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }
        
        escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
        
        applyTheme(theme) {
            const widget = this.shadowRoot.getElementById('actnow-chat-widget');
            if (!widget) return;
            if (theme === 'auto') {
                const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                widget.setAttribute('data-theme', isDark ? 'dark' : 'light');
            } else {
                widget.setAttribute('data-theme', theme);
            }
        }

        updateSendButtonState() {
            const btn = this.shadowRoot.getElementById('actnow-send-btn');
            const hint = this.shadowRoot.getElementById('actnow-send-hint');
            const missingApi = !this.state.apiKey;
            const missingModel = !this.state.model;
            const busy = this.state.isProcessingQueue || this.state.isStreaming;
            const disabled = missingApi || missingModel || busy;

            console.log('🔘 Updating send button state:', {
                missingApi,
                missingModel,
                busy,
                disabled
            });

            if (btn) {
                btn.disabled = disabled;
                // Add loading class when busy
                if (busy) {
                    btn.classList.add('actnow-btn-loading');
                } else {
                    btn.classList.remove('actnow-btn-loading');
                }
            }
            
            if (hint) {
                if (missingApi) {
                    hint.textContent = 'Add your OpenRouter API key to start chatting.';
                    hint.style.display = 'block';
                } else if (missingModel) {
                    hint.textContent = 'Choose an AI model before sending.';
                    hint.style.display = 'block';
                } else if (busy) {
                    hint.textContent = 'AI is thinking...';
                    hint.style.display = 'block';
                } else {
                    hint.style.display = 'none';
                }
            }
        }

    }

    // Init
    console.log('🏁 Checking document ready state:', document.readyState);
    if (document.readyState === 'loading') {
        console.log('📄 Document still loading, waiting for DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 DOMContentLoaded fired, initializing ActNow...');
            new ActNowController().init();
        });
    } else {
        console.log('📄 Document already loaded, initializing ActNow immediately...');
        new ActNowController().init();
    }

})();
