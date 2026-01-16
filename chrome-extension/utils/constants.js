/**
 * ActNow AI Assistant - Constants
 * Centralized configuration and magic numbers
 */

window.ActNowConstants = {};

// Z-Index Levels
window.ActNowConstants.Z_INDEX = {
    EXTENSION_HOST: 2147483647,
    FLOATING_BUTTON: 2147483646,
    CHAT_CONTAINER: 2147483645,
    DROPDOWN: 2147483644,
    MODAL: 2147483647
};

// Default Chat Dimensions
window.ActNowConstants.CHAT_SIZE = {
    WIDTH: 380,
    HEIGHT: 600,
    MIN_WIDTH: 340,
    MIN_HEIGHT: 450,
    MAX_WIDTH_PERCENT: 90,
    MAX_HEIGHT_PERCENT: 95
};

// Floating Button
window.ActNowConstants.FLOATING_BUTTON = {
    SIZE: 56,
    POSITION: { bottom: 30, right: 30 }
};

// Conversation Limits
window.ActNowConstants.CONVERSATION_LIMITS = {
    MAX_CONVERSATIONS: 50,
    MAX_MESSAGES_PER_CONVERSATION: 200,
    AUTO_DELETE_DAYS: 30
};

// Message Queue
window.ActNowConstants.MESSAGE_QUEUE = {
    MAX_SIZE: 5,
    CHUNK_DELAY: 10
};

// Streaming
window.ActNowConstants.STREAMING = {
    CHUNK_BUFFER_SIZE: 5,
    TYPING_SPEED: 10,
    BLINK_INTERVAL: 500
};

// Animation Timings (ms)
window.ActNowConstants.ANIMATION = {
    FAST: 150,
    NORMAL: 200,
    SLOW: 400,
    TRANSITION: 'cubic-bezier(0.4, 0, 0.2, 1)'
};

// Storage Keys
window.ActNowConstants.STORAGE_KEYS = {
    CONVERSATIONS: 'actnow_conversations',
    ACTIVE_CONVERSATION: 'actnow_active_conversation',
    ENABLED: 'actnow_enabled',
    THEME: 'actnow_theme'
};

// Default Values
window.ActNowConstants.DEFAULTS = {
    MODEL: 'anthropic/claude-3.5-sonnet',
    THEME: 'light',
    MAX_TOKENS: 1000,
    TEMPERATURE: 0.7,
    PROVIDER: 'openrouter'
};

// API Configuration
window.ActNowConstants.API = {
    OPENROUTER_URL: 'https://openrouter.ai/api/v1/chat/completions',
    OPENAI_DEFAULT_URL: 'https://api.openai.com/v1',
    REFERER: 'https://actnow.ai',
    APP_TITLE: 'ActNow AI Assistant'
};

// Debounce Intervals (ms)
window.ActNowConstants.DEBOUNCE = {
    INPUT: 300,
    RESIZE: 100,
    SCROLL: 100,
    SELECTION: 200
};

// Event Names
window.ActNowConstants.EVENTS = {
    TOGGLE_CHAT: 'toggleChat',
    EXTENSION_STATUS_CHANGED: 'extensionStatusChanged',
    MESSAGE_QUEUED: 'messageQueued',
    CONVERSATION_UPDATED: 'conversationUpdated'
};
