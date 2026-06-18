/* ============================================================
   pieces.js
   ============================================================
   PURPOSE OF THIS FILE:
   This file knows how to turn a chess.js "piece object" into
   something visible on the screen (a Unicode chess character),
   and how to draw/remove that character on a specific square.

   chess.js represents each piece on the board as an object
   like:
       { type: "p", color: "b" }   // a black pawn
       { type: "k", color: "w" }   // a white king

   Piece type codes (lowercase, regardless of color):
       p = pawn, n = knight, b = bishop,
       r = rook, q = queen,  k = king

   This file does NOT know anything about whose turn it is, or
   whether a move is legal. It is a pure "translator + renderer"
   for pieces, similar in spirit to Phase 3 of the original
   project plan ("put a piece symbol on a square").

   WHO USES THIS FILE:
     - game.js calls renderBoard(), which calls drawPiece() for
       every occupied square, every time the position changes.
   ============================================================ */

// Map of color+type -> Unicode chess glyph.
// Keys are built as colorLetter + typeLetter, e.g. "wp", "bk".
const PIECE_UNICODE = {
  wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
  bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚",
};

/**
 * Converts a chess.js piece object ({ type, color }) into the
 * Unicode character we display. Returns an empty string if no
 * piece is passed in (i.e. the square is empty).
 */
function pieceToSymbol(piece) {
  if (!piece) return "";
  const key = piece.color + piece.type; // e.g. "w" + "p" = "wp"
  return PIECE_UNICODE[key] || "";
}

/**
 * Draws (or clears) a piece glyph inside a given square element.
 * squareName: e.g. "e4"
 * piece: a chess.js piece object, or null/undefined for empty
 */
function drawPiece(squareName, piece) {
  const squareEl = getSquareElement(squareName); // from board.js
  if (!squareEl) return;

  // Remove any existing piece glyph in this square first,
  // without touching the coordinate labels board.js added.
  const existing = squareEl.querySelector(".piece");
  if (existing) existing.remove();

  const symbol = pieceToSymbol(piece);
  if (!symbol) return; // square is empty, nothing more to draw

  const pieceEl = document.createElement("span");
  pieceEl.className = "piece";
  pieceEl.textContent = symbol;
  squareEl.appendChild(pieceEl);
}

/**
 * Returns the Unicode glyph for a captured piece, used by
 * ui.js when listing captured pieces in the side panel.
 * Accepts a raw type letter ("p","n","b","r","q") and the
 * color of the piece that was captured.
 */
function capturedPieceSymbol(type, color) {
  return PIECE_UNICODE[color + type] || "";
}
