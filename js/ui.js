/* ============================================================
   ui.js
   ============================================================
   PURPOSE OF THIS FILE:
   This file updates all the "informational" parts of the page
   that are NOT the board itself:
     - the status line ("White to move", "Checkmate!", etc.)
     - the captured-pieces lists in the side panel
     - the move-history list

   Like board.js and pieces.js, this file does not decide
   anything about chess rules. It only takes information that
   game.js already worked out (using chess.js) and displays it.
   This corresponds to Phase 11 and Phase 13 of the original
   project plan ("game information" and "move history").

   WHO USES THIS FILE:
     - game.js calls setStatusText(), addCapturedPiece(),
       addMoveToHistory(), and clearMoveHistory() every time
       the game state changes.
   ============================================================ */

/**
 * Updates the status line above the board.
 * isCheck: when true, applies a red "check" style via CSS.
 */
function setStatusText(text, isCheck) {
  const statusEl = document.getElementById("status");
  statusEl.textContent = text;
  statusEl.classList.toggle("check", Boolean(isCheck));
}

/**
 * Adds one captured piece's symbol to the correct side panel.
 * capturedColor: the COLOR of the piece that was captured
 * (e.g. if White captures a black pawn, capturedColor is "b",
 * and it should appear in the "Captured by White" box).
 */
function addCapturedPiece(type, capturedColor) {
  const symbol = capturedPieceSymbol(type, capturedColor); // from pieces.js

  // If a black piece was captured, that capture was made BY
  // white, so it goes in the "captured-by-white" box, and
  // vice versa.
  const targetId = capturedColor === "b" ? "captured-by-white" : "captured-by-black";
  const targetEl = document.getElementById(targetId);
  targetEl.textContent += symbol;
}

/**
 * Clears both captured-piece display boxes. Called on New Game.
 */
function clearCapturedPieces() {
  document.getElementById("captured-by-white").textContent = "";
  document.getElementById("captured-by-black").textContent = "";
}

/**
 * Adds a move (in standard algebraic notation, e.g. "e4",
 * "Nf3", "O-O", "Qxe7+") to the move-history list shown on
 * the right side panel. White moves and Black moves are
 * grouped together on one numbered line, like in a real
 * scoresheet: "1. e4  e5".
 *
 * moveColor: "w" or "b" — whose move this was
 * moveNumber: the full-move number (1, 2, 3, ...)
 */
function addMoveToHistory(moveNumber, moveColor, sanText) {
  const listEl = document.getElementById("move-list");

  if (moveColor === "w") {
    // Start a brand-new numbered line for White's move.
    const li = document.createElement("li");
    li.id = "move-row-" + moveNumber;

    const numberSpan = document.createElement("span");
    numberSpan.className = "move-number";
    numberSpan.textContent = moveNumber + ".";

    const whiteSpan = document.createElement("span");
    whiteSpan.className = "move-white";
    whiteSpan.textContent = sanText;

    li.appendChild(numberSpan);
    li.appendChild(whiteSpan);
    listEl.appendChild(li);
  } else {
    // Black's move attaches onto the SAME line White just
    // created (found by the matching move number).
    const row = document.getElementById("move-row-" + moveNumber);
    if (row) {
      const blackSpan = document.createElement("span");
      blackSpan.className = "move-black";
      blackSpan.textContent = sanText;
      row.appendChild(blackSpan);
    }
  }

  // Auto-scroll the move list so the newest move is visible.
  listEl.scrollTop = listEl.scrollHeight;
}

/**
 * Empties the move-history list. Called on New Game.
 */
function clearMoveHistory() {
  document.getElementById("move-list").innerHTML = "";
}

/**
 * Calculate and display material count and advantage
 * Phase 5.5: Material Count Display
 */
function updateMaterialCount() {
  if (typeof chessGame === "undefined") return;

  const board = chessGame.board();
  let whiteMaterial = 0;
  let blackMaterial = 0;

  // Material values (standard chess values)
  const pieceValues = {
    p: 1, // pawn
    n: 3, // knight
    b: 3, // bishop
    r: 5, // rook
    q: 9, // queen
    k: 0, // king (not counted)
  };

  // Count material on the board
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        const value = pieceValues[piece.type] || 0;
        if (piece.color === "w") {
          whiteMaterial += value;
        } else {
          blackMaterial += value;
        }
      }
    }
  }

  // Calculate advantage
  const advantage = whiteMaterial - blackMaterial;
  let displayText = "";
  let advantageClass = "";

  if (advantage > 0) {
    displayText = `White +${advantage}`;
    advantageClass = "advantage-white";
  } else if (advantage < 0) {
    displayText = `Black +${Math.abs(advantage)}`;
    advantageClass = "advantage-black";
  } else {
    displayText = "Equal material";
    advantageClass = "";
  }

  // Display in status area (we'll add a dedicated element)
  const materialEl = document.getElementById("material-count");
  if (materialEl) {
    materialEl.textContent = displayText;
    materialEl.className = "material-count " + advantageClass;

    // Trigger animation if material changed
    if (materialEl.dataset.lastAdvantage !== advantage.toString()) {
      materialEl.classList.add("changed");
      setTimeout(() => {
        materialEl.classList.remove("changed");
      }, 400);
      materialEl.dataset.lastAdvantage = advantage.toString();
    }
  }
}

/**
 * Update move number display
 * Phase 5.5: Move Number Display
 */
function updateMoveNumber() {
  if (typeof chessGame === "undefined") return;

  const moveNumber = Math.floor(chessGame.history().length / 2) + 1;
  const turn = chessGame.turn() === "w" ? "White" : "Black";

  const moveNumberEl = document.getElementById("move-number");
  if (moveNumberEl) {
    moveNumberEl.textContent = `Move ${moveNumber} - ${turn} to play`;
  }
}
