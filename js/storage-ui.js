/* ============================================================
   storage-ui.js - UI Controls for Storage Features
   ============================================================
   Handles the display of history, stats, and save indicators
   ============================================================ */

/**
 * Show save indicator briefly after auto-save
 */
function showSaveIndicator() {
  const indicator = document.getElementById('save-indicator');
  if (!indicator) return;

  indicator.classList.add('show');

  setTimeout(() => {
    indicator.classList.remove('show');
  }, 2000);
}

/**
 * Open history modal and display game history
 */
function openHistoryModal() {
  const modal = document.getElementById('history-modal');
  const content = document.getElementById('history-content');

  if (!modal || !content) return;

  const history = getGameHistory();

  if (history.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>No game history yet</p>
        <p style="font-size: 0.85em; margin-top: 8px;">Complete some games to see them here!</p>
      </div>
    `;
  } else {
    let html = '<ul class="history-list">';

    history.forEach((game, index) => {
      const date = new Date(game.timestamp);
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString();

      let resultText = '';
      let resultColor = '';

      if (game.result === 'checkmate') {
        resultText = `${game.winner === 'white' ? 'White' : 'Black'} wins by checkmate`;
        resultColor = game.winner === 'white' ? '#f5f5f5' : '#888';
      } else if (game.result === 'stalemate') {
        resultText = 'Draw by stalemate';
        resultColor = '#d4af37';
      } else if (game.result === 'draw') {
        resultText = 'Draw';
        resultColor = '#d4af37';
      } else {
        resultText = 'Game incomplete';
        resultColor = '#888';
      }

      html += `
        <li class="history-item">
          <div class="history-result" style="color: ${resultColor}">${resultText}</div>
          <div class="history-meta">
            <span class="meta-item">
              <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              ${dateStr}
            </span>
            <span class="meta-item">
              <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              ${timeStr}
            </span>
            <span class="meta-item">
              <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 11 12 14 22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              ${game.moveCount} moves
            </span>
          </div>
        </li>
      `;
    });

    html += '</ul>';

    html += `
      <button onclick="clearHistoryConfirm()" style="
        margin-top: 20px;
        padding: 10px 20px;
        background: rgba(220, 30, 30, 0.2);
        border: 1px solid rgba(220, 30, 30, 0.4);
        color: #ff6666;
        border-radius: 8px;
        cursor: pointer;
        font-family: 'Poppins', sans-serif;
        font-size: 0.9rem;
        transition: all 0.2s ease;
      " onmouseover="this.style.background='rgba(220, 30, 30, 0.3)'"
         onmouseout="this.style.background='rgba(220, 30, 30, 0.2)'">
        Clear History
      </button>
    `;

    content.innerHTML = html;
  }

  modal.classList.add('show');
}

/**
 * Close history modal
 */
function closeHistoryModal() {
  const modal = document.getElementById('history-modal');
  if (modal) modal.classList.remove('show');
}

/**
 * Open stats modal and display statistics
 */
function openStatsModal() {
  const modal = document.getElementById('stats-modal');
  const content = document.getElementById('stats-content');

  if (!modal || !content) return;

  const stats = getStats();

  const winRate = stats.gamesPlayed > 0
    ? Math.round(((stats.whiteWins + stats.blackWins) / stats.gamesPlayed) * 100)
    : 0;

  const lastPlayedText = stats.lastPlayed
    ? new Date(stats.lastPlayed).toLocaleString()
    : 'Never';

  const html = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.gamesPlayed}</div>
        <div class="stat-label">Games Played</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.whiteWins}</div>
        <div class="stat-label">White Wins</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.blackWins}</div>
        <div class="stat-label">Black Wins</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.draws}</div>
        <div class="stat-label">Draws</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${winRate}%</div>
        <div class="stat-label">Win Rate</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.whiteWins + stats.blackWins}</div>
        <div class="stat-label">Total Wins</div>
      </div>
    </div>

    <div style="margin-top: 24px; padding: 16px; background: rgba(0, 0, 0, 0.3); border-radius: 12px; border: 1px solid rgba(212, 175, 55, 0.2);">
      <p style="color: #c0c0c0; margin: 0;"><strong style="color: #d4af37;">Last Played:</strong> ${lastPlayedText}</p>
    </div>

    <button onclick="clearStatsConfirm()" style="
      margin-top: 20px;
      padding: 10px 20px;
      background: rgba(220, 30, 30, 0.2);
      border: 1px solid rgba(220, 30, 30, 0.4);
      color: #ff6666;
      border-radius: 8px;
      cursor: pointer;
      font-family: 'Poppins', sans-serif;
      font-size: 0.9rem;
      transition: all 0.2s ease;
    " onmouseover="this.style.background='rgba(220, 30, 30, 0.3)'"
       onmouseout="this.style.background='rgba(220, 30, 30, 0.2)'">
      Reset Statistics
    </button>
  `;

  content.innerHTML = html;
  modal.classList.add('show');
}

/**
 * Close stats modal
 */
function closeStatsModal() {
  const modal = document.getElementById('stats-modal');
  if (modal) modal.classList.remove('show');
}

/**
 * Confirm and clear history
 */
function clearHistoryConfirm() {
  if (confirm('Are you sure you want to clear all game history? This cannot be undone.')) {
    clearGameHistory();
    closeHistoryModal();
    alert('Game history cleared!');
  }
}

/**
 * Confirm and clear stats
 */
function clearStatsConfirm() {
  if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
    clearStats();
    closeStatsModal();
    alert('Statistics reset!');
  }
}

/**
 * Open save game modal
 */
function openSaveModal() {
  const modal = createSaveModal();
  document.body.appendChild(modal);

  // Show modal with slight delay for animation
  setTimeout(() => modal.classList.add('show'), 10);
}

/**
 * Create save game modal
 */
function createSaveModal() {
  const modal = document.createElement('div');
  modal.className = 'modal save-load-modal';
  modal.id = 'save-modal';

  const allSaves = typeof getAllSavedGames === 'function' ? getAllSavedGames() : [];
  const saveCount = allSaves.length;

  // Check if we have a currently loaded save
  let currentSaveId = null;
  let existingSave = null;
  let isUpdating = false;

  // Access currentSaveId from game.js via window if exposed
  if (typeof window.getCurrentSaveId === 'function') {
    currentSaveId = window.getCurrentSaveId();
    if (currentSaveId) {
      existingSave = allSaves.find(s => s.id === currentSaveId);
      isUpdating = !!existingSave;
    }
  }

  const defaultName = isUpdating ? existingSave.name : `Game ${saveCount + 1}`;
  const saveButtonText = isUpdating ? 'Update Save' : 'Save Game';
  const infoText = isUpdating
    ? `Updating <strong>${existingSave.name}</strong>`
    : `You currently have ${saveCount} saved game${saveCount !== 1 ? 's' : ''}`;

  modal.innerHTML = `
    <div class="modal-content save-load-content">
      <div class="modal-header">
        <svg class="modal-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        <h2>${isUpdating ? 'Update' : 'Save'} Game</h2>
        <button class="modal-close" onclick="closeSaveModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="save-info-box ${isUpdating ? 'warning' : 'info'}">
          <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${isUpdating
              ? '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
              : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
            }
          </svg>
          <div>
            <p>${infoText}</p>
            ${isUpdating
              ? '<p style="font-size: 0.85em; margin-top: 4px; color: var(--text-muted);">This will update your existing save</p>'
              : ''
            }
          </div>
        </div>

        <div class="save-name-input">
          <label for="save-name-field">Save Name:</label>
          <input type="text" id="save-name-field" class="save-input"
                 placeholder="Enter a name for this save..."
                 value="${defaultName}"
                 maxlength="50">
        </div>

        <div class="save-actions">
          <button class="save-action-btn save-btn-primary" onclick="confirmSaveGame()">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            ${saveButtonText}
          </button>
          <button class="save-action-btn save-btn-secondary" onclick="closeSaveModal()">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;

  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeSaveModal();
  });

  // Focus input field
  setTimeout(() => {
    const input = document.getElementById('save-name-field');
    if (input) {
      input.focus();
      input.select();
    }
  }, 100);

  return modal;
}

/**
 * Confirm and execute save
 */
function confirmSaveGame() {
  console.log('confirmSaveGame called');

  // Get save name from input
  const nameField = document.getElementById('save-name-field');
  const saveName = nameField ? nameField.value.trim() : '';

  if (!saveName) {
    alert('Please enter a name for your save.');
    return;
  }

  // Check if we're updating an existing save
  const isUpdating = typeof window.getCurrentSaveId === 'function' && window.getCurrentSaveId() !== null;

  // Call the global save function from game.js
  if (typeof window.saveGameToNamedSlot === 'function') {
    console.log('Calling window.saveGameToNamedSlot with name:', saveName);
    const result = window.saveGameToNamedSlot(saveName);
    console.log('Save result:', result);

    if (result) {
      showSaveSuccessMessage(saveName, isUpdating);
      closeSaveModal();
    } else {
      alert('Failed to save game. Check console for details.');
    }
  } else {
    console.error('saveGameToNamedSlot function not available');
    alert('Error: Save function not available. Please refresh the page.');
  }
}

/**
 * Show save success message
 */
function showSaveSuccessMessage(saveName, isUpdating) {
  const toast = document.createElement('div');
  toast.className = 'save-toast';
  const message = isUpdating ? `Updated "${saveName}"!` : `Saved as "${saveName}"!`;
  toast.innerHTML = `
    <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    <span>${message}</span>
  `;

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/**
 * Close save modal
 */
function closeSaveModal() {
  const modal = document.getElementById('save-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  }
}

/**
 * Open load game modal
 */
function openLoadModal() {
  const modal = createLoadModal();
  document.body.appendChild(modal);

  // Show modal with slight delay for animation
  setTimeout(() => modal.classList.add('show'), 10);
}

/**
 * Create load game modal
 */
function createLoadModal() {
  const modal = document.createElement('div');
  modal.className = 'modal save-load-modal load-modal-large';
  modal.id = 'load-modal';

  const savedGames = typeof getAllSavedGames === 'function' ? getAllSavedGames() : [];
  const hasExisting = savedGames.length > 0;

  if (!hasExisting) {
    modal.innerHTML = `
      <div class="modal-content save-load-content">
        <div class="modal-header">
          <svg class="modal-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <h2>Load Game</h2>
          <button class="modal-close" onclick="closeLoadModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"/>
            </svg>
            <p style="margin-top: 16px;"><strong>No saved game found</strong></p>
            <p style="font-size: 0.9em; margin-top: 8px; color: var(--text-muted);">
              Save a game first to load it later.
            </p>
          </div>
          <div class="save-actions">
            <button class="save-action-btn save-btn-secondary" onclick="closeLoadModal()">
              Close
            </button>
          </div>
        </div>
      </div>
    `;
  } else {
    // Sort saves by timestamp (newest first)
    const sorted = savedGames.sort((a, b) => b.timestamp - a.timestamp);

    let savesHTML = '';
    sorted.forEach(save => {
      const date = new Date(save.timestamp);
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString();

      savesHTML += `
        <div class="save-list-item" data-save-id="${save.id}">
          <div class="save-item-header">
            <h4 class="save-item-name">${save.name}</h4>
            <span class="save-item-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 11 12 14 22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              ${save.moveCount} moves
            </span>
          </div>
          <div class="save-item-meta">
            <span class="meta-item">
              <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              ${dateStr}
            </span>
            <span class="meta-item">
              <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              ${timeStr}
            </span>
          </div>
          <div class="save-item-actions">
            <button class="save-item-btn load-btn" onclick="loadGameById(${save.id})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Load
            </button>
            <button class="save-item-btn delete-btn" onclick="deleteGameById(${save.id})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Delete
            </button>
          </div>
        </div>
      `;
    });

    modal.innerHTML = `
      <div class="modal-content save-load-content">
        <div class="modal-header">
          <svg class="modal-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"/>
          </svg>
          <h2>Load Game (${savedGames.length})</h2>
          <button class="modal-close" onclick="closeLoadModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="save-info-box warning">
            <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <p><strong>Warning:</strong> Loading will replace your current game.</p>
            </div>
          </div>

          <div class="save-list">
            ${savesHTML}
          </div>

          <div class="save-actions" style="margin-top: 20px;">
            <button class="save-action-btn save-btn-secondary" onclick="closeLoadModal()">
              Close
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeLoadModal();
  });

  return modal;
}

/**
 * Confirm and execute load
 */
function confirmLoadGame() {
  closeLoadModal();
  location.reload();  // Reload page to trigger auto-load
}

/**
 * Close load modal
 */
function closeLoadModal() {
  const modal = document.getElementById('load-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  }
}

/**
 * Load a game by ID
 */
function loadGameById(saveId) {
  if (typeof window.loadGameFromSlot === 'function') {
    closeLoadModal();
    window.loadGameFromSlot(saveId);
  } else {
    alert('Load function not available. Please refresh the page.');
  }
}

/**
 * Delete a game by ID
 */
function deleteGameById(saveId) {
  if (!confirm('Delete this save? This cannot be undone.')) {
    return;
  }

  if (typeof deleteSavedGameById === 'function') {
    const success = deleteSavedGameById(saveId);
    if (success) {
      // Refresh the modal to show updated list
      closeLoadModal();
      setTimeout(() => openLoadModal(), 100);

      // Show delete toast
      const toast = document.createElement('div');
      toast.className = 'save-toast delete-toast';
      toast.innerHTML = `
        <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        <span>Save deleted</span>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.classList.add('show'), 10);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 2500);
    }
  }
}

/**
 * Manual save button handler
 */
function handleManualSave() {
  openSaveModal();
}

/**
 * Manual load button handler
 */
function handleManualLoad() {
  openLoadModal();
}

/**
 * Initialize storage UI event listeners
 */
function initStorageUI() {
  // Save button
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', handleManualSave);
  }

  // Load button
  const loadBtn = document.getElementById('load-btn');
  if (loadBtn) {
    loadBtn.addEventListener('click', handleManualLoad);
  }

  // History button
  const historyBtn = document.getElementById('history-btn');
  if (historyBtn) {
    historyBtn.addEventListener('click', openHistoryModal);
  }

  // Stats button
  const statsBtn = document.getElementById('stats-btn');
  if (statsBtn) {
    statsBtn.addEventListener('click', openStatsModal);
  }

  // Close buttons
  const closeHistory = document.getElementById('close-history');
  if (closeHistory) {
    closeHistory.addEventListener('click', closeHistoryModal);
  }

  const closeStats = document.getElementById('close-stats');
  if (closeStats) {
    closeStats.addEventListener('click', closeStatsModal);
  }

  // Close modals on background click
  const historyModal = document.getElementById('history-modal');
  if (historyModal) {
    historyModal.addEventListener('click', (e) => {
      if (e.target === historyModal) closeHistoryModal();
    });
  }

  const statsModal = document.getElementById('stats-modal');
  if (statsModal) {
    statsModal.addEventListener('click', (e) => {
      if (e.target === statsModal) closeStatsModal();
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeHistoryModal();
      closeStatsModal();
      closeSaveModal();
      closeLoadModal();
    }
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initStorageUI);
