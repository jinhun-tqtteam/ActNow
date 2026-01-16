/**
 * ActNow Storage Manager
 * Handles encrypted storage for sensitive data and conversation management
 */

class StorageManager {
    constructor() {
        this.cache = new Map();
        this.encryption = window.ActNowEncryption;
        this.constants = window.ActNowConstants;
    }

    async encryptAndSet(key, value) {
        try {
            const encrypted = await this.encryption.encrypt(JSON.stringify(value));
            await chrome.storage.local.set({ [key]: encrypted });
            this.cache.set(key, value);
            return true;
        } catch (error) {
            console.error('Storage encryption error:', error);
            return false;
        }
    }

    async getAndDecrypt(key) {
        try {
            if (this.cache.has(key)) {
                return this.cache.get(key);
            }

            const result = await chrome.storage.local.get(key);
            if (!result[key]) return null;

            const decrypted = JSON.parse(await this.encryption.decrypt(result[key]));
            this.cache.set(key, decrypted);
            return decrypted;
        } catch (error) {
            console.error('Storage decryption error:', error);
            return null;
        }
    }

    async remove(key) {
        await chrome.storage.local.remove(key);
        this.cache.delete(key);
    }

    async setPlain(key, value) {
        await chrome.storage.local.set({ [key]: value });
        this.cache.set(key, value);
    }

    async getPlain(key) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        const result = await chrome.storage.local.get(key);
        this.cache.set(key, result[key]);
        return result[key];
    }

    async getConversations() {
        const conversations = await this.getPlain(this.constants.STORAGE_KEYS.CONVERSATIONS);
        if (!conversations) return [];
        return Object.values(conversations);
    }

    async saveConversation(conversation) {
        const conversations = await this.getConversations();
        const existingIndex = conversations.findIndex(c => c.id === conversation.id);

        if (existingIndex >= 0) {
            conversations[existingIndex] = conversation;
        } else {
            conversations.push(conversation);
        }

        await this.enforceConversationLimits(conversations);
    }

    async enforceConversationLimits(conversations) {
        const now = Date.now();
        const maxAge = this.constants.CONVERSATION_LIMITS.AUTO_DELETE_DAYS * 24 * 60 * 60 * 1000;

        conversations = conversations.filter(conv => {
            const age = now - conv.createdAt;
            return age < maxAge;
        });

        conversations.sort((a, b) => b.createdAt - a.createdAt);
        conversations = conversations.slice(0, this.constants.CONVERSATION_LIMITS.MAX_CONVERSATIONS);

        conversations.forEach(conv => {
            if (conv.messages && conv.messages.length > this.constants.CONVERSATION_LIMITS.MAX_MESSAGES_PER_CONVERSATION) {
                conv.messages = conv.messages.slice(-this.constants.CONVERSATION_LIMITS.MAX_MESSAGES_PER_CONVERSATION);
            }
        });

        const conversationMap = {};
        conversations.forEach(conv => {
            conversationMap[conv.id] = conv;
        });

        await this.setPlain(this.constants.STORAGE_KEYS.CONVERSATIONS, conversationMap);
    }

    async deleteConversation(conversationId) {
        const conversations = await this.getPlain(this.constants.STORAGE_KEYS.CONVERSATIONS);
        if (conversations && conversations[conversationId]) {
            delete conversations[conversationId];
            await this.setPlain(this.constants.STORAGE_KEYS.CONVERSATIONS, conversations);
        }
    }

    async clearAllConversations() {
        await this.remove(this.constants.STORAGE_KEYS.CONVERSATIONS);
        await this.remove(this.constants.STORAGE_KEYS.ACTIVE_CONVERSATION);
    }

    async getStorageUsage() {
        const conversations = await this.getConversations();
        const data = JSON.stringify(conversations);
        const sizeInBytes = new Blob([data]).size;
        const sizeInKB = (sizeInBytes / 1024).toFixed(2);

        return {
            conversations: conversations.length,
            totalMessages: conversations.reduce((sum, conv) => sum + (conv.messages?.length || 0), 0),
            sizeInBytes,
            sizeInKB
        };
    }

    clearCache() {
        this.cache.clear();
    }
}

window.ActNowStorage = new StorageManager();
