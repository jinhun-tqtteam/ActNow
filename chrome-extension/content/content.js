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
    const MAX_MESSAGE_QUEUE_SIZE = 5;

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
                chatSize: { width: 380, height: 600 },
                resizeStart: { x: 0, y: 0, width: 0, height: 0 },
                // Conversation Management
                conversationList: [],
                isSidebarOpen: false,
                // Selected Content
                selectedText: null,
                // Custom Chips
                customChips: []
            };

            this.boundResizeMove = this.handleResizeMove.bind(this);
            this.boundResizeEnd = this.handleResizeEnd.bind(this);
            this.boundHandleSelection = this.handleSelection.bind(this);
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
            
            // Initial Render of dynamic content (since initializeState ran before DOM was ready)
            this.renderSidebar();
            this.renderMessages();
            this.renderChips();

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
                    <!-- Floating Chat Button - Glassmorphism Circle -->
                    <div id="actnow-chat-button" class="actnow-chat-button" role="button" aria-expanded="false" aria-controls="actnow-chat-container" tabindex="0">
                        <div style="font-size: 28px;">⚡</div>
                    </div>

                    <!-- Chat Container - Soft Glass Card -->
                    <div id="actnow-chat-container" class="actnow-chat-container actnow-chat-closed" aria-expanded="false">
                        
                        <!-- Sidebar -->
                        <div id="actnow-sidebar" class="actnow-sidebar">
                            <div class="actnow-sidebar-header">
                                <span class="actnow-sidebar-title">History</span>
                            </div>
                            <button id="actnow-new-chat-btn" class="actnow-new-chat-btn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 5V19M5 12H19"/>
                                </svg>
                                New Chat
                            </button>
                            <div id="actnow-conversation-list" class="actnow-conversation-list"></div>
                        </div>
                        <div id="actnow-sidebar-overlay" class="actnow-sidebar-overlay"></div>

                        <!-- Header -->
                        <div id="actnow-chat-header" class="actnow-chat-header">
                            <div class="actnow-header-left">
                                <button id="actnow-sidebar-toggle" class="actnow-sidebar-toggle" title="Conversation History">
                                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                                <div class="actnow-bot-avatar">
                                    <div class="actnow-avatar-icon">⚡</div>
                                    <div class="actnow-status-dot"></div>
                                </div>
                                <div class="actnow-header-info">
                                    <h3 class="actnow-header-title">ActNow AI</h3>
                                    <p class="actnow-header-subtitle">Ready to assist</p>
                                </div>
                            </div>
                            <div class="actnow-header-actions">
                                <button id="actnow-settings-btn" class="actnow-icon-btn-modern" title="Settings">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        <path d="M19.4 15L21 12L19.4 9M12 3V5M12 19V21M4.6 15L3 12L4.6 9M17.65 17.65L19.06 19.06M4.94 4.94L6.35 6.35M6.35 17.65L4.94 19.06M19.06 4.94L17.65 6.35" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                                <button id="actnow-minimize-btn" class="actnow-icon-btn-modern" title="Close chat">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <!-- Messages Area -->
                        <div id="actnow-messages" class="actnow-messages">
                            <!-- Messages rendered dynamically -->
                        </div>
                        
                        <!-- Queue Area -->
                        <div id="actnow-queue-container"></div>

                        <!-- Input Area - Glassmorphism -->
                        <div class="actnow-input-container">
                            <div class="actnow-input-area">
                                <!-- Chips Bar -->
                                <div id="actnow-chips-bar" class="actnow-chips-bar"></div>

                                <!-- Context Preview (Selected Text) -->
                                <div id="actnow-context-preview" class="actnow-context-preview">
                                    <div class="actnow-context-content">
                                        <div class="actnow-context-icon">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            </svg>
                                        </div>
                                        <span class="actnow-context-text" id="actnow-context-text"></span>
                                    </div>
                                    <button class="actnow-context-close" id="actnow-context-close" title="Clear selection">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M18 6L6 18M6 6L18 18"/>
                                        </svg>
                                    </button>
                                </div>

                                <div class="actnow-input-wrapper-modern">
                                    <textarea id="actnow-message-input" class="actnow-message-input-modern" placeholder="Ask me anything..." rows="1"></textarea>
                                    <button id="actnow-send-btn" class="actnow-send-btn-modern" disabled title="Send">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </button>
                                </div>
                                <div id="actnow-send-hint" class="actnow-send-hint" style="display:none;"></div>
                            </div>

                            <!-- Model Selector - Searchable -->
                            <div class="actnow-model-selector">
                                <label class="actnow-model-label">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                        <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                        <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    Model
                                </label>
                                <div class="actnow-model-dropdown" id="actnow-model-dropdown">
                                    <button type="button" class="actnow-model-trigger" id="actnow-model-trigger">
                                        <span class="actnow-model-value" id="actnow-model-value">Select model...</span>
                                        <svg class="actnow-model-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none">
                                            <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </button>
                                    <div class="actnow-model-menu" id="actnow-model-menu">
                                        <div class="actnow-model-search-wrapper">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
                                                <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                            </svg>
                                            <input type="text" class="actnow-model-search" id="actnow-model-search" placeholder="Search models...">
                                        </div>
                                        <div class="actnow-model-list" id="actnow-model-list">
                                            <div class="actnow-model-loading">Loading models...</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Resize Handles -->
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
            const settingsBtn = get('actnow-settings-btn');
            
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
            
            if (settingsBtn) settingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                chrome.runtime.sendMessage({ action: 'openOptionsPage' });
            });

            // Sidebar Events
            const sidebarToggle = get('actnow-sidebar-toggle');
            const sidebarOverlay = get('actnow-sidebar-overlay');
            const newChatBtn = get('actnow-new-chat-btn');

            if (sidebarToggle) sidebarToggle.addEventListener('click', () => this.toggleSidebar());
            if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => this.toggleSidebar(false));
            if (newChatBtn) newChatBtn.addEventListener('click', () => this.createNewConversation());

            // Model Selector - Searchable Dropdown
            this.setupModelDropdown();
            
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

            // Chips
            // Since chips are dynamic, we might need delegation or re-attach
            const messagesArea = get('actnow-messages');
            if (messagesArea) {
                messagesArea.addEventListener('click', (e) => {
                    const chip = e.target.closest('.actnow-chip');
                    if (chip) {
                        const msg = chip.getAttribute('data-message');
                        // Legacy support for welcome chips
                        if (msg) {
                             const input = get('actnow-message-input');
                            if (input) {
                                input.value = msg;
                                input.dispatchEvent(new Event('input'));
                                input.focus();
                                setTimeout(() => this.sendMessage(), 100);
                            }
                        }
                    }
                });
            }
            
            // New Chips Bar Listener
            const chipsBar = get('actnow-chips-bar');
            if (chipsBar) {
                chipsBar.addEventListener('click', (e) => {
                    const chip = e.target.closest('.actnow-chip');
                    if (chip) {
                        const prompt = chip.getAttribute('data-prompt');
                        if (prompt) {
                            const input = get('actnow-message-input');
                            if (input) {
                                const current = input.value;
                                if (current.trim()) {
                                    input.value = prompt + ' ' + current;
                                } else {
                                    input.value = prompt;
                                }
                                input.dispatchEvent(new Event('input'));
                                input.focus();
                                // Send immediately as requested
                                setTimeout(() => this.sendMessage(), 100);
                            }
                        }
                    }
                });
            }

            // Selection Listener (Global)
            const contextClose = get('actnow-context-close');
            if (contextClose) {
                contextClose.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.clearSelection();
                });
            }

            // Listen for selection changes on the main document
            document.addEventListener('mouseup', this.boundHandleSelection);
            document.addEventListener('keyup', (e) => {
                 if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Meta') {
                     // Check selection when modifier keys are released
                     this.handleSelection();
                 }
            });
        }

        handleSelection() {
            // Don't capture selection if interaction is inside the widget
            if (this.hostElement && this.hostElement.contains(document.activeElement)) {
                return;
            }
            // Or if the mouseup target was inside our host
            if (window.event && this.hostElement && this.hostElement.contains(window.event.target)) {
                 return;
            }

            const selection = window.getSelection().toString().trim();
            if (selection && selection.length > 0) {
                console.log('📝 Text selected:', selection.substring(0, 20) + '...');
                this.state.selectedText = selection;
                this.updateContextUI();
            }
        }

        clearSelection() {
            this.state.selectedText = null;
            this.updateContextUI();
        }

        updateContextUI() {
            const preview = this.shadowRoot.getElementById('actnow-context-preview');
            const textEl = this.shadowRoot.getElementById('actnow-context-text');
            
            if (!preview || !textEl) return;

            if (this.state.selectedText) {
                // Format: "Word1 Word2..."
                const words = this.state.selectedText.split(/\s+/);
                const display = words.slice(0, 2).join(' ') + (words.length > 2 ? '...' : '');
                
                textEl.textContent = `Selected: "${display}"`;
                textEl.title = this.state.selectedText; // Tooltip shows full text
                preview.classList.add('visible');
            } else {
                preview.classList.remove('visible');
            }
        }

        async initializeState() {
            console.log('📦 Loading settings from storage...');
            const settings = await chrome.storage.sync.get([
                'apiKey', 'model', 'theme', 'maxTokens', 'temperature', 'conversationId', 'chatSize', 'customChips'
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
            this.state.customChips = settings.customChips || [];
            
            // ISOLATION LOGIC:
            // 1. Try to get ID from sessionStorage (this specific tab's history)
            // 2. If not found, generate a NEW ID
            // 3. We do NOT sync this ID to chrome.storage.sync anymore to prevent hijacking other tabs
            
            let sessionConvId = sessionStorage.getItem('actnow_active_conversation_id');
            
            if (sessionConvId) {
                console.log('🔄 Restored conversation ID from session:', sessionConvId);
                this.state.conversationId = sessionConvId;
            } else {
                this.state.conversationId = this.generateId('conv');
                sessionStorage.setItem('actnow_active_conversation_id', this.state.conversationId);
                console.log('🆕 Generated new session-based conversation ID:', this.state.conversationId);
            }

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
            
            this.applyChatSize();

            this.applyTheme(this.state.theme);
            
            // Load Conversation List
            await this.loadConversationList();
            
            // If we are starting a NEW conversation (not in list), let's pre-register it in the list
            // with the current URL so it appears immediately
            const exists = this.state.conversationList.find(c => c.id === this.state.conversationId);
            if (!exists) {
                 await this.saveConversationList([{
                     id: this.state.conversationId,
                     title: 'New Conversation',
                     timestamp: Date.now(),
                     url: window.location.hostname
                 }, ...this.state.conversationList]); // Keep existing ones
            }

            await this.loadConversation();
            this.updateSendButtonState();
            this.renderChips();
            console.log('✅ State initialization complete');
        }

        renderChips() {
            const container = this.shadowRoot.getElementById('actnow-chips-bar');
            if (!container) return;
            
            const chips = this.state.customChips;
            if (!chips || chips.length === 0) {
                // If no custom chips, show defaults or hide
                 // For now, let's use the defaults if empty, similar to options page
                 const defaults = [
                    { label: 'Summarize', prompt: 'Summarize this text: ' },
                    { label: 'Explain', prompt: 'Explain this clearly: ' },
                    { label: 'Fix Grammar', prompt: 'Fix grammar and improve flow: ' }
                ];
                container.innerHTML = defaults.map(chip => 
                    `<button class="actnow-chip" data-prompt="${this.escapeHtml(chip.prompt)}">${this.escapeHtml(chip.label)}</button>`
                ).join('');
            } else {
                container.innerHTML = chips.map(chip => 
                    `<button class="actnow-chip" data-prompt="${this.escapeHtml(chip.prompt)}">${this.escapeHtml(chip.label)}</button>`
                ).join('');
            }
        }
        
        escapeHtml(text) {
             const div = document.createElement('div');
             div.textContent = text;
             return div.innerHTML;
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
                    if (changes.customChips) {
                        this.state.customChips = changes.customChips.newValue || [];
                        this.renderChips();
                    }
                    
                    // REMOVED: Sync conversation switch logic
                    // We want tabs to be independent unless user manually switches via sidebar

                    this.updateSendButtonState();
                } else if (area === 'local') {
                    // Sync conversation list (shared history)
                    if (changes.conversation_list) {
                        console.log('🔄 Sync: Conversation list updated');
                        this.state.conversationList = changes.conversation_list.newValue || [];
                        this.renderSidebar();
                    }

                    // Sync messages for current conversation
                    const currentConvKey = 'conversation_' + this.state.conversationId;
                    if (changes[currentConvKey]) {
                        console.log('🔄 Sync: Messages updated for current conversation');
                        // Only update if not currently streaming to avoid conflict
                        if (!this.state.isStreaming) {
                             this.state.messages = changes[currentConvKey].newValue || [];
                             this.renderMessages();
                        }
                    }
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
                if (this.state.messageQueue.length >= MAX_MESSAGE_QUEUE_SIZE) {
                    console.warn('⚠️ Message queue full, ignoring message');
                    alert('Please wait for the current response to complete before sending more messages.');
                    return;
                }
                console.log('⏳ Already processing, adding to queue');
                this.state.messageQueue.push(content);
                input.value = '';
                this.renderMessages(); // Immediately render queue UI
                return;
            }

            console.log('✅ All checks passed, processing message...');
            
            // Build Final Message with Context
            let finalContent = content;
            if (this.state.selectedText) {
                finalContent = `Context:\n"""\n${this.state.selectedText}\n"""\n\nQuestion: ${content}`;
                
                // Clear selection UI after sending
                this.clearSelection();
            }

            input.value = '';
            await this.processMessage(finalContent);
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

            // Save immediately so user message persists even if reload happens during stream
            try {
                await this.saveConversation();
            } catch (e) {
                console.warn('⚠️ Context invalidated during initial save:', e);
                return; // Stop processing if extension context is gone
            }

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
                            console.error('API Error:', msg.error);
                            reject(new Error(msg.error));
                        } else if (msg.chunk) {
                            // Hide typing indicator on first chunk (handled by content update)
                            if (!firstChunkReceived) {
                                firstChunkReceived = true;
                                console.log('✅ First chunk received');
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
                const currentMsg = this.state.messages.find(m => m.id === assistantMsg.id);
                if (currentMsg) {
                    currentMsg.content = `❌ Error: ${error.message}\n\nPlease check:\n• API key is valid\n• Model is available\n• Internet connection is active`;
                }
            } finally {
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
                     contentEl.innerHTML = this.formatMessage(msg.content) + '<span class="actnow-streaming-cursor"></span>';
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

            const historyHTML = this.state.messages.map(msg => {
                let contentHTML = '';
                if (msg.role === 'assistant' && msg.id === this.state.streamingMessageId && !msg.content) {
                     // Inline loading indicator
                     contentHTML = `
                        <div class="actnow-inline-loading">
                            <span class="actnow-loading-dot"></span>
                            <span class="actnow-loading-dot"></span>
                            <span class="actnow-loading-dot"></span>
                        </div>
                     `;
                } else {
                     contentHTML = this.formatMessage(msg.content);
                     if (msg.id === this.state.streamingMessageId) {
                         contentHTML += '<span class="actnow-streaming-cursor"></span>';
                     }
                }

                const isUser = msg.role === 'user';
                const avatarIcon = isUser ? '👤' : '⚡';
                const senderName = isUser ? 'You' : 'ActNow AI';

                return `
                <div class="actnow-message actnow-message-${msg.role} ${msg.id === this.state.streamingMessageId ? 'actnow-message-streaming' : ''}" data-message-id="${msg.id}">
                    <div class="actnow-message-content">${contentHTML}</div>
                    <div class="actnow-message-footer-row">
                        <div class="actnow-message-avatar">${avatarIcon}</div>
                        <div class="actnow-message-time">
                            ${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                </div>
            `}).join('');

            // Render Queue
            const queueHTML = this.state.messageQueue.map((content) => {
                return `
                <div class="actnow-message actnow-message-user actnow-message-queued">
                    <div class="actnow-message-content">
                        ${this.formatMessage(content)}
                        <div class="actnow-queue-status">
                            <span class="actnow-queue-icon">⏳</span> Waiting in queue...
                        </div>
                    </div>
                     <div class="actnow-message-footer-row">
                        <div class="actnow-message-avatar" style="opacity:0.5">👤</div>
                    </div>
                </div>
                `;
            }).join('');
            
            // Render Clear Queue Button (if queue exists)
            let clearQueueHTML = '';
            if (this.state.messageQueue.length > 0) {
                 clearQueueHTML = `
                    <div class="actnow-queue-actions">
                        <button id="actnow-clear-queue-btn" class="actnow-btn-small">
                            <span style="font-size: 14px;">⛔</span> Stop & Clear Queue (${this.state.messageQueue.length})
                        </button>
                    </div>
                 `;
            }

            container.innerHTML = historyHTML;
            
            // Render Queue into separate container
            const queueContainer = this.shadowRoot.getElementById('actnow-queue-container');
            if (queueContainer) {
                queueContainer.innerHTML = queueHTML + clearQueueHTML;
                
                // Attach Clear Queue Listener
                const clearBtn = queueContainer.querySelector('#actnow-clear-queue-btn');
                if (clearBtn) {
                    clearBtn.addEventListener('click', () => this.clearQueue());
                }
            }

            this.scrollToBottom();
        }
        
        clearQueue() {
            if (this.state.messageQueue.length === 0) return;
            
            if (confirm('Cancel all pending messages?')) {
                console.log('🛑 Clearing message queue:', this.state.messageQueue.length);
                this.state.messageQueue = [];
                this.renderMessages();
                this.updateSendButtonState();
            }
        }

        getWelcomeHTML() {
            return `
                <div class="actnow-welcome-message">
                    <div class="actnow-welcome-icon">💬</div>
                    <div class="actnow-welcome-text">
                        <h4>Welcome to ActNow AI</h4>
                        <p>Your intelligent assistant ready to help with any task.</p>
                    </div>
                    <div class="actnow-suggested-chips">
                        <button class="actnow-chip" data-message="Summarize this page">Summarize</button>
                        <button class="actnow-chip" data-message="Explain this to me">Explain</button>
                        <button class="actnow-chip" data-message="Help me write">Write</button>
                    </div>
                </div>
            `;
        }

        scrollToBottom() {
            const container = this.shadowRoot.getElementById('actnow-messages');
            if (container) {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }

        async saveConversation() {
             try {
                await chrome.storage.local.set({
                    ['conversation_' + this.state.conversationId]: this.state.messages
                });
             } catch (e) {
                console.warn('⚠️ Failed to save conversation (likely context invalidated):', e);
                return;
             }

             // Update title in list but DO NOT update timestamp or reorder
             const index = this.state.conversationList.findIndex(c => c.id === this.state.conversationId);
             if (index !== -1) {
                 // Removed timestamp update to keep "Creation Time" sorting
                 // this.state.conversationList[index].timestamp = Date.now();
                 
                 // Update title if it's "New Conversation" and we have messages
                 if (this.state.conversationList[index].title === 'New Conversation' && this.state.messages.length > 0) {
                     const firstUserMsg = this.state.messages.find(m => m.role === 'user');
                     if (firstUserMsg) {
                         const title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
                         this.state.conversationList[index].title = title;
                         await this.saveConversationList(this.state.conversationList);
                     }
                 }
                 
                 // Removed reordering logic (splice/unshift)
             }
        }

        async loadConversation() {
            const data = await chrome.storage.local.get('conversation_' + this.state.conversationId);
            this.state.messages = data['conversation_' + this.state.conversationId] || [];
            this.renderMessages();
            this.renderSidebar(); // Update sidebar active state
        }

        // Conversation Management
        async loadConversationList() {
            const data = await chrome.storage.local.get('conversation_list');
            this.state.conversationList = data.conversation_list || [];
            
            // Sort by timestamp descending (Newest Created First)
            this.state.conversationList.sort((a, b) => b.timestamp - a.timestamp);
            
            this.renderSidebar();
        }

        async saveConversationList(list) {
            this.state.conversationList = list;
            await chrome.storage.local.set({ conversation_list: list });
            this.renderSidebar();
        }

        async createNewConversation() {
            const newId = this.generateId('conv');
            const newConv = {
                id: newId,
                title: 'New Conversation',
                timestamp: Date.now(),
                url: window.location.hostname
            };

            // Save current conversation first
            await this.saveConversation();

            // Switch state
            this.state.conversationId = newId;
            // Update session storage
            sessionStorage.setItem('actnow_active_conversation_id', newId);
            
            this.state.messages = [];
            
            // Add to list
            this.state.conversationList.unshift(newConv);
            
            // Save everything
            await this.saveConversationList(this.state.conversationList);
            // Don't sync global ID anymore
            // await chrome.storage.sync.set({ conversationId: newId });
            
            // Render
            this.renderMessages();
            this.toggleSidebar(false); // Close sidebar on mobile/small screens or just for UX
            this.updateSendButtonState();
        }

        async deleteConversation(id, e) {
            if (e) {
                e.stopPropagation();
                e.preventDefault();
            }

            if (!confirm('Are you sure you want to delete this conversation?')) return;

            // Remove from storage
            await chrome.storage.local.remove('conversation_' + id);

            // Remove from list
            const newList = this.state.conversationList.filter(c => c.id !== id);
            await this.saveConversationList(newList);

            // If deleted current conversation, switch to another
            if (id === this.state.conversationId) {
                if (newList.length > 0) {
                    await this.switchConversation(newList[0].id);
                } else {
                    // Create new if all deleted
                    await this.createNewConversation();
                }
            }
        }

        async switchConversation(id) {
            if (id === this.state.conversationId) {
                this.toggleSidebar(false);
                return;
            }

            // Save current
            await this.saveConversation();

            // Update ID
            this.state.conversationId = id;
            sessionStorage.setItem('actnow_active_conversation_id', id);
            // Don't sync global ID anymore
            // await chrome.storage.sync.set({ conversationId: id });

            // Load new
            await this.loadConversation();
            
            // Close sidebar
            if (window.innerWidth < 600) {
                this.toggleSidebar(false);
            }
        }

        toggleSidebar(forceState = null) {
            const sidebar = this.shadowRoot.getElementById('actnow-sidebar');
            const overlay = this.shadowRoot.getElementById('actnow-sidebar-overlay');
            if (!sidebar) return;

            const newState = forceState !== null ? forceState : !this.state.isSidebarOpen;
            this.state.isSidebarOpen = newState;

            if (newState) {
                sidebar.classList.add('open');
                if (overlay) overlay.classList.add('visible');
            } else {
                sidebar.classList.remove('open');
                if (overlay) overlay.classList.remove('visible');
            }
        }

        renderSidebar() {
            const listEl = this.shadowRoot.getElementById('actnow-conversation-list');
            if (!listEl) return;

            if (this.state.conversationList.length === 0) {
                listEl.innerHTML = '<div style="padding:10px;text-align:center;color:var(--text-light)">No conversations</div>';
                return;
            }

            listEl.innerHTML = this.state.conversationList.map(conv => `
                <div class="actnow-conv-item ${conv.id === this.state.conversationId ? 'active' : ''}" data-id="${conv.id}">
                    <div class="actnow-conv-info">
                        <span class="actnow-conv-title">${this.escapeHtml(conv.title)}</span>
                        <span class="actnow-conv-meta">${this.escapeHtml(conv.url || 'Unknown page')}</span>
                    </div>
                    <button class="actnow-conv-delete" title="Delete" data-id="${conv.id}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6L18 18"/>
                        </svg>
                    </button>
                </div>
            `).join('');

            // Attach events
            listEl.querySelectorAll('.actnow-conv-item').forEach(item => {
                item.addEventListener('click', () => this.switchConversation(item.getAttribute('data-id')));
            });

            listEl.querySelectorAll('.actnow-conv-delete').forEach(btn => {
                btn.addEventListener('click', (e) => this.deleteConversation(btn.getAttribute('data-id'), e));
            });
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
            this.applyChatSize();
        }

        handleResizeEnd() {
            if (!this.state.isResizing) return;
            
            this.state.isResizing = false;
            document.removeEventListener('mousemove', this.boundResizeMove);
            document.removeEventListener('mouseup', this.boundResizeEnd);
            
            const container = this.shadowRoot.getElementById('actnow-chat-container');
            if (container) container.style.transition = '';
            
            // Save size
            chrome.storage.sync.set({ chatSize: this.state.chatSize });
            console.log('💾 Size saved');
        }

        applyChatSize() {
            const container = this.shadowRoot.getElementById('actnow-chat-container');
            if (!container) {
                console.error('❌ Container not found in applyChatSize');
                return;
            }
            
            // Apply size only - position is handled by CSS
            container.style.width = this.state.chatSize.width + 'px';
            container.style.height = this.state.chatSize.height + 'px';
        }

        // Model Selector - Searchable Dropdown
        setupModelDropdown() {
            const trigger = this.shadowRoot.getElementById('actnow-model-trigger');
            const menu = this.shadowRoot.getElementById('actnow-model-menu');
            const search = this.shadowRoot.getElementById('actnow-model-search');
            const dropdown = this.shadowRoot.getElementById('actnow-model-dropdown');
            
            if (!trigger || !menu || !search) {
                console.error('❌ Model dropdown elements not found');
                return;
            }
            
            // Toggle dropdown
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isOpen = dropdown.classList.contains('open');
                if (isOpen) {
                    this.closeModelDropdown();
                } else {
                    dropdown.classList.add('open');
                    search.value = '';
                    this.filterModels('');
                    setTimeout(() => search.focus(), 50);
                }
            });
            
            // Search filter
            search.addEventListener('input', (e) => {
                this.filterModels(e.target.value);
            });
            
            // Prevent closing when clicking inside menu
            menu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // Close on outside click
            document.addEventListener('click', () => {
                this.closeModelDropdown();
            });
            
            // Close on escape
            search.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeModelDropdown();
                }
            });
            
            console.log('✅ Model dropdown setup complete');
        }
        
        closeModelDropdown() {
            const dropdown = this.shadowRoot.getElementById('actnow-model-dropdown');
            if (dropdown) {
                dropdown.classList.remove('open');
            }
        }
        
        filterModels(query) {
            const list = this.shadowRoot.getElementById('actnow-model-list');
            if (!list || !this.state.modelsList) return;
            
            const filtered = query 
                ? this.state.modelsList.filter(m => 
                    m.name.toLowerCase().includes(query.toLowerCase()) ||
                    m.id.toLowerCase().includes(query.toLowerCase())
                  )
                : this.state.modelsList;
            
            if (filtered.length === 0) {
                list.innerHTML = '<div class="actnow-model-empty">No models found</div>';
                return;
            }
            
            // Helper to format price: up to 3 decimals, remove trailing zeros
            const fmt = (n) => parseFloat(n.toFixed(3));
            
            list.innerHTML = filtered.map(model => {
                const promptPrice = parseFloat(model.pricing?.prompt || 0) * 1000000;
                const completionPrice = parseFloat(model.pricing?.completion || 0) * 1000000;
                
                return `
                <div class="actnow-model-item ${model.id === this.state.model ? 'selected' : ''}" data-model-id="${model.id}">
                    <div class="actnow-model-row-top">
                        <span class="actnow-model-item-name">${this.escapeHtml(model.name)}</span>
                    </div>
                    <div class="actnow-model-row-bottom">
                         <span class="actnow-model-item-id">${this.escapeHtml(model.id.split('/')[0])}</span>
                         <span class="actnow-model-pricing">
                            <span class="actnow-price-tag" title="Input price per 1M tokens">In: $${fmt(promptPrice)}</span>
                            <span class="actnow-price-tag" title="Output price per 1M tokens">Out: $${fmt(completionPrice)}</span>
                         </span>
                    </div>
                </div>
            `}).join('');
            
            // Add click handlers
            list.querySelectorAll('.actnow-model-item').forEach(item => {
                item.addEventListener('click', () => {
                    const modelId = item.getAttribute('data-model-id');
                    this.selectModel(modelId);
                });
            });
        }
        
        selectModel(modelId) {
            const model = this.state.modelsList?.find(m => m.id === modelId);
            if (!model) return;
            
            this.state.model = modelId;
            chrome.storage.sync.set({ model: modelId });
            
            // Update display
            const valueEl = this.shadowRoot.getElementById('actnow-model-value');
            if (valueEl) {
                valueEl.textContent = model.name;
                valueEl.title = modelId;
            }
            
            this.closeModelDropdown();
            this.updateSendButtonState();
            console.log('🤖 Model selected:', modelId);
        }

        async loadModelsToDropdown() {
            const list = this.shadowRoot.getElementById('actnow-model-list');
            const valueEl = this.shadowRoot.getElementById('actnow-model-value');
            
            if (!list) {
                console.error('❌ Model list not found');
                return;
            }
            
            if (!this.state.apiKey) {
                list.innerHTML = '<div class="actnow-model-empty">Configure API key in settings</div>';
                if (valueEl) valueEl.textContent = 'No API key';
                console.warn('⚠️ No API key configured');
                return;
            }
            
            list.innerHTML = '<div class="actnow-model-loading">Loading models...</div>';
            
            try {
                const res = await fetch('https://openrouter.ai/api/v1/models', {
                    headers: { Authorization: `Bearer ${this.state.apiKey}` }
                });
                
                if (!res.ok) {
                    throw new Error('Failed to load models');
                }
                
                const data = await res.json();
                
                // Store models in state for filtering
                this.state.modelsList = data.data
                    .map(m => ({ 
                        id: m.id, 
                        name: m.name || m.id,
                        pricing: m.pricing
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name));
                
                // Render initial list
                this.filterModels('');
                
                // Set current model display
                if (this.state.model) {
                    const current = this.state.modelsList.find(m => m.id === this.state.model);
                    if (current && valueEl) {
                        valueEl.textContent = current.name;
                        valueEl.title = current.id;
                    }
                } else if (this.state.modelsList.length > 0) {
                    // Select first model by default
                    this.selectModel(this.state.modelsList[0].id);
                }
                
                console.log(`✅ Loaded ${this.state.modelsList.length} models`);
                this.updateSendButtonState();
            } catch (e) {
                console.error('❌ Error loading models:', e);
                list.innerHTML = '<div class="actnow-model-empty">Error loading models</div>';
                if (valueEl) valueEl.textContent = 'Error';
                this.updateSendButtonState();
            }
        }

        // Utils
        generateId(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }
        
        escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        parseMarkdown(text) {
            if (!text) return '';

            // Trim whitespace
            let html = text.trim();
            
            // Escape HTML (basic security) - but wait, we need to process md chars first
            // Actually, best practice is escape first, then restore md chars if needed, OR 
            // process md and ensure output is safe. 
            // Simple approach: Escape everything, then replace patterns.
            html = this.escapeHtml(html);

            // 1. Code Blocks (```...```)
            // Note: We used escapeHtml so newlines are still \n (not <br>)
            // We need to handle this carefully.
            
            // Replace ```code``` with placeholder to prevent other parsing inside
            const codeBlocks = [];
            html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
                codeBlocks.push({ lang, code });
                return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
            });

            // 2. Inline Code (`...`)
            html = html.replace(/`([^`]+)`/g, '<code class="actnow-inline-code">$1</code>');

            // 3. Bold (**...**)
            html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

            // 4. Italic (*...*)
            html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
            
            // 5. Headers (### ...)
            html = html.replace(/^###### (.*$)/gm, '<h6>$1</h6>');
            html = html.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
            html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
            html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
            html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
            html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

            // 6. Lists
            // Unordered
            html = html.replace(/^\s*-\s+(.*$)/gm, '<li>$1</li>');
            // Wrap consecutive lis in ul
            // This regex approach is tricky for multi-line. 
            // Simple fix: if line starts with <li>, wrap in <ul>?
            // Better: use a loop or complex regex. 
            // Let's do a simple pass: replace (<li>.*</li>\n)+ with <ul>...</ul>
            // Since we haven't converted \n to <br> yet, we can match newlines.
            
            // 7. Paragraphs & Newlines
            // Convert double newlines to paragraph breaks or just use <p>
            // We'll replace \n\n with <br><br> for simplicity in chat interface
            // or wrap non-html lines in <p>
            
            // Let's restore code blocks first to avoid messing up formatting
            html = html.replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => {
                const block = codeBlocks[index];
                const langClass = block.lang ? `language-${block.lang}` : '';
                return `<pre class="actnow-code-block"><div class="actnow-code-header"><span>${block.lang || 'Code'}</span></div><code class="${langClass}">${block.code}</code></pre>`;
            });
            
            // Convert newlines to <br> for non-block elements
            // We should not add <br> after block elements (h1-h6, pre, ul, li)
            // This is a bit complex for regex.
            
            // Simplified approach for chat:
            // Just replace \n with <br> EXCEPT when inside or around block tags.
            // But doing it after restoring blocks is hard.
            
            // Let's try to wrap lines.
            
            return html.replace(/\n/g, '<br>');
        }
        
        // Better Markdown Parser (more robust)
        formatMessage(text) {
             if (!text) return '';
             
             // 1. Escape HTML
             let html = this.escapeHtml(text.trim());
             
             // 2. Code Blocks
             const blocks = [];
             html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, content) => {
                 blocks.push({ lang, content });
                 return `__BLOCK_${blocks.length - 1}__`;
             });
             
             // 3. Inline formatting
             html = html
                .replace(/`([^`]+)`/g, '<code class="actnow-inline-code">$1</code>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
             
             // 4. Block formatting (Headers, Lists)
             const lines = html.split('\n');
             let inList = false;
             let processedLines = lines.map(line => {
                 // Headers
                 if (line.match(/^#{1,6}\s/)) {
                     const level = line.match(/^#{1,6}/)[0].length;
                     return `<h${level}>${line.replace(/^#{1,6}\s/, '')}</h${level}>`;
                 }
                 // Lists
                 if (line.match(/^\s*-\s/)) {
                     if (!inList) {
                         inList = true;
                         return '<ul><li>' + line.replace(/^\s*-\s/, '') + '</li>';
                     }
                     return '<li>' + line.replace(/^\s*-\s/, '') + '</li>';
                 } else if (inList) {
                     inList = false;
                     return '</ul>' + line;
                 }
                 return line;
             });
             
             if (inList) processedLines.push('</ul>');
             html = processedLines.join('\n');
             
             // 5. Restore Code Blocks
             html = html.replace(/__BLOCK_(\d+)__/g, (match, id) => {
                 const block = blocks[id];
                 return `<pre class="actnow-code-block"><div class="actnow-code-header">${block.lang || 'text'}</div><code>${block.content}</code></pre>`;
             });
             
             // 6. Final cleanup (Newlines to <br>, but avoid double spacing blocks)
             // Replace \n with <br> only if not followed by block tag
             html = html.replace(/\n/g, '<br>');
             
             // Remove <br> before/after block elements to avoid gaps
             html = html.replace(/<br><(h\d|pre|ul|li)/g, '<$1');
             html = html.replace(/(<\/h\d>|<\/pre>|<\/ul>|<\/li>)<br>/g, '$1');
             
             return html;
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
