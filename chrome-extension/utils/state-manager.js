/**
 * ActNow State Manager
 * Centralized state management with validation and persistence
 */

class StateManager {
    constructor() {
        this.storage = window.ActNowStorage; // Use global storage instance
        this.constants = window.ActNowConstants;
        const DEFAULTS = this.constants.DEFAULTS;

        this.state = {
            isOpen: false,
            isTyping: false,
            messages: [],
            provider: DEFAULTS.PROVIDER,
            apiKey: null,
            openaiApiKey: null,
            openaiBaseUrl: null,
            model: null,
            theme: DEFAULTS.THEME,
            maxTokens: DEFAULTS.MAX_TOKENS,
            temperature: DEFAULTS.TEMPERATURE,
            conversationId: null,
            messageQueue: [],
            isProcessingQueue: false,
            streamingMessageId: null,
            isStreaming: false,
            isResizing: false,
            isDragging: false,
            streamTargetContent: '',
            streamDisplayContent: '',
            chatSize: { width: 380, height: 600 },
            chatPosition: { x: null, y: null },
            resizeStart: { x: 0, y: 0, width: 0, height: 0 },
            dragStart: { x: 0, y: 0 },
            conversationList: [],
            isSidebarOpen: false,
            selectedText: null,
            customChips: []
        };

        this.listeners = new Map();
    }

    get(key) {
        return this.state[key];
    }

    set(key, value, persist = false) {
        if (this.state.hasOwnProperty(key)) {
            const oldValue = this.state[key];
            this.state[key] = value;
            this.notify(key, value, oldValue);

            if (persist) {
                this.persist();
            }
        }
    }

    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
    }

    unsubscribe(key, callback) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).delete(callback);
        }
    }

    notify(key, newValue, oldValue) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(callback => {
                callback(newValue, oldValue);
            });
        }
    }

    async initialize() {
        try {
            const DEFAULTS = this.constants.DEFAULTS;
            const result = await chrome.storage.sync.get([
                'provider', 'apiKey', 'openaiApiKey', 'openaiBaseUrl',
                'model', 'theme', 'maxTokens', 'temperature',
                'enabled', 'customChips', 'autoOpen', 'soundNotifications',
                'chatWidth', 'chatHeight', 'chatPosition'
            ]);

            this.state.provider = result.provider || DEFAULTS.PROVIDER;
            this.state.apiKey = result.apiKey || null;
            this.state.openaiApiKey = result.openaiApiKey || null;
            this.state.openaiBaseUrl = result.openaiBaseUrl || null;
            this.state.model = result.model || DEFAULTS.MODEL;
            this.state.theme = result.theme || DEFAULTS.THEME;
            this.state.maxTokens = result.maxTokens || DEFAULTS.MAX_TOKENS;
            this.state.temperature = result.temperature !== undefined ? result.temperature : DEFAULTS.TEMPERATURE;
            this.state.customChips = result.customChips || [];

            if (result.chatWidth && result.chatHeight) {
                this.state.chatSize = { width: result.chatWidth, height: result.chatHeight };
            }

            if (result.chatPosition) {
                this.state.chatPosition = result.chatPosition;
            }

            await this.loadConversations();
            await this.loadActiveConversation();
        } catch (error) {
            console.error('State initialization error:', error);
        }
    }

    async loadConversations() {
        this.state.conversationList = await this.storage.getConversations();
    }

    async loadActiveConversation() {
        const activeId = await this.storage.getPlain('actnow_active_conversation');
        if (activeId) {
            const conversations = await this.storage.getConversations();
            const active = conversations.find(c => c.id === activeId);
            if (active) {
                this.state.conversationId = activeId;
                this.state.messages = active.messages || [];
            }
        }
    }

    async persist() {
        try {
            const data = {
                provider: this.state.provider,
                apiKey: this.state.apiKey,
                openaiApiKey: this.state.openaiApiKey,
                openaiBaseUrl: this.state.openaiBaseUrl,
                model: this.state.model,
                theme: this.state.theme,
                maxTokens: this.state.maxTokens,
                temperature: this.state.temperature,
                customChips: this.state.customChips,
                chatWidth: this.state.chatSize.width,
                chatHeight: this.state.chatSize.height,
                chatPosition: this.state.chatPosition
            };

            await chrome.storage.sync.set(data);
        } catch (error) {
            console.error('State persistence error:', error);
        }
    }

    async saveConversation(conversation) {
        await this.storage.saveConversation(conversation);
        await this.loadConversations();
        this.notify('conversationList', this.state.conversationList, []);
    }

    async deleteConversation(conversationId) {
        await this.storage.deleteConversation(conversationId);
        await this.loadConversations();
        this.notify('conversationList', this.state.conversationList, []);
    }

    getActiveConversation() {
        if (!this.state.conversationId) return null;
        return this.state.conversationList.find(c => c.id === this.state.conversationId);
    }

    validate() {
        const errors = [];

        if (!this.state.apiKey && !this.state.openaiApiKey) {
            errors.push('API key is required');
        }

        if (!this.state.model) {
            errors.push('Model is required');
        }

        if (this.state.maxTokens < 1 || this.state.maxTokens > 4000) {
            errors.push('Max tokens must be between 1 and 4000');
        }

        if (this.state.temperature < 0 || this.state.temperature > 1) {
            errors.push('Temperature must be between 0 and 1');
        }

        return errors;
    }

    export() {
        return JSON.parse(JSON.stringify(this.state));
    }

    reset() {
        const DEFAULTS = this.constants.DEFAULTS;
        const preserved = {
            conversationId: this.state.conversationId,
            messages: this.state.messages,
            conversationList: this.state.conversationList
        };

        Object.assign(this.state, {
            isOpen: false,
            isTyping: false,
            provider: DEFAULTS.PROVIDER,
            apiKey: null,
            openaiApiKey: null,
            openaiBaseUrl: null,
            model: DEFAULTS.MODEL,
            theme: DEFAULTS.THEME,
            maxTokens: DEFAULTS.MAX_TOKENS,
            temperature: DEFAULTS.TEMPERATURE,
            messageQueue: [],
            isProcessingQueue: false,
            streamingMessageId: null,
            isStreaming: false,
            isResizing: false,
            isDragging: false,
            streamTargetContent: '',
            streamDisplayContent: '',
            chatSize: { width: 380, height: 600 },
            chatPosition: { x: null, y: null },
            resizeStart: { x: 0, y: 0, width: 0, height: 0 },
            dragStart: { x: 0, y: 0 },
            isSidebarOpen: false,
            selectedText: null,
            customChips: []
        }, preserved);
    }
}

window.ActNowState = new StateManager();
