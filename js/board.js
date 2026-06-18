/* ============================================================
   board.js
   ============================================================
   PURPOSE OF THIS FILE:
   This file is responsible for the VISUAL BOARD ONLY.
   It does not know anything about chess rules. It does not
   know what a "legal move" is. Its only job is:

     1. Build the 64 square <div> elements inside #board
     2. Know how to convert between square names ("e4") and
        grid positions (row 4, col 4)
     3. Provide functions to highlight/clear squares (selected,
        legal-move, last-move, check) by toggling CSS classes
        that style.css defines the appearance for

   WHO USES THIS FILE:
     - game.js calls buildBoardSquares() once, when the page
       loads, to create the squares.
     - game.js calls highlightSquare(), clearHighlights(), etc.
       every time the player clicks, to update what's shown.
     - pieces.js uses getSquareElement() to know WHERE on the
       board to draw a piece image/symbol.

   This file has NO idea that chess.js exists. That separation
   is intentional and mirrors Phase 5 of the original plan:
   "JavaScript state is the source of truth, HTML/DOM is only
   a display of that state."
   ============================================================ */

// All 8 files (columns) and ranks (rows) in standard chess notation.
// File "a" is the leftmost column from White's point of view;
// Rank "8" is the top row from White's point of view.
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

// Tracks whether the board is currently drawn from White's
// perspective (default) or rotated for Black (Flip Board button).
let boardFlipped = false;

/**
 * Builds the 64 square <div> elements and inserts them into
 * the #board container in the DOM. Each square gets:
 *   - a unique id like "square-e4" so we can find it later
 *   - a class of "light" or "dark" for checkerboard coloring
 *   - a data-square attribute holding its chess notation name
 *   - small rank/file coordinate labels along the edges
 *
 * This function does NOT place any pieces. That happens in
 * pieces.js / game.js, which run after the empty board exists.
 */
function buildBoardSquares() {
  const boardEl = document.getElementById("board");
  boardEl.innerHTML = ""; // clear out any old squares first

  // Decide draw order based on flip state. Normally we draw
  // rank 8 down to rank 1, and file a to file h (White's view).
  // When flipped, we simply reverse both loops.
  const ranksToDraw = boardFlipped ? [...RANKS].reverse() : RANKS;
  const filesToDraw = boardFlipped ? [...FILES].reverse() : FILES;

  ranksToDraw.forEach((rank, rowIndex) => {
    filesToDraw.forEach((file, colIndex) => {
      const squareName = file + rank; // e.g. "e4"

      const squareEl = document.createElement("div");
      squareEl.id = "square-" + squareName;
      squareEl.dataset.square = squareName;

      // Standard chessboard coloring rule: a square is light
      // if (file index + rank index) is even, dark if odd.
      // We compute this using the UNFLIPPED indices so the
      // actual color of e.g. e4 never changes when you flip
      // the board (only the viewing angle changes).
      const fileIndex = FILES.indexOf(file);
      const rankIndex = RANKS.indexOf(rank);
      const isLight = (fileIndex + rankIndex) % 2 === 0;
      squareEl.classList.add("square", isLight ? "light" : "dark");

      // Add small coordinate labels on the edge squares only,
      // like a real chess board (file letters along one edge,
      // rank numbers along another).
      if (rowIndex === 7) {
        const fileLabel = document.createElement("span");
        fileLabel.className = "coord file";
        fileLabel.textContent = file;
        squareEl.appendChild(fileLabel);
      }
      if (colIndex === 0) {
        const rankLabel = document.createElement("span");
        rankLabel.className = "coord rank";
        rankLabel.textContent = rank;
        squareEl.appendChild(rankLabel);
      }

      boardEl.appendChild(squareEl);
    });
  });
}

/**
 * Returns the DOM element for a given square name, e.g. "e4".
 * Used by pieces.js (to draw pieces) and game.js (to attach
 * click listeners and apply highlight classes).
 */
function getSquareElement(squareName) {
  return document.getElementById("square-" + squareName);
}

/**
 * Removes every highlight-related class from every square.
 * Called by game.js at the start of each click-handling cycle
 * so old highlights don't linger.
 */
function clearHighlights() {
  document.querySelectorAll(".square").forEach((sq) => {
    sq.classList.remove("selected", "legal-move", "has-piece", "last-move", "in-check");
  });
}

/**
 * Adds the "selected" highlight class to one square — used to
 * show which piece the player just clicked on.
 */
function highlightSelected(squareName) {
  const el = getSquareElement(squareName);
  if (el) el.classList.add("selected");
}

/**
 * Adds the "legal-move" highlight (a small dot, or a ring if
 * the destination square has an enemy piece on it) so the
 * player can see every square their selected piece could
 * legally move to.
 */
function highlightLegalMove(squareName, occupied) {
  const el = getSquareElement(squareName);
  if (!el) return;
  el.classList.add("legal-move");
  if (occupied) el.classList.add("has-piece");
}

/**
 * Highlights the from/to squares of the most recently played
 * move, so players can see at a glance what just happened.
 */
function highlightLastMove(fromSquare, toSquare) {
  const fromEl = getSquareElement(fromSquare);
  const toEl = getSquareElement(toSquare);
  if (fromEl) fromEl.classList.add("last-move");
  if (toEl) toEl.classList.add("last-move");
}

/**
 * Highlights the square a king is standing on when that king
 * is currently in check (red glow).
 */
function highlightCheck(squareName) {
  const el = getSquareElement(squareName);
  if (el) el.classList.add("in-check");
}

/**
 * Flips the board's viewing orientation and rebuilds the
 * squares. game.js is responsible for re-drawing the pieces
 * afterward, since this function only rebuilds empty squares.
 */
function flipBoard() {
  boardFlipped = !boardFlipped;
  buildBoardSquares();
}
