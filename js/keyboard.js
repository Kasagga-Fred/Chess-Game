/* ============================================================
   keyboard.js - Phase 5: Keyboard Shortcuts
   ============================================================
   PURPOSE:
   Provides keyboard shortcuts for common game actions.

   Shortcuts:
   - N: New Game
   - U: Undo Move
   - F: Flip Board
   - ESC: Clear Selection
   - Arrow Keys: Navigate move history (future feature)

   WHO USES THIS FILE:
   - Loaded in index.html after game.js
   - Initializes on page load
   ============================================================ */

/**
 * Initialize keyboard shortcuts
 * Call this after the DOM is loaded and game.js is initialized
 */
function initKeyboardShortcuts() {
  document.addEventListener("keydown", handleKeyPress);
  console.log("⌨️ Keyboard shortcuts enabled");
}

/**
 * Handle keyboard events
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleKeyPress(event) {
  // Ignore if user is typing in an input field
  if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
    return;
  }

  const key = event.key.toLowerCase();

  // Prevent default behavior for shortcuts we handle
  const handledKeys = ["n", "u", "f", "escape"];
  if (handledKeys.includes(key)) {
    event.preventDefault();
  }

  switch (key) {
    case "n":
      handleNewGameShortcut();
      break;

    case "u":
      handleUndoShortcut();
      break;

    case "f":
      handleFlipBoardShortcut();
      break;

    case "escape":
      handleClearSelectionShortcut();
      break;

    // Future: Arrow key navigation through move history
    case "arrowleft":
      // handlePreviousMoveShortcut();
      break;

    case "arrowright":
      // handleNextMoveShortcut();
      break;

    case "arrowup":
      // handleFirstMoveShortcut();
      break;

    case "arrowdown":
      // handleLastMoveShortcut();
      break;

    default:
      // Key not handled
      break;
  }
}

/**
 * Handle "N" key - New Game
 */
function handleNewGameShortcut() {
  // Check if there's an active game
  if (typeof chessGame !== "undefined" && chessGame.history().length > 0) {
    // Confirm before starting new game if moves have been made
    if (confirm("Start a new game? Current game will be lost.")) {
      const newGameBtn = document.getElementById("new-game-btn");
      if (newGameBtn) {
        newGameBtn.click();
      } else {
        // Fallback: call initGame directly if button doesn't exist
        if (typeof initGame === "function") {
          initGame();
        }
      }
      showKeyboardFeedback("New game started");
    }
  } else {
    // No active game, just start new one
    const newGameBtn = document.getElementById("new-game-btn");
    if (newGameBtn) {
      newGameBtn.click();
    } else if (typeof initGame === "function") {
      initGame();
    }
    showKeyboardFeedback("New game started");
  }
}

/**
 * Handle "U" key - Undo Move
 */
function handleUndoShortcut() {
  const undoBtn = document.getElementById("undo-btn");
  if (undoBtn) {
    // Check if button is disabled
    if (!undoBtn.disabled) {
      undoBtn.click();
      showKeyboardFeedback("Move undone");
    } else {
      showKeyboardFeedback("Nothing to undo", true);
    }
  } else {
    // Fallback: call undo function directly if it exists
    if (typeof undoMove === "function") {
      undoMove();
      showKeyboardFeedback("Move undone");
    }
  }
}

/**
 * Handle "F" key - Flip Board
 */
function handleFlipBoardShortcut() {
  const flipBtn = document.getElementById("flip-btn");
  if (flipBtn) {
    flipBtn.click();
    showKeyboardFeedback("Board flipped");
  } else {
    // Fallback: call flip function directly if it exists
    if (typeof flipBoard === "function") {
      flipBoard();
      showKeyboardFeedback("Board flipped");
    }
  }
}

/**
 * Handle "ESC" key - Clear Selection
 */
function handleClearSelectionShortcut() {
  // Clear any selected square
  if (typeof selectedSquare !== "undefined" && selectedSquare !== null) {
    selectedSquare = null;
    clearAllHighlights();
    showKeyboardFeedback("Selection cleared");
  } else {
    // No selection to clear
    showKeyboardFeedback("No selection to clear", true);
  }
}

/**
 * Show temporary visual feedback for keyboard actions
 * @param {string} message - The feedback message
 * @param {boolean} isWarning - Whether this is a warning/error message
 */
function showKeyboardFeedback(message, isWarning = false) {
  // Remove any existing feedback
  const existingFeedback = document.getElementById("keyboard-feedback");
  if (existingFeedback) {
    existingFeedback.remove();
  }

  // Create feedback element
  const feedback = document.createElement("div");
  feedback.id = "keyboard-feedback";
  feedback.className = "keyboard-feedback" + (isWarning ? " warning" : "");
  feedback.textContent = message;

  // Add to page
  document.body.appendChild(feedback);

  // Trigger animation
  requestAnimationFrame(() => {
    feedback.classList.add("visible");
  });

  // Remove after animation
  setTimeout(() => {
    feedback.classList.remove("visible");
    setTimeout(() => {
      feedback.remove();
    }, 300);
  }, 1500);
}

/**
 * Get a help text for all keyboard shortcuts
 * @returns {string} - HTML string with all shortcuts
 */
function getKeyboardShortcutsHelp() {
  return `
    <div class="keyboard-shortcuts-help">
      <h3>⌨️ Keyboard Shortcuts</h3>
      <ul>
        <li><kbd>N</kbd> - New Game</li>
        <li><kbd>U</kbd> - Undo Move</li>
        <li><kbd>F</kbd> - Flip Board</li>
        <li><kbd>ESC</kbd> - Clear Selection</li>
      </ul>
      <p class="shortcuts-note">More shortcuts coming soon!</p>
    </div>
  `;
}

/**
 * Show keyboard shortcuts help dialog
 */
function showKeyboardHelp() {
  const helpHTML = getKeyboardShortcutsHelp();
  // For now, just show an alert (can be upgraded to modal later)
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = helpHTML;
  const textContent = tempDiv.textContent || tempDiv.innerText;
  alert(textContent);
}

// Optional: Add "?" key to show help
document.addEventListener("keydown", (event) => {
  if (event.key === "?" && event.shiftKey) {
    event.preventDefault();
    showKeyboardHelp();
  }
});
