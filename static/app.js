// ===========================
// API Configuration
// ===========================
const API_BASE = '/api';
const REFRESH_INTERVAL = 2000;

// ===========================
// State Management
// ===========================
let commands = [];
let executions = [];
let refreshTimer = null;
let selectedExecutionId = null;
let commandSearchQuery = '';

// ===========================
// Initialization
// ===========================
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    if (!isAuthenticated()) {
        redirectToLogin();
        return;
    }

    // Check if setup is needed
    const needsSetup = await checkSetup();
    if (needsSetup) {
        redirectToSetup();
        return;
    }

    // Load current user
    loadCurrentUser();

    setupEventListeners();
    loadCommands();
    loadExecutions();
    startAutoRefresh();
});

// ===========================
// Event Listeners
// ===========================
function setupEventListeners() {
    document.getElementById('executeForm').addEventListener('submit', handleQuickExecute);
    document.getElementById('addCommandBtn').addEventListener('click', openAddCommandModal);
    document.getElementById('commandForm').addEventListener('submit', handleSaveCommand);
    document.getElementById('clearHistoryBtn').addEventListener('click', handleClearHistory);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('commandSearch').addEventListener('input', handleCommandSearch);

    document.getElementById('commandModal').addEventListener('click', (e) => {
        if (e.target.id === 'commandModal') closeCommandModal();
    });
}

// ===========================
// API Functions
// ===========================
async function apiRequest(endpoint, options = {}) {
    const authHeader = getAuthHeader();
    if (!authHeader) {
        redirectToLogin();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
                ...options.headers,
            },
            ...options,
        });

        if (response.status === 401) {
            clearAuthCredentials();
            redirectToLogin();
            return;
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Request failed');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        alert(`Error: ${error.message}`);
        throw error;
    }
}

async function executeCommand(workdir, command, commandId = null) {
    const endpoint = commandId ? `/commands/${commandId}/execute` : '/execute';
    return await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ workdir, command }),
    });
}

async function createCommand(commandData) {
    return await apiRequest('/commands', {
        method: 'POST',
        body: JSON.stringify(commandData),
    });
}

async function updateCommand(id, commandData) {
    return await apiRequest(`/commands/${id}`, {
        method: 'PUT',
        body: JSON.stringify(commandData),
    });
}

async function deleteCommand(id) {
    return await apiRequest(`/commands/${id}`, {
        method: 'DELETE',
    });
}

async function getCommands() {
    return await apiRequest('/commands');
}

async function getExecutions() {
    return await apiRequest('/executions');
}

async function getExecution(id) {
    return await apiRequest(`/executions/${id}`);
}

async function clearAllExecutions() {
    return await apiRequest('/executions/clear', {
        method: 'POST',
    });
}

// ===========================
// Authentication
// ===========================
async function loadCurrentUser() {
    try {
        const user = await apiRequest('/auth/me');
        document.getElementById('currentUser').textContent = `👤 ${user.username}`;
    } catch (error) {
        console.error('Failed to load current user:', error);
    }
}

// ===========================
// Load Data
// ===========================
async function loadCommands() {
    try {
        commands = await apiRequest('/commands');
        renderCommands();
    } catch (error) {
        console.error('Failed to load commands:', error);
    }
}

// Handle command search
function handleCommandSearch(e) {
    commandSearchQuery = e.target.value.toLowerCase().trim();
    renderCommands();
}

async function loadExecutions() {
    try {
        executions = await getExecutions();
        renderExecutions();

        // Refresh selected execution details if one is selected
        if (selectedExecutionId) {
            const exec = executions.find(e => e.id === selectedExecutionId);
            if (exec) {
                renderExecutionDetails(exec);
            }
        }
    } catch (error) {
        console.error('Failed to load executions:', error);
    }
}

// ===========================
// Auto Refresh
// ===========================
function startAutoRefresh() {
    refreshTimer = setInterval(() => {
        loadExecutions();
    }, REFRESH_INTERVAL);
}

// ===========================
// Quick Execute Handler
// ===========================
async function handleQuickExecute(e) {
    e.preventDefault();

    const workdir = document.getElementById('workdir').value.trim();
    const command = document.getElementById('command').value.trim();

    try {
        await executeCommand(workdir, command);
        document.getElementById('command').value = '';
        setTimeout(() => loadExecutions(), 500);
    } catch (error) {
        // Error already handled in apiRequest
    }
}

// ===========================
// Command Modal
// ===========================
function openAddCommandModal() {
    document.getElementById('modalTitle').textContent = 'Add New Command';
    document.getElementById('commandForm').reset();
    document.getElementById('commandId').value = '';
    document.getElementById('commandModal').classList.remove('hidden');
}

function openEditCommandModal(command) {
    document.getElementById('modalTitle').textContent = 'Edit Command';
    document.getElementById('commandId').value = command.id;
    document.getElementById('commandName').value = command.name;
    document.getElementById('commandDescription').value = command.description || '';
    document.getElementById('commandWorkdir').value = command.workdir;
    document.getElementById('commandCommand').value = command.command;
    document.getElementById('commandTags').value = command.tags ? command.tags.join(', ') : '';
    document.getElementById('commandModal').classList.remove('hidden');
}

function closeCommandModal() {
    document.getElementById('commandModal').classList.add('hidden');
}

async function handleSaveCommand(e) {
    e.preventDefault();

    const id = document.getElementById('commandId').value;
    const commandData = {
        name: document.getElementById('commandName').value.trim(),
        description: document.getElementById('commandDescription').value.trim(),
        workdir: document.getElementById('commandWorkdir').value.trim(),
        command: document.getElementById('commandCommand').value.trim(),
        tags: document.getElementById('commandTags').value
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0),
    };

    try {
        if (id) {
            await updateCommand(id, commandData);
        } else {
            await createCommand(commandData);
        }

        closeCommandModal();
        loadCommands();
    } catch (error) {
        // Error already handled in apiRequest
    }
}

// ===========================
// Render Functions
// ===========================
function renderCommands() {
    const container = document.getElementById('commandsList');

    // Filter commands by search query
    const filteredCommands = commands.filter(cmd => {
        if (!commandSearchQuery) return true;
        return cmd.name.toLowerCase().includes(commandSearchQuery) ||
            (cmd.description && cmd.description.toLowerCase().includes(commandSearchQuery)) ||
            (cmd.tags && cmd.tags.some(tag => tag.toLowerCase().includes(commandSearchQuery)));
    });

    if (filteredCommands.length === 0) {
        const message = commandSearchQuery
            ? `No commands matching "${commandSearchQuery}"`
            : 'No saved commands';
        container.innerHTML = `<div class="text-center text-gray-500 text-xs py-8">${message}</div>`;
        return;
    }

    const html = filteredCommands.map(cmd => `
        <div class="bg-gray-800 border border-gray-700 rounded p-2 hover:border-indigo-500 transition">
            <div class="font-medium text-xs mb-1 truncate">${escapeHtml(cmd.name)}</div>
            ${cmd.description ? `<div class="text-xs text-gray-400 mb-1.5 truncate">${escapeHtml(cmd.description)}</div>` : ''}
            <div class="text-xs text-gray-500 mb-1.5 space-y-0.5">
                <div class="truncate">📁 ${escapeHtml(cmd.workdir)}</div>
                <div class="truncate">⚡ ${escapeHtml(cmd.command)}</div>
            </div>
            ${cmd.tags && cmd.tags.length > 0 ? `
            <div class="flex flex-wrap gap-1 mb-1.5">
                ${cmd.tags.map(tag => `<span class="text-xs bg-gray-700 px-1.5 py-0.5 rounded">${escapeHtml(tag)}</span>`).join('')}
            </div>
            ` : ''}
            <div class="flex gap-1">
                <button 
                    onclick="runSavedCommand('${cmd.id}')" 
                    class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded text-xs transition flex items-center justify-center gap-1"
                    title="Run command"
                >
                    ▶️
                </button>
                <button 
                    onclick='editCommand(${JSON.stringify(cmd)})' 
                    class="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs transition flex items-center justify-center gap-1"
                    title="Edit command"
                >
                    ✏️
                </button>
                <button 
                    onclick="removeCommand('${cmd.id}')" 
                    class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition flex items-center justify-center"
                    title="Delete command"
                >
                    🗑️
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

function renderExecutions() {
    const container = document.getElementById('executionsList');

    if (executions.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 text-xs py-8">No executions yet</div>';
        return;
    }

    const html = executions.slice(0, 50).map(exec => {
        const statusColor = {
            running: 'bg-blue-500',
            success: 'bg-green-500',
            failed: 'bg-red-500',
        }[exec.status] || 'bg-gray-500';

        const statusIcon = {
            running: '⏳',
            success: '✅',
            failed: '❌',
        }[exec.status] || '❓';

        const isSelected = exec.id === selectedExecutionId;

        return `
            <div onclick="selectExecution('${exec.id}')" 
                 class="bg-gray-800 border ${isSelected ? 'border-indigo-500' : 'border-gray-700'} rounded p-2 hover:border-indigo-500 transition cursor-pointer">
                <div class="flex items-center justify-between mb-1">
                    <div class="font-medium text-xs truncate flex-1">
                        ${exec.name ? escapeHtml(exec.name) : '<span class="text-gray-400">Quick Execute</span>'}
                    </div>
                    <span class="${statusColor} w-2 h-2 rounded-full ml-2"></span>
                </div>
                <div class="text-xs text-gray-400 truncate mb-1">${escapeHtml(exec.command)}</div>
                <div class="flex items-center justify-between text-xs text-gray-500">
                    <span>${formatDateTime(exec.started_at)}</span>
                    <span>${statusIcon}</span>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

function renderExecutionDetails(execution) {
    selectedExecutionId = execution.id;

    const statusColor = {
        running: 'text-blue-400',
        success: 'text-green-400',
        failed: 'text-red-400',
    }[execution.status] || 'text-gray-400';

    const statusIcon = {
        running: '⏳',
        success: '✅',
        failed: '❌',
    }[execution.status] || '❓';

    const html = `
        <div class="space-y-3">
            <div>
                <div class="text-xs text-gray-400 mb-1">Status</div>
                <div class="flex items-center gap-2 ${statusColor} font-medium text-sm">
                    ${statusIcon} ${execution.status.toUpperCase()}
                </div>
            </div>
            
            ${execution.name ? `
            <div>
                <div class="text-xs text-gray-400 mb-1">Command Name</div>
                <div class="text-sm">${escapeHtml(execution.name)}</div>
            </div>
            ` : ''}
            
            ${execution.executed_by ? `
            <div>
                <div class="text-xs text-gray-400 mb-1">Executed By</div>
                <div class="text-sm">👤 ${escapeHtml(execution.executed_by)}</div>
            </div>
            ` : ''}
            
            <div>
                <div class="text-xs text-gray-400 mb-1">Working Directory</div>
                <div class="text-xs font-mono bg-gray-800 px-2 py-1 rounded">${escapeHtml(execution.workdir)}</div>
            </div>
            
            <div>
                <div class="text-xs text-gray-400 mb-1">Command</div>
                <div class="text-xs font-mono bg-gray-800 px-2 py-1 rounded">${escapeHtml(execution.command)}</div>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <div class="text-xs text-gray-400 mb-1">Started</div>
                    <div class="text-xs">${formatDateTime(execution.started_at)}</div>
                </div>
                ${execution.ended_at ? `
                <div>
                    <div class="text-xs text-gray-400 mb-1">Ended</div>
                    <div class="text-xs">${formatDateTime(execution.ended_at)}</div>
                </div>
                ` : ''}
            </div>
            
            ${execution.duration ? `
            <div>
                <div class="text-xs text-gray-400 mb-1">Duration</div>
                <div class="text-xs">${execution.duration}</div>
            </div>
            ` : ''}
            
            <div>
                <div class="text-xs text-gray-400 mb-1">Exit Code</div>
                <div class="text-xs">${execution.exit_code}</div>
            </div>
            
            <div>
                <div class="text-xs text-gray-400 mb-1">Output</div>
                <pre class="text-xs font-mono bg-gray-800 p-2 rounded overflow-x-auto max-h-96 overflow-y-auto scrollbar-thin">${escapeHtml(execution.output) || '(no output)'}</pre>
            </div>
        </div>
    `;

    document.getElementById('executionDetails').innerHTML = html;
}

// ===========================
// Command Actions
// ===========================
async function runSavedCommand(commandId) {
    const command = commands.find(c => c.id === commandId);
    if (!command) return;

    try {
        await executeCommand(command.workdir, command.command, commandId);
        setTimeout(() => loadExecutions(), 500);
    } catch (error) {
        // Error already handled
    }
}

function editCommand(command) {
    openEditCommandModal(command);
}

async function removeCommand(commandId) {
    if (!confirm('Delete this command?')) return;

    try {
        await deleteCommand(commandId);
        loadCommands();
    } catch (error) {
        // Error already handled
    }
}

async function handleClearHistory() {
    if (!confirm('Clear all execution history?')) return;

    try {
        await clearAllExecutions();
        selectedExecutionId = null;
        document.getElementById('executionDetails').innerHTML = '<div class="text-center text-gray-500 text-xs py-8">Select an execution to view details</div>';
        loadExecutions();
    } catch (error) {
        // Error already handled
    }
}

async function selectExecution(executionId) {
    try {
        const execution = await getExecution(executionId);
        renderExecutionDetails(execution);
        renderExecutions(); // Re-render to update selected state
    } catch (error) {
        // Error already handled
    }
}

// ===========================
// Utility Functions
// ===========================
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m ago`;
    }
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
    }

    return date.toLocaleString();
}

// Make functions available globally
window.runSavedCommand = runSavedCommand;
window.editCommand = editCommand;
window.removeCommand = removeCommand;
window.selectExecution = selectExecution;
window.closeCommandModal = closeCommandModal;
