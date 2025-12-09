// Options page script for ActNow AI Assistant

document.addEventListener('DOMContentLoaded', async () => {
    // Load current settings
    await loadSettings();

    // Load statistics
    await loadStatistics();

    // Set up event listeners
    setupEventListeners();

    // Check API key status and load models if key exists
    const result = await chrome.storage.sync.get(['apiKey']);
    if (result.apiKey) {
        await checkApiKeyStatus();
        await loadModels();
    }
});

// Load settings from storage
async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get([
            'apiKey',
            'model',
            'theme',
            'maxTokens',
            'temperature',
            'enabled',
            'autoOpen',
            'soundNotifications'
        ]);

        document.getElementById('api-key').value = result.apiKey || '';
        document.getElementById('theme').value = result.theme || 'light';
        document.getElementById('max-tokens').value = result.maxTokens || 1000;
        document.getElementById('temperature').value = result.temperature || 0.7;
        document.getElementById('temp-value').textContent = result.temperature || 0.7;
        document.getElementById('enabled').checked = result.enabled !== false;
        document.getElementById('auto-open').checked = result.autoOpen === true;
        document.getElementById('sound-notifications').checked = result.soundNotifications === true;

        // Set model after loading models (or set default)
        if (result.model) {
            // Wait a bit for models to load
            setTimeout(() => {
                const modelSelect = document.getElementById('model');
                if (modelSelect && modelSelect.querySelector(`option[value="${result.model}"]`)) {
                    modelSelect.value = result.model;
                }
            }, 500);
        }

        // Update version
        const manifest = chrome.runtime.getManifest();
        document.getElementById('version').textContent = manifest.version;

    } catch (error) {
        console.error('Failed to load settings:', error);
        showMessage('Failed to load settings', 'error');
    }
}

// Save settings
async function saveSettings() {
    try {
        const settings = {
            apiKey: document.getElementById('api-key').value.trim(),
            model: document.getElementById('model').value,
            theme: document.getElementById('theme').value,
            maxTokens: parseInt(document.getElementById('max-tokens').value),
            temperature: parseFloat(document.getElementById('temperature').value),
            enabled: document.getElementById('enabled').checked,
            autoOpen: document.getElementById('auto-open').checked,
            soundNotifications: document.getElementById('sound-notifications').checked
        };

        await chrome.storage.sync.set(settings);

        // Notify background script of changes
        chrome.runtime.sendMessage({
            action: 'settingsUpdated',
            settings: settings
        });

        showMessage('Settings saved successfully!', 'success');

        // Check API key status after saving
        await checkApiKeyStatus();

    } catch (error) {
        console.error('Failed to save settings:', error);
        showMessage('Failed to save settings', 'error');
    }
}

// Load usage statistics
async function loadStatistics() {
    try {
        const result = await chrome.storage.local.get(null);

        // Count messages
        let messageCount = 0;
        let conversationIds = new Set();

        Object.keys(result).forEach(key => {
            if (key.startsWith('conversation_')) {
                const conversation = result[key];
                if (Array.isArray(conversation)) {
                    messageCount += conversation.length;
                    conversationIds.add(key);
                }
            }
        });

        document.getElementById('message-count').textContent = messageCount;
        document.getElementById('conversation-count').textContent = conversationIds.size;

        // Calculate storage usage
        const storageSize = new Blob([JSON.stringify(result)]).size;
        const storageKB = (storageSize / 1024).toFixed(2);
        document.getElementById('storage-used').textContent = `${storageKB} KB`;

    } catch (error) {
        console.error('Failed to load statistics:', error);
    }
}

// Check API key validity
async function checkApiKeyStatus() {
    const apiKey = document.getElementById('api-key').value.trim();
    const statusDot = document.getElementById('api-status-dot');
    const statusText = document.getElementById('api-status-text');

    if (!apiKey) {
        statusDot.className = 'status-dot';
        statusText.textContent = 'Not configured';
        return;
    }

    statusDot.className = 'status-dot';
    statusText.textContent = 'Checking...';

    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (response.ok) {
            statusDot.className = 'status-dot valid';
            statusText.textContent = 'Valid API key';
        } else {
            statusDot.className = 'status-dot invalid';
            statusText.textContent = 'Invalid API key';
        }

    } catch (error) {
        statusDot.className = 'status-dot invalid';
        statusText.textContent = 'Could not verify API key';
    }
}

// Clear all conversation history
async function clearHistory() {
    if (!confirm('Are you sure you want to clear all conversation history? This action cannot be undone.')) {
        return;
    }

    try {
        await chrome.storage.local.clear();
        await loadStatistics();
        showMessage('Conversation history cleared successfully', 'success');
    } catch (error) {
        console.error('Failed to clear history:', error);
        showMessage('Failed to clear history', 'error');
    }
}

// Export data
async function exportData() {
    try {
        const syncData = await chrome.storage.sync.get(null);
        const localData = await chrome.storage.local.get(null);

        const exportData = {
            version: chrome.runtime.getManifest().version,
            exportDate: new Date().toISOString(),
            sync: syncData,
            local: localData
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `actnow-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showMessage('Data exported successfully', 'success');

    } catch (error) {
        console.error('Failed to export data:', error);
        showMessage('Failed to export data', 'error');
    }
}

// Import data
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate data structure
            if (!data.sync || !data.local) {
                throw new Error('Invalid backup file format');
            }

            if (!confirm('Importing data will overwrite all current settings and conversations. Continue?')) {
                return;
            }

            // Import data
            await chrome.storage.sync.clear();
            await chrome.storage.local.clear();

            await chrome.storage.sync.set(data.sync);
            await chrome.storage.local.set(data.local);

            // Reload settings and statistics
            await loadSettings();
            await loadStatistics();
            await checkApiKeyStatus();

            showMessage('Data imported successfully', 'success');

        } catch (error) {
            console.error('Failed to import data:', error);
            showMessage('Failed to import data: ' + error.message, 'error');
        }
    };

    input.click();
}

// Show message
function showMessage(text, type) {
    const successEl = document.getElementById('success-message');
    const errorEl = document.getElementById('error-message');

    successEl.style.display = 'none';
    errorEl.style.display = 'none';

    if (type === 'success') {
        successEl.textContent = text;
        successEl.style.display = 'block';
    } else {
        errorEl.textContent = text;
        errorEl.style.display = 'block';
    }

    // Auto hide after 3 seconds
    setTimeout(() => {
        successEl.style.display = 'none';
        errorEl.style.display = 'none';
    }, 3000);
}

// Setup event listeners
function setupEventListeners() {
    // Auto-save on change
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            saveSettings();
        });
    });

    // Temperature slider
    const tempSlider = document.getElementById('temperature');
    const tempValue = document.getElementById('temp-value');
    if (tempSlider && tempValue) {
        tempSlider.addEventListener('input', function() {
            tempValue.textContent = this.value;
        });
    }

    // API test button
    document.getElementById('test-api-btn').addEventListener('click', testApiKey);

    // Refresh models button
    document.getElementById('refresh-models-btn').addEventListener('click', loadModels);

    // API key field - check status on blur and load models if valid
    document.getElementById('api-key').addEventListener('blur', async () => {
        await checkApiKeyStatus();
        const apiKey = document.getElementById('api-key').value.trim();
        if (apiKey) {
            await loadModels();
        }
    });

    // Clear history
    document.getElementById('clear-history').addEventListener('click', clearHistory);

    // Export/Import
    document.getElementById('export-data').addEventListener('click', exportData);
    document.getElementById('import-data').addEventListener('click', importData);
}

// API and Model Functions

// Test API key
async function testApiKey() {
    const apiKey = document.getElementById('api-key').value.trim();
    const testBtn = document.getElementById('test-api-btn');
    const statusDot = document.getElementById('api-status-dot');
    const statusText = document.getElementById('api-status-text');

    if (!apiKey) {
        updateApiStatus('Please enter an API key', 'invalid');
        return;
    }

    // Disable button and show loading
    testBtn.disabled = true;
    testBtn.textContent = '🔄 Testing...';
    updateApiStatus('Testing API key...', 'loading');

    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            updateApiStatus(`✅ Valid! Found ${data.data.length} models`, 'valid');

            // Load models after successful test
            await loadModels();
        } else {
            const error = await response.text();
            updateApiStatus(`❌ Invalid: ${response.status}`, 'invalid');
        }
    } catch (error) {
        updateApiStatus(`❌ Network error`, 'invalid');
        console.error('API Test error:', error);
    } finally {
        // Re-enable button
        testBtn.disabled = false;
        testBtn.textContent = '🧪 Test API Key';
    }
}

// Load models from OpenRouter API
async function loadModels() {
    const apiKey = document.getElementById('api-key').value.trim();
    const modelSelect = document.getElementById('model');
    const refreshBtn = document.getElementById('refresh-models-btn');
    const modelStatusText = document.getElementById('model-status-text');

    if (!apiKey) {
        modelStatusText.textContent = 'Please enter API key first';
        modelSelect.innerHTML = '<option value="">No API key</option>';
        return;
    }

    // Disable button and show loading
    refreshBtn.disabled = true;
    refreshBtn.textContent = '🔄 Loading...';
    modelStatusText.textContent = 'Loading models...';

    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const models = data.data;

            // Clear existing options
            modelSelect.innerHTML = '';

            // Group models by provider
            const modelGroups = {};
            models.forEach(model => {
                const provider = model.id.split('/')[0];
                if (!modelGroups[provider]) {
                    modelGroups[provider] = [];
                }
                modelGroups[provider].push(model);
            });

            // Add models to select
            Object.keys(modelGroups).sort().forEach(provider => {
                const optgroup = document.createElement('optgroup');
                optgroup.label = provider.toUpperCase();

                modelGroups[provider].forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = `${model.name} (${model.pricing?.prompt || 'Free'})`;
                    optgroup.appendChild(option);
                });

                modelSelect.appendChild(optgroup);
            });

            modelStatusText.textContent = `✅ Loaded ${models.length} models from ${Object.keys(modelGroups).length} providers`;
            console.log('Models loaded successfully:', models);

        } else {
            modelStatusText.textContent = `❌ Failed to load models: ${response.status}`;
            modelSelect.innerHTML = '<option value="">Failed to load</option>';
        }
    } catch (error) {
        modelStatusText.textContent = `❌ Network error: ${error.message}`;
        modelSelect.innerHTML = '<option value="">Network error</option>';
        console.error('Model loading error:', error);
    } finally {
        // Re-enable button
        refreshBtn.disabled = false;
        refreshBtn.textContent = '🔄 Refresh Models';
    }
}

// Check API key status
async function checkApiKeyStatus() {
    const apiKey = document.getElementById('api-key').value.trim();
    const statusDot = document.getElementById('api-status-dot');
    const statusText = document.getElementById('api-status-text');

    if (!apiKey) {
        updateApiStatus('Not configured', 'invalid');
        return;
    }

    // Simple validation - check if it looks like an OpenRouter key
    if (apiKey.startsWith('sk-or-v1-')) {
        updateApiStatus('Configured', 'valid');
    } else {
        updateApiStatus('Invalid format', 'invalid');
    }
}

// Update API status display
function updateApiStatus(text, status) {
    const statusDot = document.getElementById('api-status-dot');
    const statusText = document.getElementById('api-status-text');

    statusText.textContent = text;
    statusDot.className = 'status-dot';

    if (status === 'valid') {
        statusDot.classList.add('valid');
    } else if (status === 'invalid') {
        statusDot.classList.add('invalid');
    }
    // 'loading' keeps default gray color
}