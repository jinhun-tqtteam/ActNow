// Options page script for ActNow AI Assistant

document.addEventListener('DOMContentLoaded', async () => {
    // Load current settings
    await loadSettings();

    // Load statistics
    await loadStatistics();
    
    // Load custom chips
    await loadChips();

    // Set up event listeners
    setupEventListeners();

    // Initial check
    await handleProviderChange();
});

// Load settings from storage
async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get([
            'apiKey', // Legacy/OpenRouter key
            'provider',
            'openaiBaseUrl',
            'openaiApiKey',
            'model',
            'theme',
            'maxTokens',
            'temperature',
            'enabled',
            'autoOpen',
            'soundNotifications'
        ]);

        // Provider
        document.getElementById('provider').value = result.provider || 'openrouter';
        
        // OpenRouter (Legacy apiKey)
        document.getElementById('api-key').value = result.apiKey || '';
        
        // OpenAI
        document.getElementById('openai-base-url').value = result.openaiBaseUrl || 'https://api.openai.com/v1';
        document.getElementById('openai-api-key').value = result.openaiApiKey || '';

        // Other settings
        document.getElementById('theme').value = result.theme || 'light';
        document.getElementById('max-tokens').value = result.maxTokens || 1000;
        document.getElementById('temperature').value = result.temperature || 0.7;
        document.getElementById('temp-value').textContent = result.temperature || 0.7;
        document.getElementById('enabled').checked = result.enabled !== false;
        document.getElementById('auto-open').checked = result.autoOpen === true;
        document.getElementById('sound-notifications').checked = result.soundNotifications === true;

        // Toggle UI based on provider
        toggleProviderUI(result.provider || 'openrouter');

        // Set model after loading models (or set default)
        // We delay model loading slightly to ensure UI is ready
        setTimeout(async () => {
            if (result.apiKey || result.openaiApiKey) {
                await checkApiKeyStatus();
                await loadModels();
            }
            
            if (result.model) {
                const modelSelect = document.getElementById('model');
                // We might need to manually add the option if it wasn't loaded
                if (modelSelect && !modelSelect.querySelector(`option[value="${result.model}"]`)) {
                     const opt = document.createElement('option');
                     opt.value = result.model;
                     opt.textContent = result.model + ' (Saved)';
                     modelSelect.appendChild(opt);
                }
                modelSelect.value = result.model;
            }
        }, 100);

        // Update version
        const manifest = chrome.runtime.getManifest();
        document.getElementById('version').textContent = manifest.version;

    } catch (error) {
        console.error('Failed to load settings:', error);
        showMessage('Failed to load settings', 'error');
    }
}

function toggleProviderUI(provider) {
    const orConfig = document.getElementById('config-openrouter');
    const oaConfig = document.getElementById('config-openai');
    
    // Safety check
    if (!orConfig || !oaConfig) {
        console.error('Config elements not found:', { orConfig, oaConfig });
        return;
    }
    
    if (provider === 'openai') {
        orConfig.style.display = 'none';
        oaConfig.style.display = 'block';
    } else {
        orConfig.style.display = 'block';
        oaConfig.style.display = 'none';
    }
}

async function handleProviderChange() {
    const provider = document.getElementById('provider').value;
    toggleProviderUI(provider);
    
    // Clear status and models when switching
    updateApiStatus('Provider changed - please test key', 'loading');
    document.getElementById('model').innerHTML = '<option value="">Load models to select</option>';
}

function getCurrentConfig() {
    const provider = document.getElementById('provider').value;
    if (provider === 'openai') {
        return {
            provider,
            key: document.getElementById('openai-api-key').value.trim(),
            url: document.getElementById('openai-base-url').value.trim().replace(/\/$/, '') + '/models'
        };
    } else {
        return {
            provider,
            key: document.getElementById('api-key').value.trim(),
            url: 'https://openrouter.ai/api/v1/models'
        };
    }
}


// Chips Management
let editingChipId = null;

async function loadChips() {
    try {
        const result = await chrome.storage.sync.get('customChips');
        let chips = result.customChips;
        
        // Initialize with defaults if empty
        if (!chips || !Array.isArray(chips)) {
            chips = [
                { id: 'def_1', label: 'Summarize', prompt: 'Summarize this text: ' },
                { id: 'def_2', label: 'Explain', prompt: 'Explain this clearly: ' },
                { id: 'def_3', label: 'Fix Grammar', prompt: 'Fix grammar and improve flow: ' }
            ];
            await chrome.storage.sync.set({ customChips: chips });
        }
        
        renderChips(chips);
    } catch (error) {
        console.error('Failed to load chips:', error);
    }
}

function renderChips(chips) {
    const container = document.getElementById('chips-list-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (chips.length === 0) {
        container.innerHTML = '<div style="color: var(--text-secondary); font-style: italic;">No custom chips yet. Add one below!</div>';
        return;
    }
    
    chips.forEach(chip => {
        const chipEl = document.createElement('div');
        chipEl.className = 'chip-item';
        
        // Visual indicator for editing
        if (editingChipId === chip.id) {
            chipEl.style.borderColor = 'var(--neutral-500)';
            chipEl.style.backgroundColor = 'var(--neutral-100)';
        }

        chipEl.innerHTML = `
            <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(chip.label)}</span>
            <div style="display:flex;">
                <button class="chip-edit" title="Edit chip">✎</button>
                <button class="chip-delete" title="Delete chip">×</button>
            </div>
        `;
        
        chipEl.querySelector('.chip-edit').addEventListener('click', () => startEditChip(chip));
        chipEl.querySelector('.chip-delete').addEventListener('click', () => deleteChip(chip.id));
        container.appendChild(chipEl);
    });
}

async function addChip() {
    const labelInput = document.getElementById('new-chip-label');
    const promptInput = document.getElementById('new-chip-prompt');
    const btn = document.getElementById('add-chip-btn');
    
    const label = labelInput.value.trim();
    const prompt = promptInput.value.trim();
    
    if (!label || !prompt) {
        alert('Please enter both label and prompt');
        return;
    }
    
    btn.disabled = true;
    
    try {
        const result = await chrome.storage.sync.get('customChips');
        let chips = result.customChips || [];
        
        if (editingChipId) {
            // Update existing
            const index = chips.findIndex(c => c.id === editingChipId);
            if (index !== -1) {
                chips[index].label = label;
                chips[index].prompt = prompt;
                showMessage('Chip updated successfully', 'success');
            }
        } else {
            // Add new
            const newChip = {
                id: 'chip_' + Date.now(),
                label: label,
                prompt: prompt
            };
            chips.push(newChip);
            showMessage('Chip added successfully', 'success');
        }
        
        await chrome.storage.sync.set({ customChips: chips });
        
        resetChipForm();
        renderChips(chips);
        
        // Notify background
        chrome.runtime.sendMessage({ action: 'chipsUpdated' });
        
    } catch (error) {
        console.error('Failed to save chip:', error);
        showMessage('Failed to save chip', 'error');
    } finally {
        btn.disabled = false;
    }
}

function startEditChip(chip) {
    editingChipId = chip.id;
    
    document.getElementById('new-chip-label').value = chip.label;
    document.getElementById('new-chip-prompt').value = chip.prompt;
    
    document.getElementById('add-chip-btn').textContent = 'Update Chip';
    document.getElementById('cancel-chip-btn').style.display = 'inline-block';
    document.getElementById('chip-form-title').textContent = 'Edit Chip';
    
    // Highlight selected chip
    // Re-render to show selection state
    chrome.storage.sync.get('customChips').then(result => {
        renderChips(result.customChips || []);
    });
}

function cancelEditChip() {
    resetChipForm();
    // Re-render to remove highlight
    chrome.storage.sync.get('customChips').then(result => {
        renderChips(result.customChips || []);
    });
}

function resetChipForm() {
    editingChipId = null;
    document.getElementById('new-chip-label').value = '';
    document.getElementById('new-chip-prompt').value = '';
    
    document.getElementById('add-chip-btn').textContent = 'Add Chip';
    document.getElementById('cancel-chip-btn').style.display = 'none';
    document.getElementById('chip-form-title').textContent = 'Add New Chip';
}

async function deleteChip(id) {
    if (!confirm('Delete this chip?')) return;
    
    try {
        const result = await chrome.storage.sync.get('customChips');
        let chips = result.customChips || [];
        
        chips = chips.filter(c => c.id !== id);
        
        // If we deleted the chip currently being edited, reset form
        if (editingChipId === id) {
            resetChipForm();
        }
        
        await chrome.storage.sync.set({ customChips: chips });
        renderChips(chips);
        
        // Notify background
        chrome.runtime.sendMessage({ action: 'chipsUpdated' });
        
    } catch (error) {
        console.error('Failed to delete chip:', error);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Save settings
async function saveSettings() {
    try {
        const settings = {
            provider: document.getElementById('provider').value,
            // OpenRouter
            apiKey: document.getElementById('api-key').value.trim(),
            // OpenAI
            openaiBaseUrl: document.getElementById('openai-base-url').value.trim(),
            openaiApiKey: document.getElementById('openai-api-key').value.trim(),
            
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
    return testApiKey();
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
        if (input.id === 'provider') return;
        input.addEventListener('change', () => {
            saveSettings();
        });
    });
    
    // Provider change
    const providerSelect = document.getElementById('provider');
    if (providerSelect) {
        providerSelect.addEventListener('change', async () => {
            await handleProviderChange();
            saveSettings();
        });
    }

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

    // API key fields - check status on blur
    const checkAndLoad = async () => {
        await checkApiKeyStatus();
        await loadModels();
    };

    document.getElementById('api-key').addEventListener('blur', checkAndLoad);
    document.getElementById('openai-api-key').addEventListener('blur', checkAndLoad);
    document.getElementById('openai-base-url').addEventListener('blur', checkAndLoad);

    // Clear history
    document.getElementById('clear-history').addEventListener('click', clearHistory);

    // Export/Import
    document.getElementById('export-data').addEventListener('click', exportData);
    document.getElementById('import-data').addEventListener('click', importData);

    // Chips
    document.getElementById('add-chip-btn').addEventListener('click', addChip);
    document.getElementById('cancel-chip-btn').addEventListener('click', cancelEditChip);
}

// API and Model Functions

// Test API key
async function testApiKey() {
    const config = getCurrentConfig();
    const testBtn = document.getElementById('test-api-btn');

    if (!config.key) {
        updateApiStatus('Please enter an API key', 'invalid');
        return;
    }

    testBtn.disabled = true;
    testBtn.textContent = '🔄 Testing...';
    updateApiStatus('Testing API key...', 'loading');

    try {
        const endpoint = config.provider === 'openai' ? config.url : 'https://openrouter.ai/api/v1/models';
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${config.key}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const count = config.provider === 'openai' ? (data.data ? data.data.length : 0) : data.data.length;
            updateApiStatus(`✅ Valid! Found ${count} models`, 'valid');
            await loadModels();
        } else {
            updateApiStatus(`❌ Invalid: ${response.status}`, 'invalid');
        }
    } catch (error) {
        updateApiStatus(`❌ Network error`, 'invalid');
        console.error('API Test error:', error);
    } finally {
        testBtn.disabled = false;
        testBtn.textContent = '🧪 Test API Key';
    }
}

// Load models from API (supports OpenRouter and OpenAI)
async function loadModels() {
    const config = getCurrentConfig();
    const modelSelect = document.getElementById('model');
    const refreshBtn = document.getElementById('refresh-models-btn');
    const modelStatusText = document.getElementById('model-status-text');

    if (!config.key) {
        modelStatusText.textContent = 'Please enter API key first';
        modelSelect.innerHTML = '<option value="">No API key</option>';
        return;
    }

    refreshBtn.disabled = true;
    refreshBtn.textContent = '🔄 Loading...';
    modelStatusText.textContent = 'Loading models...';

    try {
        const response = await fetch(config.url, {
            headers: {
                'Authorization': `Bearer ${config.key}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const models = data.data || [];
            modelSelect.innerHTML = '';

            if (config.provider === 'openai') {
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.id;
                    modelSelect.appendChild(option);
                });
                modelStatusText.textContent = `✅ Loaded ${models.length} OpenAI models`;
            } else {
                const modelGroups = {};
                models.forEach(model => {
                    const provider = model.id.split('/')[0];
                    if (!modelGroups[provider]) {
                        modelGroups[provider] = [];
                    }
                    modelGroups[provider].push(model);
                });

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
            }
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
        refreshBtn.disabled = false;
        refreshBtn.textContent = '🔄 Refresh Models';
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