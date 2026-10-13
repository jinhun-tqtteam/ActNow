/**
 * ActNow API Manager
 * Handles all API communications with streaming support
 */

class APIManager {
    constructor() {
        this.port = null;
        this.requestId = 0;
        this.pendingRequests = new Map();
        this.constants = window.ActNowConstants;
    }

    connect() {
        if (this.port) return;

        this.port = chrome.runtime.connect({ name: 'actnow-stream' });

        this.port.onMessage.addListener((msg) => {
            const callback = this.pendingRequests.get(this.requestId);
            if (callback) {
                callback(msg);
            }
        });

        this.port.onDisconnect.addListener(() => {
            console.log('Port disconnected');
            this.port = null;
        });
    }

    async sendChatCompletion(params, onChunk, onDone, onError) {
        if (!this.port) {
            this.connect();
        }

        this.requestId++;
        const id = this.requestId;

        const { provider, endpoint, apiKey, model, messages, maxTokens, temperature } = params;

        this.pendingRequests.set(id, (msg) => {
            if (msg.error) {
                onError(msg.error);
                this.pendingRequests.delete(id);
            } else if (msg.done) {
                onDone();
                this.pendingRequests.delete(id);
            } else if (msg.chunk) {
                onChunk(msg.chunk);
            }
        });

        try {
            this.port.postMessage({
                action: 'chat_completion',
                data: {
                    provider,
                    endpoint,
                    apiKey,
                    model,
                    messages,
                    maxTokens,
                    temperature
                }
            });
        } catch (error) {
            onError(error.message);
            this.pendingRequests.delete(id);
        }
    }

    async loadModels(apiKey, provider = 'openrouter', baseUrl = null) {
        try {
            let url;

            if (provider === 'openai' && baseUrl) {
                url = `${baseUrl}/models`;
            } else {
                url = 'https://openrouter.ai/api/v1/models';
            }

            const headers = {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            };

            const response = await fetch(url, { headers });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Failed to load models:', error);
            throw error;
        }
    }

    async testApiKey(apiKey, provider = 'openrouter', baseUrl = null) {
        try {
            await this.loadModels(apiKey, provider, baseUrl);
            return true;
        } catch (error) {
            return false;
        }
    }

    disconnect() {
        if (this.port) {
            this.port.disconnect();
            this.port = null;
        }
        this.pendingRequests.clear();
    }
}

window.ActNowAPI = new APIManager();
