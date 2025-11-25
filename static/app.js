// ===========================
// API Configuration
// ===========================
const API_BASE = '/api';
const REFRESH_INTERVAL = 2000; // Poll for updates every 2 seconds

// ===========================
// State Management
// ===========================
let commands = [];
let executions = [];
let refreshTimer = null;

// ===========================
// Initialization
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadCommands();
    loadExecutions();
    startAutoRefresh();
});

// ===========================
// Event Listeners
// ===========================
function setupEventListeners() {
    // Quick execute form
    document.getElementById('executeForm').addEventListener('submit', handleQuickExecute);
    
    // Add command button
    document.getElementById('addCommandBtn').addEventListener('click', openAddCommandModal);
    
    // Command form
    document.getElementById('commandForm').addEventListener('submit', handleSaveCommand);
    
    // Clear history button
    document.getElementById('clearHistoryBtn').addEventListener('click', handleClearHistory);
    
    // Close modals on background click
    document.getElementById('commandModal').addEventListener('click', (e) => {
        if (e.target.id === 'commandModal') closeCommandModal();
    });
    
    document.getElementById('executionModal').addEventListener('click', (e) => {
        if (e.target.id === 'executionModal') closeExecutionModal();
    });
}

// ===========================
// API Functions
// ===========================
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });
        
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

async function deleteExecution(id) {
    return await apiRequest(`/executions/${id}`, {
        method: 'DELETE',
    });
}

async function clearAllExecutions() {
    return await apiRequest('/executions/clear', {
        method: 'POST',
    });
}

// ===========================
// Load Data
// ===========================
async function loadCommands() {
    try {
        commands = await getCommands();
        renderCommands();
    } catch (error) {
        console.error('Failed to load commands:', error);
    }
}

async function loadExecutions() {
    try {
        executions = await getExecutions();
        renderExecutions();
    } catch (error) {
        console.error('Failed to load executions:', error);
    }
}

// ===========================
// Auto Refresh
// ===========================
function startAutoRefresh() {
    refreshTimer = setInterval(() => {
        loadExecutions(); // Refresh execution history to update running commands
    }, REFRESH_INTERVAL);
}

function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

// ===========================
// Quick Execute Handler
// ===========================
async function handleQuickExecute(e) {
    e.preventDefault();
    
    const workdir = document.getElementById('workdir').value.trim();
    const command = document.getElementById('command').value.trim();
    
    try {
        const result = await executeCommand(workdir, command);
        alert(`Command started! Execution ID: ${result.execution_id}`);
        
        // Clear form
        document.getElementById('command').value = '';
        
        // Refresh executions
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
    document.getElementById('commandModal').classList.add('active');
}

function openEditCommandModal(command) {
    document.getElementById('modalTitle').textContent = 'Edit Command';
    document.getElementById('commandId').value = command.id;
    document.getElementById('commandName').value = command.name;
    document.getElementById('commandDescription').value = command.description || '';
    document.getElementById('commandWorkdir').value = command.workdir;
    document.getElementById('commandCommand').value = command.command;
    document.getElementById('commandTags').value = command.tags ? command.tags.join(', ') : '';
    document.getElementById('commandModal').classList.add('active');
}

function closeCommandModal() {
    document.getElementById('commandModal').classList.remove('active');
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
// Execution Modal
// ===========================
function openExecutionModal(executionId) {
    getExecution(executionId).then(execution => {
        renderExecutionDetails(execution);
        document.getElementById('executionModal').classList.add('active');
    });
}

function closeExecutionModal() {
    document.getElementById('executionModal').classList.remove('active');
}

function renderExecutionDetails(execution) {
    const statusClass = `status-${execution.status}`;
    const statusIcon = {
        running: '⏳',
        success: '✅',
        failed: '❌',
    }[execution.status] || '❓';
    
    const html = `
        <div class="detail-section">
            <h3>Status</h3>
            <div class="execution-status ${statusClass}">
                <span class="status-indicator"></span>
                ${statusIcon} ${execution.status.toUpperCase()}
            </div>
        </div>
        
        ${execution.name ? `
        <div class="detail-section">
            <h3>Command Name</h3>
            <p>${escapeHtml(execution.name)}</p>
        </div>
        ` : ''}
        
        <div class="detail-section">
            <h3>Working Directory</h3>
            <p><code>${escapeHtml(execution.workdir)}</code></p>
        </div>
        
        <div class="detail-section">
            <h3>Command</h3>
            <p><code>${escapeHtml(execution.command)}</code></p>
        </div>
        
        <div class="detail-section">
            <h3>Timeline</h3>
            <p><strong>Started:</strong> ${formatDateTime(execution.started_at)}</p>
            ${execution.ended_at ? `<p><strong>Ended:</strong> ${formatDateTime(execution.ended_at)}</p>` : ''}
            ${execution.duration ? `<p><strong>Duration:</strong> ${execution.duration}</p>` : ''}
            <p><strong>Exit Code:</strong> ${execution.exit_code}</p>
        </div>
        
        <div class="detail-section">
            <h3>Output</h3>
            <div class="detail-output">${execution.output || '(no output)'}</div>
        </div>
    `;
    
    document.getElementById('executionDetails').innerHTML = html;
}

// ===========================
// Render Functions
// ===========================
function renderCommands() {
    const container = document.getElementById('commandsList');
    
    if (commands.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <p>No saved commands yet</p>
                <button class="btn btn-ghost" onclick="document.getElementById('addCommandBtn').click()">
                    Create your first command
                </button>
            </div>
        `;
        return;
    }
    
    const html = commands.map(cmd => `
        <div class="command-item">
            <div class="command-header">
                <div>
                    <div class="command-title">${escapeHtml(cmd.name)}</div>
                    ${cmd.description ? `<div class="command-description">${escapeHtml(cmd.description)}</div>` : ''}
                </div>
            </div>
            
            <div class="command-details">
                <div class="command-detail">
                    <span class="command-detail-label">📁 Workdir:</span>
                    <span class="command-detail-value">${escapeHtml(cmd.workdir)}</span>
                </div>
                <div class="command-detail">
                    <span class="command-detail-label">⚡ Command:</span>
                    <span class="command-detail-value">${escapeHtml(cmd.command)}</span>
                </div>
            </div>
            
            ${cmd.tags && cmd.tags.length > 0 ? `
            <div class="command-tags">
                ${cmd.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
            ` : ''}
            
            <div class="command-actions">
                <button class="btn btn-primary btn-small" onclick="runSavedCommand('${cmd.id}')">
                    <span class="btn-icon">▶</span>
                    Run
                </button>
                <button class="btn btn-secondary btn-small" onclick='editCommand(${JSON.stringify(cmd)})'>
                    <span class="btn-icon">✏️</span>
                    Edit
                </button>
                <button class="btn btn-danger btn-small" onclick="removeCommand('${cmd.id}')">
                    <span class="btn-icon">🗑️</span>
                    Delete
                </button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function renderExecutions() {
    const container = document.getElementById('executionsList');
    
    if (executions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🕐</div>
                <p>No executions yet</p>
            </div>
        `;
        return;
    }
    
    const html = executions.slice(0, 20).map(exec => {
        const statusClass = `status-${exec.status}`;
        const statusIcon = {
            running: '⏳',
            success: '✅',
            failed: '❌',
        }[exec.status] || '❓';
        
        return `
            <div class="execution-item" onclick="openExecutionModal('${exec.id}')">
                <div class="execution-header">
                    ${exec.name ? `<strong>${escapeHtml(exec.name)}</strong>` : '<span class="execution-command">${escapeHtml(exec.command)}</span>'}
                    <div class="execution-status ${statusClass}">
                        <span class="status-indicator"></span>
                        ${statusIcon} ${exec.status}
                    </div>
                </div>
                
                <div class="execution-command">${escapeHtml(exec.workdir)} $ ${escapeHtml(exec.command)}</div>
                
                <div class="execution-meta">
                    <span>🕐 ${formatDateTime(exec.started_at)}</span>
                    ${exec.duration ? `<span>⏱️ ${exec.duration}</span>` : ''}
                    <span>📊 Exit: ${exec.exit_code}</span>
                </div>
                
                ${exec.output && exec.status !== 'running' ? `
                <div class="execution-output">${escapeHtml(exec.output.substring(0, 200))}${exec.output.length > 200 ? '...' : ''}</div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// ===========================
// Command Actions
// ===========================
async function runSavedCommand(commandId) {
    const command = commands.find(c => c.id === commandId);
    if (!command) return;
    
    try {
        const result = await executeCommand(command.workdir, command.command, commandId);
        alert(`Command "${command.name}" started!`);
        setTimeout(() => loadExecutions(), 500);
    } catch (error) {
        // Error already handled
    }
}

function editCommand(command) {
    openEditCommandModal(command);
}

async function removeCommand(commandId) {
    if (!confirm('Are you sure you want to delete this command?')) return;
    
    try {
        await deleteCommand(commandId);
        loadCommands();
    } catch (error) {
        // Error already handled
    }
}

async function handleClearHistory() {
    if (!confirm('Are you sure you want to clear all execution history?')) return;
    
    try {
        await clearAllExecutions();
        loadExecutions();
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
    
    // Less than 1 minute
    if (diff < 60000) {
        return 'Just now';
    }
    
    // Less than 1 hour
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    
    // Less than 24 hours
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    // Otherwise show full date
    return date.toLocaleString();
}

// Make functions available globally for onclick handlers
window.runSavedCommand = runSavedCommand;
window.editCommand = editCommand;
window.removeCommand = removeCommand;
window.openExecutionModal = openExecutionModal;
window.closeCommandModal = closeCommandModal;
window.closeExecutionModal = closeExecutionModal;
