/* ============================================================
   game.js
   ============================================================
   PURPOSE OF THIS FILE:
   This is the BRAIN of the whole application. Every other file
   (board.js, pieces.js, clock.js, ui.js) only knows how to draw
   things on screen — none of them know what a "legal move" is,
   none of them track whose turn it is, and none of them decide
   when the game is over.

   THIS file is the one place where:
     - the actual game state lives (via the chess.js library)
     - clicks are interpreted as move attempts
     - chess.js is asked "is this move legal?"
     - if yes, the move is made, and every other file is told
       to redraw whatever it's responsible for

   This mirrors Phase 5 of the original plan exactly:

       JavaScript state (chess.js "game" object)
               |
               v
       HTML board (rebuilt by calling functions from
                   board.js / pieces.js / ui.js / clock.js)

   chess.js handles everything from Phase 7-8 of the plan
   automatically: legal moves per piece type, check, checkmate,
   stalemate, castling, en passant, and pawn promotion. We never
   have to write "can a bishop move diagonally" ourselves —
   chess.js already implements every official chess rule
   correctly, which is why Phase 8 of the plan recommends using
   it instead of hand-rolling rules.

   LOAD ORDER REQUIREMENT:
   This file MUST be the last <script> tag in index.html,
   because every function it calls (buildBoardSquares,
   drawPiece, setStatusText, startClock, etc.) is defined in
   the files loaded before it.
   ============================================================ */

// ----------------------------------------------------------
// THE GAME STATE
// ----------------------------------------------------------
// `chessGame` is the single source of truth for the entire
// game: board position, whose turn it is, move legality,
// check/checkmate status — all of it. We never touch the DOM
// to figure out game state; we always ask `chessGame`.
let chessGame = new Chess();

// Tracks which square (if any) is currently selected by a
// click, e.g. "e2". null means no piece is selected yet.
let selectedSquare = null;

// Tracks the list of legal destination squares for whichever
// piece is currently selected, so we know what a second click
// is trying to do.
let legalDestinations = [];

// Tracks the full-move number for writing to the move history
// panel (1, 2, 3, ...). Increments after Black's move.
let currentMoveNumber = 1;

// Tracks the currently loaded save slot ID (null if new game or auto-loaded)
let currentSaveId = null;

/**
 * Runs once when the page finishes loading. Sets up the empty
 * board, draws the starting position, wires up button clicks,
 * and starts White's clock.
 */
function initGame() {
  buildBoardSquares();      // board.js: creates the 64 <div> squares
  attachSquareClickHandlers();

  // Try to load saved game, or start fresh
  const loadedSuccessfully = tryLoadSavedGame();
  if (!loadedSuccessfully) {
    renderBoard();             // draw every piece in its starting position
    refreshStatus();           // show "White to move"

    resetClocks();
    startClock("w", handleTimeOut);

    // Save initial game state
    autoSaveGame();
  }

  document.getElementById("new-game-btn").addEventListener("click", startNewGame);
  document.getElementById("undo-btn").addEventListener("click", undoLastMove);
  document.getElementById("flip-btn").addEventListener("click", handleFlipBoard);
}

/**
 * Attaches a click listener to every square. Because
 * buildBoardSquares() is called again on flip/new game, this
 * function must also be re-run any time the squares are
 * rebuilt — handleFlipBoard() and startNewGame() both do this.
 */
function attachSquareClickHandlers() {
  document.querySelectorAll(".square").forEach((squareEl) => {
    squareEl.addEventListener("click", () => {
      onSquareClicked(squareEl.dataset.square);
    });
  });
}

/**
 * Redraws every piece on the board to match chessGame's
 * current position. Called after every move, undo, flip, or
 * new game. This is the "render" half of the state -> render
 * cycle described in Phase 5/6 of the plan.
 */
function renderBoard() {
  const board = chessGame.board(); // 8x8 array of piece objects/nulls

  // chessGame.board() always returns rows from rank 8 down to
  // rank 1, and columns from file a to file h, REGARDLESS of
  // how we're visually displaying the board. So we convert
  // each [row][col] cell to its square name ourselves rather
  // than relying on visual position.
  board.forEach((row, rowIndex) => {
    row.forEach((piece, colIndex) => {
      const file = FILES[colIndex];      // board.js constant
      const rank = RANKS[rowIndex];      // board.js constant
      const squareName = file + rank;
      drawPiece(squareName, piece);      // pieces.js
    });
  });
}

/**
 * The core click-handling logic — this is the two-click
 * "select piece, then choose destination" pattern from
 * Phase 4 of the original plan, but now backed by real rule
 * validation instead of just moving pieces blindly.
 */
function onSquareClicked(squareName) {
  // Ignore clicks entirely once the game has ended.
  if (chessGame.game_over()) return;

  if (selectedSquare === null) {
    trySelectSquare(squareName);
  } else if (squareName === selectedSquare) {
    // Clicking the already-selected square again deselects it.
    clearSelection();
  } else if (legalDestinations.includes(squareName)) {
    attemptMove(selectedSquare, squareName);
  } else {
    // Clicked a different square that isn't a legal target.
    // If it holds one of the current player's own pieces,
    // treat this as selecting that new piece instead.
    clearSelection();
    trySelectSquare(squareName);
  }
}

/**
 * Selects a square IF it holds a piece belonging to the player
 * whose turn it currently is. Then highlights every square
 * that piece could legally move to (using chess.js's built-in
 * move generator, which already accounts for check, pins,
 * castling rights, en passant, etc. — we don't calculate any
 * of that ourselves).
 */
function trySelectSquare(squareName) {
  const piece = chessGame.get(squareName);
  if (!piece || piece.color !== chessGame.turn()) {
    return; // empty square, or it's the opponent's piece — ignore
  }

  // Ask chess.js for every legal move starting from this square.
  const moves = chessGame.moves({ square: squareName, verbose: true });
  if (moves.length === 0) return; // this piece has no legal moves right now

  selectedSquare = squareName;
  legalDestinations = moves.map((m) => m.to);

  clearHighlights();           // board.js
  highlightSelected(squareName);
  moves.forEach((m) => {
    const destinationHasPiece = Boolean(chessGame.get(m.to));
    highlightLegalMove(m.to, destinationHasPiece);
  });
}

/**
 * Clears the current selection and any highlight squares.
 */
function clearSelection() {
  selectedSquare = null;
  legalDestinations = [];
  clearHighlights();
}

/**
 * Attempts to actually make a move from `from` to `to`.
 * Because we only ever call this when `to` is already in
 * `legalDestinations`, the move is guaranteed to be legal —
 * but we still let chess.js itself execute it, since chess.js
 * is also responsible for side effects like:
 *   - removing a captured piece
 *   - moving the rook during castling
 *   - removing a pawn captured en passant
 *   - promoting a pawn that reaches the last rank
 */
function attemptMove(from, to) {
  // Pawn promotion: if a pawn is moving to the final rank,
  // chess.js requires us to specify what it promotes to.
  // For simplicity this game always promotes to a Queen,
  // which is correct in the vast majority of real games.
  const piece = chessGame.get(from);
  const isPromotion =
    piece.type === "p" && (to[1] === "8" || to[1] === "1");

  const moveResult = chessGame.move({
    from: from,
    to: to,
    promotion: isPromotion ? "q" : undefined,
  });

  if (moveResult === null) {
    // Should not normally happen since `to` came from chess.js's
    // own move list, but we guard against it defensively.
    clearSelection();
    return;
  }

  handleSuccessfulMove(moveResult);
}

/**
 * Runs everything that needs to happen after ANY successful
 * move: redraw the board, update highlights, update captured
 * pieces, update move history, switch clocks, and check for
 * game-ending conditions.
 */
function handleSuccessfulMove(moveResult) {
  clearSelection();
  renderBoard();
  highlightLastMove(moveResult.from, moveResult.to);

  // moveResult.captured is set (to a piece type letter) when
  // this move captured an enemy piece, INCLUDING en passant
  // captures, which chess.js also reports here correctly.
  if (moveResult.captured) {
    // The captured piece's color is the OPPOSITE of the color
    // that just moved (moveResult.color).
    const capturedColor = moveResult.color === "w" ? "b" : "w";
    addCapturedPiece(moveResult.captured, capturedColor);
  }

  // Record the move in the history panel using Standard
  // Algebraic Notation (SAN), which chess.js already computed
  // for us, e.g. "Nf3", "exd5", "O-O", "Qh5+", "Re8#".
  addMoveToHistory(currentMoveNumber, moveResult.color, moveResult.san);
  if (moveResult.color === "b") {
    currentMoveNumber += 1;
  }

  refreshStatus();

  // Auto-save game after every move
  autoSaveGame();

  if (chessGame.game_over()) {
    stopClock();
    handleGameOver();
    return;
  }

  // Hand the clock over to whichever color moves next.
  startClock(chessGame.turn(), handleTimeOut);
}

/**
 * Reads the current state from chess.js and updates the status
 * line + check highlight accordingly. Covers every game-over
 * condition chess.js can detect: checkmate, stalemate,
 * threefold repetition, insufficient material, and the
 * 50-move rule, in addition to ordinary "X to move" / "in check".
 */
function refreshStatus() {
  reapplyLastMoveHighlight();

  const turnColor = chessGame.turn() === "w" ? "White" : "Black";

  // Phase 5.5: Update material count and move number
  if (typeof updateMaterialCount === "function") {
    updateMaterialCount();
  }
  if (typeof updateMoveNumber === "function") {
    updateMoveNumber();
  }

  if (chessGame.in_checkmate()) {
    const winner = chessGame.turn() === "w" ? "Black" : "White";
    setStatusText("Checkmate! " + winner + " wins.", true);
    highlightKingInCheck();
    return;
  }

  if (chessGame.in_stalemate()) {
    setStatusText("Stalemate — the game is a draw.", false);
    return;
  }

  if (chessGame.in_threefold_repetition()) {
    setStatusText("Draw by threefold repetition.", false);
    return;
  }

  if (chessGame.insufficient_material()) {
    setStatusText("Draw — insufficient material to checkmate.", false);
    return;
  }

  if (chessGame.in_draw()) {
    setStatusText("Draw (50-move rule).", false);
    return;
  }

  if (chessGame.in_check()) {
    setStatusText(turnColor + " is in check!", true);
    highlightKingInCheck();
    return;
  }

  setStatusText(turnColor + " to move", false);
}

/**
 * Re-applies the last-move highlight after clearHighlights()
 * runs, since refreshStatus() always clears highlights first.
 * We re-derive the last move from chess.js's own move history
 * rather than tracking extra duplicate state ourselves.
 */
function reapplyLastMoveHighlight() {
  const history = chessGame.history({ verbose: true });
  clearHighlights();
  if (history.length > 0) {
    const last = history[history.length - 1];
    highlightLastMove(last.from, last.to);
  }
}

/**
 * Finds whichever king is currently in check and applies the
 * appropriate highlight to its square.
 * Uses different styling for check vs checkmate.
 */
function highlightKingInCheck() {
  const colorInCheck = chessGame.turn(); // side to move is the side in check
  const board = chessGame.board();
  const isCheckmate = chessGame.in_checkmate();

  board.forEach((row, rowIndex) => {
    row.forEach((piece, colIndex) => {
      if (piece && piece.type === "k" && piece.color === colorInCheck) {
        const squareName = FILES[colIndex] + RANKS[rowIndex];
        const squareEl = getSquareElement(squareName);

        if (squareEl) {
          if (isCheckmate) {
            // Darker, more intense red for checkmate
            squareEl.classList.add("checkmate");
          } else {
            // Orange-red for check (warning)
            highlightCheck(squareName);
          }
        }
      }
    });
  });
}

/**
 * Called by clock.js if either player's time runs out.
 */
function handleTimeOut(colorThatRanOut) {
  const winner = colorThatRanOut === "w" ? "Black" : "White";
  setStatusText(winner + " wins on time!", false);
}

/**
 * Resets the entire game back to the starting position.
 * Wired to the "New Game" button.
 */
function startNewGame() {
  // Save current game to history if it has moves
  if (chessGame.history().length > 0) {
    const result = getGameResult();
    saveToHistory(chessGame, result.type, result.winner);
  }

  // Clear saved game and start fresh
  clearCurrentGame();

  chessGame = new Chess();
  currentMoveNumber = 1;
  currentSaveId = null; // Clear loaded save tracking
  clearSelection();

  clearMoveHistory();      // ui.js
  clearCapturedPieces();   // ui.js

  renderBoard();
  refreshStatus();

  resetClocks();           // clock.js
  startClock("w", handleTimeOut);

  // Save initial position
  autoSaveGame();
}

/**
 * Undoes the most recent move (chess.js keeps its own internal
 * history, so this is a single built-in call). Wired to the
 * "Undo Move" button.
 */
function undoLastMove() {
  const undone = chessGame.undo();
  if (!undone) return; // nothing to undo

  clearSelection();
  renderBoard();
  refreshStatus();

  // Resume the clock for whoever's turn it now is. Note: this
  // simple implementation does not "give back" elapsed time —
  // it just resumes counting down for the correct side.
  startClock(chessGame.turn(), handleTimeOut);
}

/**
 * Flips the visual board orientation. Because buildBoardSquares()
 * wipes and recreates every square element, we must re-attach
 * click handlers and redraw pieces + highlights afterward.
 */
function handleFlipBoard() {
  flipBoard(); // board.js — rebuilds squares in reverse order
  attachSquareClickHandlers();
  renderBoard();
  reapplyLastMoveHighlight();
}

// ----------------------------------------------------------
// STORAGE INTEGRATION FUNCTIONS
// ----------------------------------------------------------

/**
 * Auto-save the current game state after every move
 */
function autoSaveGame() {
  if (typeof saveCurrentGame === 'function') {
    const capturedPieces = {
      white: getCapturedByColor('w'),
      black: getCapturedByColor('b')
    };
    saveCurrentGame(chessGame, chessGame.history(), capturedPieces, getGameStatus());

    // Show save indicator
    if (typeof showSaveIndicator === 'function') {
      showSaveIndicator();
    }
  }
}

/**
 * Manual save function - exposed globally for save button
 * This is a wrapper that has access to game.js scope
 */
window.saveGameManually = function() {
  try {
    if (typeof saveCurrentGame !== 'function') {
      console.error('saveCurrentGame function not found');
      return false;
    }

    if (typeof chessGame === 'undefined' || !chessGame) {
      console.error('chessGame not initialized');
      return false;
    }

    const capturedPieces = {
      white: getCapturedByColor('w'),
      black: getCapturedByColor('b')
    };

    const saved = saveCurrentGame(
      chessGame,
      chessGame.history(),
      capturedPieces,
      getGameStatus()
    );

    console.log('Manual save completed:', saved);
    return saved;
  } catch (error) {
    console.error('Error in saveGameManually:', error);
    return false;
  }
};

/**
 * Get the current save ID (for UI to check if updating existing save)
 */
window.getCurrentSaveId = function() {
  return currentSaveId;
};

/**
 * Save game to a named slot
 * If currentSaveId is set, updates that save; otherwise creates new
 */
window.saveGameToNamedSlot = function(saveName) {
  try {
    if (typeof saveGameToSlot !== 'function') {
      console.error('saveGameToSlot function not found');
      return false;
    }

    if (typeof chessGame === 'undefined' || !chessGame) {
      console.error('chessGame not initialized');
      return false;
    }

    // Pass currentSaveId to update existing save if one was loaded
    const result = saveGameToSlot(chessGame, saveName, currentSaveId);

    // Update currentSaveId with the save that was just created/updated
    if (result && result.id) {
      currentSaveId = result.id;
    }

    console.log('Saved to slot:', result, 'currentSaveId:', currentSaveId);
    return result;
  } catch (error) {
    console.error('Error in saveGameToNamedSlot:', error);
    return false;
  }
};

/**
 * Load game from a named slot by ID
 */
window.loadGameFromSlot = function(saveId) {
  try {
    if (typeof loadSavedGameById !== 'function') {
      console.error('loadSavedGameById function not found');
      return false;
    }

    const saveData = loadSavedGameById(saveId);
    if (!saveData || !saveData.fen) {
      console.error('Save data not found or invalid');
      return false;
    }

    console.log('Loading game from FEN:', saveData.fen);

    // Load the FEN position
    const loaded = chessGame.load(saveData.fen);
    if (!loaded) {
      console.error('Failed to load FEN');
      return false;
    }

    // Refresh the board and UI
    currentMoveNumber = Math.floor(chessGame.history().length / 2) + 1;
    renderBoard();
    refreshStatus();

    // Clear and rebuild move history UI
    clearMoveHistory();
    const history = chessGame.history({ verbose: true });
    history.forEach((move, index) => {
      const moveNum = Math.floor(index / 2) + 1;
      addMoveToHistory(moveNum, move.color, move.san);
    });

    // Clear captured pieces (will be rebuilt as moves are made)
    clearCapturedPieces();

    // Reset clocks
    if (!chessGame.game_over()) {
      resetClocks();
      startClock(chessGame.turn(), handleTimeOut);
    }

    // Track which save was loaded
    currentSaveId = saveId;

    // Auto-save the loaded game to CURRENT_GAME so changes are tracked
    autoSaveGame();

    console.log('Game loaded successfully from slot:', saveId);
    return true;
  } catch (error) {
    console.error('Error in loadGameFromSlot:', error);
    return false;
  }
};

/**
 * Try to load a saved game on startup
 */
function tryLoadSavedGame() {
  try {
    if (typeof loadCurrentGame !== 'function' || !hasSavedGame()) {
      return false;
    }

    const saved = loadCurrentGame();
    if (!saved || !saved.fen) {
      console.log('No valid saved game found');
      return false;
    }

    console.log('Loading saved game from FEN');

    // Load the FEN position
    const loaded = chessGame.load(saved.fen);
    if (!loaded) {
      console.error('Failed to load saved game FEN');
      return false;
    }

    // Restore captured pieces
    if (saved.capturedPieces) {
      if (saved.capturedPieces.white) {
        saved.capturedPieces.white.forEach(piece => {
          addCapturedPiece(piece.type, piece.color);
        });
      }
      if (saved.capturedPieces.black) {
        saved.capturedPieces.black.forEach(piece => {
          addCapturedPiece(piece.type, piece.color);
        });
      }
    }

    // Restore move history UI
    clearMoveHistory();
    const history = chessGame.history({ verbose: true });
    history.forEach((move, index) => {
      const moveNum = Math.floor(index / 2) + 1;
      addMoveToHistory(moveNum, move.color, move.san);
    });

    // Update move counter
    currentMoveNumber = Math.floor(chessGame.history().length / 2) + 1;

    // Render everything
    renderBoard();
    refreshStatus();

    // Start appropriate clock
    if (!chessGame.game_over()) {
      resetClocks();
      startClock(chessGame.turn(), handleTimeOut);
    }

    return true;
  } catch (error) {
    console.error('Error loading saved game:', error);
    return false;
  }
}

/**
 * Get current game status
 */
function getGameStatus() {
  if (chessGame.in_checkmate()) return 'checkmate';
  if (chessGame.in_stalemate()) return 'stalemate';
  if (chessGame.in_draw()) return 'draw';
  if (chessGame.in_check()) return 'check';
  return 'ongoing';
}

/**
 * Get game result for history/stats
 */
function getGameResult() {
  if (chessGame.in_checkmate()) {
    const winner = chessGame.turn() === 'w' ? 'black' : 'white';
    return { type: 'checkmate', winner: winner };
  }
  if (chessGame.in_stalemate()) {
    return { type: 'stalemate', winner: 'draw' };
  }
  if (chessGame.in_draw()) {
    return { type: 'draw', winner: 'draw' };
  }
  return { type: 'ongoing', winner: null };
}

/**
 * Handle game over - save to history and update stats
 */
function handleGameOver() {
  if (typeof saveToHistory === 'function' && typeof updateStats === 'function') {
    const result = getGameResult();
    saveToHistory(chessGame, result.type, result.winner);
    updateStats(result.type, result.winner);
  }
  // Clear current game save since it's complete
  if (typeof clearCurrentGame === 'function') {
    clearCurrentGame();
  }
}

/**
 * Get captured pieces by color for saving
 */
function getCapturedByColor(color) {
  const container = color === 'w' ?
    document.getElementById('captured-by-white') :
    document.getElementById('captured-by-black');

  if (!container) return [];

  const pieces = [];
  const symbols = container.textContent;

  // Simple extraction - each Unicode piece is one character
  for (let char of symbols) {
    if (char.trim()) {
      pieces.push({
        symbol: char,
        color: color === 'w' ? 'b' : 'w', // Captured pieces are opposite color
        type: getPieceTypeFromSymbol(char)
      });
    }
  }

  return pieces;
}

/**
 * Get piece type from Unicode symbol
 */
function getPieceTypeFromSymbol(symbol) {
  const map = {
    '♙': 'p', '♟': 'p',
    '♘': 'n', '♞': 'n',
    '♗': 'b', '♝': 'b',
    '♖': 'r', '♜': 'r',
    '♕': 'q', '♛': 'q',
    '♔': 'k', '♚': 'k'
  };
  return map[symbol] || 'p';
}

// ----------------------------------------------------------
// ENTRY POINT
// ----------------------------------------------------------
// Wait for the full HTML document to be parsed before touching
// any DOM elements (in case this script were ever moved to the
// <head>; it's good practice regardless).
document.addEventListener("DOMContentLoaded", initGame);
