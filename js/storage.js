/* ============================================================
   storage.js - Phase 6: Persistence & Storage
   ============================================================
   Handles saving and loading game state using localStorage.

   Features:
   - Auto-save current game on every move
   - Load saved game on page load
   - Game history archive
   - Settings persistence
   - Resume interrupted games
   ============================================================ */

// Storage keys
const STORAGE_KEYS = {
  CURRENT_GAME: 'chess-game-current',      // Auto-save for current session
  SAVED_GAMES: 'chess-game-saves',         // List of manual saves
  GAME_HISTORY: 'chess-game-history',
  SETTINGS: 'chess-game-settings',
  STATS: 'chess-game-stats'
};

/* ============================================================
   GAME STATE PERSISTENCE
   ============================================================ */

/**
 * Save the current game state to localStorage
 * Called after every move
 */
function saveCurrentGame(game, moveHistory, capturedPieces, gameStatus) {
  try {
    console.log('saveCurrentGame called with:', {
      gameType: typeof game,
      hasFeenMethod: typeof game.fen,
      game: game,
      moveHistory: moveHistory,
      capturedPieces: capturedPieces,
      gameStatus: gameStatus
    });

    const gameState = {
      fen: game.fen(),                    // Current board position
      pgn: game.pgn(),                    // Full game in PGN format
      moveHistory: moveHistory,           // Array of move objects
      capturedPieces: capturedPieces,     // Captured pieces data
      gameStatus: gameStatus,             // Game status (ongoing, check, checkmate, etc.)
      timestamp: Date.now(),              // When this was saved
      moveCount: game.history().length    // Number of moves made
    };

    localStorage.setItem(STORAGE_KEYS.CURRENT_GAME, JSON.stringify(gameState));
    console.log('Game saved successfully to localStorage');
    return true;
  } catch (error) {
    console.error('Error saving game:', error);
    return false;
  }
}

/**
 * Load the saved game state from localStorage
 * Returns null if no saved game exists
 */
function loadCurrentGame() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_GAME);
    if (!saved) return null;

    const gameState = JSON.parse(saved);

    // Check if saved game is valid
    if (!gameState.fen || !gameState.timestamp) {
      return null;
    }

    return gameState;
  } catch (error) {
    console.error('Error loading game:', error);
    return null;
  }
}

/**
 * Check if a saved game exists
 */
function hasSavedGame() {
  const saved = loadCurrentGame();
  return saved !== null;
}

/**
 * Clear the current saved game
 */
function clearCurrentGame() {
  try {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_GAME);
    return true;
  } catch (error) {
    console.error('Error clearing game:', error);
    return false;
  }
}

/* ============================================================
   MANUAL SAVE SLOTS (Multiple saves)
   ============================================================ */

/**
 * Save game to a named slot (manual save)
 * If saveId is provided, updates that existing save
 */
function saveGameToSlot(game, saveName, saveId) {
  try {
    let saves = getAllSavedGames();

    // If saveId provided, try to update existing save
    if (saveId) {
      const existingIndex = saves.findIndex(save => save.id === saveId);
      if (existingIndex !== -1) {
        // Update existing save
        saves[existingIndex] = {
          id: saveId, // Keep same ID
          name: saveName || saves[existingIndex].name, // Keep name if not provided
          fen: game.fen(),
          pgn: game.pgn(),
          moveCount: game.history().length,
          timestamp: Date.now(), // Update timestamp
          date: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEYS.SAVED_GAMES, JSON.stringify(saves));
        return saves[existingIndex];
      }
    }

    // Create new save (no saveId or saveId not found)
    const saveData = {
      id: Date.now(),
      name: saveName || `Game ${new Date().toLocaleString()}`,
      fen: game.fen(),
      pgn: game.pgn(),
      moveCount: game.history().length,
      timestamp: Date.now(),
      date: new Date().toISOString()
    };

    saves.push(saveData);

    // Keep only last 50 manual saves
    if (saves.length > 50) {
      saves.shift(); // Remove oldest
    }

    localStorage.setItem(STORAGE_KEYS.SAVED_GAMES, JSON.stringify(saves));
    return saveData;
  } catch (error) {
    console.error('Error saving to slot:', error);
    return null;
  }
}

/**
 * Get all manual saved games
 */
function getAllSavedGames() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SAVED_GAMES);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading saved games:', error);
    return [];
  }
}

/**
 * Load a specific saved game by ID
 */
function loadSavedGameById(saveId) {
  try {
    const saves = getAllSavedGames();
    return saves.find(save => save.id === saveId) || null;
  } catch (error) {
    console.error('Error loading saved game:', error);
    return null;
  }
}

/**
 * Delete a saved game by ID
 */
function deleteSavedGameById(saveId) {
  try {
    let saves = getAllSavedGames();
    saves = saves.filter(save => save.id !== saveId);
    localStorage.setItem(STORAGE_KEYS.SAVED_GAMES, JSON.stringify(saves));
    return true;
  } catch (error) {
    console.error('Error deleting saved game:', error);
    return false;
  }
}

/**
 * Clear all manual saves
 */
function clearAllSavedGames() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SAVED_GAMES);
    return true;
  } catch (error) {
    console.error('Error clearing saved games:', error);
    return false;
  }
}

/* ============================================================
   GAME HISTORY ARCHIVE
   ============================================================ */

/**
 * Save a completed game to history
 */
function saveToHistory(game, result, winner) {
  try {
    const history = getGameHistory();

    const gameRecord = {
      id: Date.now(),
      pgn: game.pgn(),
      fen: game.fen(),
      result: result,              // 'checkmate', 'stalemate', 'draw', etc.
      winner: winner,              // 'white', 'black', or 'draw'
      moveCount: game.history().length,
      timestamp: Date.now(),
      date: new Date().toISOString()
    };

    history.unshift(gameRecord);  // Add to beginning

    // Keep only last 50 games
    if (history.length > 50) {
      history.splice(50);
    }

    localStorage.setItem(STORAGE_KEYS.GAME_HISTORY, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('Error saving to history:', error);
    return false;
  }
}

/**
 * Get all saved games from history
 */
function getGameHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.GAME_HISTORY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
}

/**
 * Clear all game history
 */
function clearGameHistory() {
  try {
    localStorage.removeItem(STORAGE_KEYS.GAME_HISTORY);
    return true;
  } catch (error) {
    console.error('Error clearing history:', error);
    return false;
  }
}

/* ============================================================
   SETTINGS PERSISTENCE
   ============================================================ */

/**
 * Save user settings
 */
function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

/**
 * Load user settings with defaults
 */
function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);

    const defaultSettings = {
      boardFlipped: false,
      soundEnabled: true,
      autoSave: true,
      showCoordinates: true,
      highlightMoves: true,
      animationSpeed: 'normal'  // 'slow', 'normal', 'fast'
    };

    if (!saved) return defaultSettings;

    // Merge saved settings with defaults (in case new settings added)
    return { ...defaultSettings, ...JSON.parse(saved) };
  } catch (error) {
    console.error('Error loading settings:', error);
    return {
      boardFlipped: false,
      soundEnabled: true,
      autoSave: true,
      showCoordinates: true,
      highlightMoves: true,
      animationSpeed: 'normal'
    };
  }
}

/* ============================================================
   STATISTICS TRACKING
   ============================================================ */

/**
 * Update game statistics
 */
function updateStats(result, winner) {
  try {
    const stats = getStats();

    stats.gamesPlayed++;

    if (result === 'checkmate') {
      if (winner === 'white') stats.whiteWins++;
      if (winner === 'black') stats.blackWins++;
    } else if (result === 'stalemate' || result === 'draw') {
      stats.draws++;
    }

    stats.lastPlayed = Date.now();

    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    return true;
  } catch (error) {
    console.error('Error updating stats:', error);
    return false;
  }
}

/**
 * Get game statistics
 */
function getStats() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.STATS);

    const defaultStats = {
      gamesPlayed: 0,
      whiteWins: 0,
      blackWins: 0,
      draws: 0,
      lastPlayed: null
    };

    if (!saved) return defaultStats;

    return { ...defaultStats, ...JSON.parse(saved) };
  } catch (error) {
    console.error('Error loading stats:', error);
    return {
      gamesPlayed: 0,
      whiteWins: 0,
      blackWins: 0,
      draws: 0,
      lastPlayed: null
    };
  }
}

/**
 * Clear all statistics
 */
function clearStats() {
  try {
    localStorage.removeItem(STORAGE_KEYS.STATS);
    return true;
  } catch (error) {
    console.error('Error clearing stats:', error);
    return false;
  }
}

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

/**
 * Get formatted time since last save
 */
function getTimeSinceLastSave() {
  const saved = loadCurrentGame();
  if (!saved || !saved.timestamp) return null;

  const diff = Date.now() - saved.timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

/**
 * Check localStorage availability
 */
function isStorageAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    console.warn('localStorage not available:', error);
    return false;
  }
}

/**
 * Get storage usage (approximate)
 */
function getStorageUsage() {
  try {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return {
      used: total,
      usedKB: (total / 1024).toFixed(2),
      usedMB: (total / 1024 / 1024).toFixed(2)
    };
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    return { used: 0, usedKB: 0, usedMB: 0 };
  }
}
