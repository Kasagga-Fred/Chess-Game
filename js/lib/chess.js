/* ============================================================
   chess.js  (local replacement engine)
   ============================================================
   WHY THIS FILE EXISTS / WHAT HAPPENED BEFORE:

   Attempt 1: loaded chess.js from a CDN as a plain <script>.
   That file ends in an ES-module `export` statement, which a
   plain script can't parse -> "Unexpected token 'export'".

   Attempt 2: hand-transcribed the classic 0x88 offset-board
   version of chess.js from memory to avoid the CDN. That
   version uses large hard-coded numeric lookup tables (ATTACKS,
   RAYS) to figure out which pieces attack which squares. One
   of those numbers was wrong, which caused an infinite loop
   the very first time a move was made (a sliding-piece "ray"
   walk with a zero step size that never reaches its target).
   That's a dangerous kind of bug — silent until a specific
   board position triggers it — so rather than hunt for the
   one wrong digit in a 200+ number table, this file replaces
   the whole engine with a simpler design that's much easier to
   verify by eye AND was actually run and tested in this
   environment before being handed to you.

   THIS VERSION uses an ordinary 8x8 two-dimensional array
   (row 0 = rank 8, row 7 = rank 1) and plain loop-based move
   generation — no offset tables, no magic numbers. It is
   slower than the "real" chess.js for searching millions of
   positions (irrelevant for a human-vs-human browser game) but
   far easier to confirm correct.

   It exposes the SAME public API that game.js, ui.js, etc.
   already call, so no other file needs to change:
     new Chess()
     .board()  .get(sq)  .turn()  .move({from,to,promotion})
     .moves({square, verbose})  .undo()  .history({verbose})
     .in_check()  .in_checkmate()  .in_stalemate()
     .in_threefold_repetition()  .insufficient_material()
     .in_draw()  .game_over()
   ============================================================ */

var Chess = function () {
  var WHITE = "w";
  var BLACK = "b";

  var FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

  // board[row][col] — row 0 is rank 8 (Black's back row),
  // row 7 is rank 1 (White's back row). col 0 is file a.
  // Each occupied cell holds { type: 'p'|'n'|'b'|'r'|'q'|'k', color: 'w'|'b' }.
  var board = [];

  var turn = WHITE;

  // Castling rights, e.g. { w: {king:true, queen:true}, b: {...} }
  var castlingRights;

  // En-passant target square as {row, col}, or null.
  var epTarget;

  // History stack of {move, prevState} so undo() can fully
  // restore the position, including castling rights & en
  // passant target (which a simple piece swap can't recover).
  var moveHistory = [];

  // Tracks FEN-like position strings for threefold repetition.
  var positionLog = [];

  function squareToRowCol(square) {
    var file = square.charCodeAt(0) - "a".charCodeAt(0);
    var rank = parseInt(square.charAt(1), 10);
    var row = 8 - rank;
    return { row: row, col: file };
  }

  function rowColToSquare(row, col) {
    return FILES[col] + (8 - row);
  }

  function inBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  function cloneBoard(src) {
    var copy = [];
    for (var r = 0; r < 8; r++) {
      copy.push(src[r].slice());
    }
    return copy;
  }

  function setupStartingPosition() {
    board = [];
    for (var r = 0; r < 8; r++) {
      board.push([null, null, null, null, null, null, null, null]);
    }

    var backRank = ["r", "n", "b", "q", "k", "b", "n", "r"];
    for (var c = 0; c < 8; c++) {
      board[0][c] = { type: backRank[c], color: BLACK };
      board[1][c] = { type: "p", color: BLACK };
      board[6][c] = { type: "p", color: WHITE };
      board[7][c] = { type: backRank[c], color: WHITE };
    }

    turn = WHITE;
    castlingRights = {
      w: { king: true, queen: true },
      b: { king: true, queen: true },
    };
    epTarget = null;
    moveHistory = [];
    positionLog = [];
  }

  setupStartingPosition();

  function opponent(color) {
    return color === WHITE ? BLACK : WHITE;
  }

  function findKing(color) {
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var piece = board[r][c];
        if (piece && piece.type === "k" && piece.color === color) {
          return { row: r, col: c };
        }
      }
    }
    return null; // should never happen in a valid game
  }

  /**
   * Returns true if `color`'s opponent currently attacks the
   * given row/col. Used for both "is the king in check" and
   * for verifying castling doesn't move through/into check.
   */
  function isSquareAttacked(row, col, byColor) {
    // Pawns: byColor's pawns attack diagonally toward the
    // opposite color's side.
    var pawnDir = byColor === WHITE ? 1 : -1; // White pawns attack upward (toward lower row numbers) from their own perspective, so a white pawn at row+1 attacks row.
    var pawnRow = row + pawnDir;
    if (inBounds(pawnRow, col - 1)) {
      var p1 = board[pawnRow][col - 1];
      if (p1 && p1.type === "p" && p1.color === byColor) return true;
    }
    if (inBounds(pawnRow, col + 1)) {
      var p2 = board[pawnRow][col + 1];
      if (p2 && p2.type === "p" && p2.color === byColor) return true;
    }

    // Knights
    var knightJumps = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (var k = 0; k < knightJumps.length; k++) {
      var nr = row + knightJumps[k][0];
      var nc = col + knightJumps[k][1];
      if (inBounds(nr, nc)) {
        var np = board[nr][nc];
        if (np && np.type === "n" && np.color === byColor) return true;
      }
    }

    // King (adjacent squares)
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        var kr = row + dr;
        var kc = col + dc;
        if (inBounds(kr, kc)) {
          var kp = board[kr][kc];
          if (kp && kp.type === "k" && kp.color === byColor) return true;
        }
      }
    }

    // Sliding pieces: rook/queen along ranks+files,
    // bishop/queen along diagonals.
    var rookDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    var bishopDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (var rd = 0; rd < rookDirs.length; rd++) {
      var dir = rookDirs[rd];
      var rr = row + dir[0];
      var rc = col + dir[1];
      while (inBounds(rr, rc)) {
        var piece = board[rr][rc];
        if (piece) {
          if (
            piece.color === byColor &&
            (piece.type === "r" || piece.type === "q")
          ) {
            return true;
          }
          break; // blocked by any piece (friend or foe)
        }
        rr += dir[0];
        rc += dir[1];
      }
    }

    for (var bd = 0; bd < bishopDirs.length; bd++) {
      var bdir = bishopDirs[bd];
      var br = row + bdir[0];
      var bc = col + bdir[1];
      while (inBounds(br, bc)) {
        var bpiece = board[br][bc];
        if (bpiece) {
          if (
            bpiece.color === byColor &&
            (bpiece.type === "b" || bpiece.type === "q")
          ) {
            return true;
          }
          break;
        }
        br += bdir[0];
        bc += bdir[1];
      }
    }

    return false;
  }

  function isInCheck(color) {
    var kingPos = findKing(color);
    if (!kingPos) return false;
    return isSquareAttacked(kingPos.row, kingPos.col, opponent(color));
  }

  /**
   * Generates every PSEUDO-legal move for the piece at (row,col)
   * — i.e. moves that follow the piece's movement pattern and
   * don't capture the mover's own piece, but WITHOUT checking
   * whether the move leaves the mover's own king in check.
   * Each move is { fromRow, fromCol, toRow, toCol, flag }.
   * flag is one of: "normal", "capture", "double-pawn",
   * "en-passant", "castle-king", "castle-queen", "promotion".
   */
  function pseudoMovesForSquare(row, col) {
    var piece = board[row][col];
    if (!piece) return [];

    var moves = [];
    var color = piece.color;

    function tryAdd(toRow, toCol, flag) {
      if (!inBounds(toRow, toCol)) return;
      var target = board[toRow][toCol];
      if (target && target.color === color) return; // can't capture own piece

      var finalFlag = flag || (target ? "capture" : "normal");

      // Pawn reaching the last rank promotes instead of a normal move.
      if (piece.type === "p" && (toRow === 0 || toRow === 7)) {
        finalFlag = "promotion";
      }

      moves.push({
        fromRow: row,
        fromCol: col,
        toRow: toRow,
        toCol: toCol,
        flag: finalFlag,
      });
    }

    if (piece.type === "p") {
      var dir = color === WHITE ? -1 : 1; // White moves toward row 0 (rank 8)
      var startRow = color === WHITE ? 6 : 1;

      // One square forward
      if (inBounds(row + dir, col) && !board[row + dir][col]) {
        tryAdd(row + dir, col, undefined);

        // Two squares forward from the starting row
        if (row === startRow && !board[row + 2 * dir][col]) {
          tryAdd(row + 2 * dir, col, "double-pawn");
        }
      }

      // Diagonal captures
      [-1, 1].forEach(function (dc) {
        var tr = row + dir;
        var tc = col + dc;
        if (!inBounds(tr, tc)) return;
        var target = board[tr][tc];
        if (target && target.color !== color) {
          tryAdd(tr, tc, undefined);
        } else if (
          epTarget &&
          epTarget.row === tr &&
          epTarget.col === tc
        ) {
          tryAdd(tr, tc, "en-passant");
        }
      });
    } else if (piece.type === "n") {
      var knightJumps = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ];
      knightJumps.forEach(function (jmp) {
        tryAdd(row + jmp[0], col + jmp[1], undefined);
      });
    } else if (piece.type === "k") {
      for (var dr = -1; dr <= 1; dr++) {
        for (var dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          tryAdd(row + dr, col + dc, undefined);
        }
      }

      // Castling
      var rights = castlingRights[color];
      var homeRow = color === WHITE ? 7 : 0;
      if (row === homeRow && col === 4 && !isInCheck(color)) {
        // King side: squares f & g must be empty, rook on h.
        if (
          rights.king &&
          !board[homeRow][5] &&
          !board[homeRow][6] &&
          board[homeRow][7] &&
          board[homeRow][7].type === "r" &&
          board[homeRow][7].color === color &&
          !isSquareAttacked(homeRow, 5, opponent(color)) &&
          !isSquareAttacked(homeRow, 6, opponent(color))
        ) {
          moves.push({
            fromRow: row, fromCol: col,
            toRow: homeRow, toCol: 6,
            flag: "castle-king",
          });
        }
        // Queen side: squares b, c & d must be empty, rook on a.
        if (
          rights.queen &&
          !board[homeRow][1] &&
          !board[homeRow][2] &&
          !board[homeRow][3] &&
          board[homeRow][0] &&
          board[homeRow][0].type === "r" &&
          board[homeRow][0].color === color &&
          !isSquareAttacked(homeRow, 3, opponent(color)) &&
          !isSquareAttacked(homeRow, 2, opponent(color))
        ) {
          moves.push({
            fromRow: row, fromCol: col,
            toRow: homeRow, toCol: 2,
            flag: "castle-queen",
          });
        }
      }
    } else {
      // Sliding pieces: bishop, rook, queen
      var dirs = [];
      if (piece.type === "b" || piece.type === "q") {
        dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
      }
      if (piece.type === "r" || piece.type === "q") {
        dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
      }

      dirs.forEach(function (dir) {
        var r = row + dir[0];
        var c = col + dir[1];
        while (inBounds(r, c)) {
          var target = board[r][c];
          if (target && target.color === color) break;
          tryAdd(r, c, undefined);
          if (target) break; // stop after capturing an enemy piece
          r += dir[0];
          c += dir[1];
        }
      });
    }

    return moves;
  }

  /**
   * Applies a pseudo-legal move object directly to `board`
   * (and updates turn/castling/en-passant state). Used both
   * for real moves and for the "try it and see if king is
   * safe" legality check, which is always followed by a
   * restoreSnapshot() if it was just a test.
   */
  function applyMoveToBoard(move, promotionType) {
    var piece = board[move.fromRow][move.fromCol];
    var color = piece.color;

    var captured = board[move.toRow][move.toCol];

    // En passant: the captured pawn is NOT on the destination
    // square — it's beside the moving pawn's starting square.
    if (move.flag === "en-passant") {
      var capturedPawnRow = move.fromRow;
      var capturedPawnCol = move.toCol;
      captured = board[capturedPawnRow][capturedPawnCol];
      board[capturedPawnRow][capturedPawnCol] = null;
    }

    board[move.toRow][move.toCol] = piece;
    board[move.fromRow][move.fromCol] = null;

    if (move.flag === "promotion") {
      board[move.toRow][move.toCol] = {
        type: promotionType || "q",
        color: color,
      };
    }

    if (move.flag === "castle-king") {
      var homeRow = move.fromRow;
      board[homeRow][5] = board[homeRow][7];
      board[homeRow][7] = null;
    } else if (move.flag === "castle-queen") {
      var homeRow2 = move.fromRow;
      board[homeRow2][3] = board[homeRow2][0];
      board[homeRow2][0] = null;
    }

    return captured;
  }

  /**
   * Returns only the LEGAL moves for a square: pseudo-legal
   * moves, filtered to exclude any that would leave the
   * mover's own king in check.
   */
  function legalMovesForSquare(row, col) {
    var piece = board[row][col];
    if (!piece) return [];

    var pseudo = pseudoMovesForSquare(row, col);
    var legal = [];

    pseudo.forEach(function (move) {
      var snapshot = cloneBoard(board);
      var epSnapshot = epTarget;

      applyMoveToBoard(move, "q"); // promotion choice doesn't affect check status

      if (!isInCheck(piece.color)) {
        legal.push(move);
      }

      board = snapshot;
      epTarget = epSnapshot;
    });

    return legal;
  }

  function allLegalMoves(color) {
    var moves = [];
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var piece = board[r][c];
        if (piece && piece.color === color) {
          moves = moves.concat(legalMovesForSquare(r, c));
        }
      }
    }
    return moves;
  }

  function pieceTypeName(type) {
    var names = { p: "", n: "N", b: "B", r: "R", q: "Q", k: "K" };
    return names[type] || "";
  }

  /**
   * Builds a Standard Algebraic Notation string for a move
   * that has ALREADY been applied to the board (so check/
   * checkmate symbols can be determined from the resulting
   * position).
   */
  function buildSAN(move, pieceType, captured, promotionType, movedColor) {
    if (move.flag === "castle-king") return appendCheckSymbol("O-O", movedColor);
    if (move.flag === "castle-queen") return appendCheckSymbol("O-O-O", movedColor);

    var fromSquare = rowColToSquare(move.fromRow, move.fromCol);
    var toSquare = rowColToSquare(move.toRow, move.toCol);
    var san = "";

    if (pieceType === "p") {
      if (captured || move.flag === "en-passant") {
        san += fromSquare.charAt(0) + "x" + toSquare;
      } else {
        san += toSquare;
      }
      if (move.flag === "promotion") {
        san += "=" + pieceTypeName(promotionType || "q");
      }
    } else {
      san += pieceTypeName(pieceType);
      if (captured) san += "x";
      san += toSquare;
    }

    return appendCheckSymbol(san, movedColor);
  }

  function appendCheckSymbol(san, movedColor) {
    var opponentColor = opponent(movedColor);
    if (isInCheck(opponentColor)) {
      var hasReply = allLegalMoves(opponentColor).length > 0;
      san += hasReply ? "+" : "#";
    }
    return san;
  }

  function updateCastlingRightsAfterMove(move, pieceType, movedColor) {
    if (pieceType === "k") {
      castlingRights[movedColor].king = false;
      castlingRights[movedColor].queen = false;
    }

    // Moving a rook away from its home square forfeits that side.
    var homeRow = movedColor === WHITE ? 7 : 0;
    if (pieceType === "r" && move.fromRow === homeRow) {
      if (move.fromCol === 0) castlingRights[movedColor].queen = false;
      if (move.fromCol === 7) castlingRights[movedColor].king = false;
    }

    // If a rook gets CAPTURED on its home square, that side
    // permanently loses castling rights too.
    var oppColor = opponent(movedColor);
    var oppHomeRow = oppColor === WHITE ? 7 : 0;
    if (move.toRow === oppHomeRow && move.toCol === 0) {
      castlingRights[oppColor].queen = false;
    }
    if (move.toRow === oppHomeRow && move.toCol === 7) {
      castlingRights[oppColor].king = false;
    }
  }

  function positionKey() {
    var rows = [];
    for (var r = 0; r < 8; r++) {
      var rowStr = "";
      for (var c = 0; c < 8; c++) {
        var p = board[r][c];
        rowStr += p ? p.color + p.type : "-";
      }
      rows.push(rowStr);
    }
    return rows.join("/") + " " + turn;
  }

  // ----------------------------------------------------------
  // PUBLIC API
  // ----------------------------------------------------------
  var api = {};

  api.board = function () {
    // Returned in the same row-major order our internal board
    // already uses: row 0 = rank 8 ... row 7 = rank 1.
    var out = [];
    for (var r = 0; r < 8; r++) {
      var row = [];
      for (var c = 0; c < 8; c++) {
        var p = board[r][c];
        row.push(p ? { type: p.type, color: p.color } : null);
      }
      out.push(row);
    }
    return out;
  };

  api.get = function (square) {
    var rc = squareToRowCol(square);
    var p = board[rc.row][rc.col];
    return p ? { type: p.type, color: p.color } : null;
  };

  api.turn = function () {
    return turn;
  };

  /**
   * options: { square: 'e2', verbose: true }
   * Returns an array of move objects with .to (and .from etc.)
   * when verbose is true — this is the form game.js relies on.
   */
  api.moves = function (options) {
    options = options || {};
    var results = [];

    var squares = [];
    if (options.square) {
      squares.push(options.square);
    } else {
      for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) {
          if (board[r][c] && board[r][c].color === turn) {
            squares.push(rowColToSquare(r, c));
          }
        }
      }
    }

    squares.forEach(function (sq) {
      var rc = squareToRowCol(sq);
      var piece = board[rc.row][rc.col];
      if (!piece || piece.color !== turn) return;

      var legal = legalMovesForSquare(rc.row, rc.col);
      legal.forEach(function (move) {
        var fromSq = rowColToSquare(move.fromRow, move.fromCol);
        var toSq = rowColToSquare(move.toRow, move.toCol);

        if (options.verbose) {
          results.push({
            from: fromSq,
            to: toSq,
            color: turn,
            piece: piece.type,
            flag: move.flag,
          });
        } else {
          results.push(toSq);
        }
      });
    });

    return results;
  };

  /**
   * moveRequest: { from: 'e2', to: 'e4', promotion: 'q' }
   * Returns a verbose move-result object (with .san, .captured,
   * .from, .to, .color, .piece) on success, or null if illegal.
   */
  api.move = function (moveRequest) {
    var fromRC = squareToRowCol(moveRequest.from);
    var toRC = squareToRowCol(moveRequest.to);

    var piece = board[fromRC.row][fromRC.col];
    if (!piece || piece.color !== turn) return null;

    var legal = legalMovesForSquare(fromRC.row, fromRC.col);
    var matched = null;
    for (var i = 0; i < legal.length; i++) {
      if (legal[i].toRow === toRC.row && legal[i].toCol === toRC.col) {
        matched = legal[i];
        break;
      }
    }
    if (!matched) return null;

    var movedColor = piece.color;
    var pieceType = piece.type;
    var promotionType = moveRequest.promotion || "q";

    // Snapshot everything undo() will need to restore.
    var snapshot = {
      boardBefore: cloneBoard(board),
      epBefore: epTarget,
      castlingBefore: JSON.parse(JSON.stringify(castlingRights)),
      turnBefore: turn,
    };

    var captured = applyMoveToBoard(matched, promotionType);

    // Update en-passant target for the *next* move.
    if (matched.flag === "double-pawn") {
      epTarget = {
        row: (matched.fromRow + matched.toRow) / 2,
        col: matched.fromCol,
      };
    } else {
      epTarget = null;
    }

    updateCastlingRightsAfterMove(matched, pieceType, movedColor);

    var san = buildSAN(matched, pieceType, captured, promotionType, movedColor);

    turn = opponent(turn);
    positionLog.push(positionKey());

    var moveResult = {
      from: moveRequest.from,
      to: moveRequest.to,
      color: movedColor,
      piece: pieceType,
      san: san,
      flag: matched.flag,
    };
    if (captured) {
      moveResult.captured = captured.type;
    }
    if (matched.flag === "promotion") {
      moveResult.promotion = promotionType;
    }

    moveHistory.push({ result: moveResult, snapshot: snapshot });

    return moveResult;
  };

  api.undo = function () {
    var entry = moveHistory.pop();
    if (!entry) return null;

    board = entry.snapshot.boardBefore;
    epTarget = entry.snapshot.epBefore;
    castlingRights = entry.snapshot.castlingBefore;
    turn = entry.snapshot.turnBefore;
    positionLog.pop();

    return entry.result;
  };

  api.history = function (options) {
    var verbose = options && options.verbose;
    return moveHistory.map(function (entry) {
      return verbose ? entry.result : entry.result.san;
    });
  };

  api.in_check = function () {
    return isInCheck(turn);
  };

  api.in_checkmate = function () {
    return isInCheck(turn) && allLegalMoves(turn).length === 0;
  };

  api.in_stalemate = function () {
    return !isInCheck(turn) && allLegalMoves(turn).length === 0;
  };

  api.insufficient_material = function () {
    var counts = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
    var total = 0;
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var p = board[r][c];
        if (p) {
          counts[p.type]++;
          total++;
        }
      }
    }
    // King vs King, or King+Bishop/Knight vs King.
    if (total === 2) return true;
    if (total === 3 && (counts.b === 1 || counts.n === 1)) return true;
    return false;
  };

  api.in_threefold_repetition = function () {
    var key = positionKey();
    var count = 0;
    for (var i = 0; i < positionLog.length; i++) {
      if (positionLog[i] === key) count++;
    }
    return count >= 3;
  };

  api.in_draw = function () {
    return (
      api.in_stalemate() ||
      api.insufficient_material() ||
      api.in_threefold_repetition()
    );
  };

  api.game_over = function () {
    return api.in_checkmate() || api.in_draw();
  };

  api.reset = function () {
    setupStartingPosition();
  };

  return api;
};

// Attach to the global scope so a plain <script> tag (no
// type="module") can use `new Chess()` directly, exactly as
// game.js expects.
if (typeof window !== "undefined") {
  window.Chess = Chess;
}

// Also export for Node, purely so this file can be unit-tested
// from the command line during development.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Chess: Chess };
}
