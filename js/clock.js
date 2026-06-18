/* ============================================================
   clock.js
   ============================================================
   PURPOSE OF THIS FILE:
   Implements a simple chess clock: each player starts with a
   fixed amount of time, and only the CURRENT player's time
   counts down. This matches Phase 12 of the original plan.

   This file knows nothing about chess rules either — it just
   tracks two numbers (seconds remaining for white/black) and
   updates the clock text in the DOM once per second.

   WHO USES THIS FILE:
     - game.js calls startClock(color) every time a move is
       made, to switch which player's clock is running.
     - game.js calls stopClock() when the game ends
       (checkmate/stalemate/draw), so time stops counting.
   ============================================================ */

const STARTING_SECONDS = 10 * 60; // 10 minutes per side

let whiteSeconds = STARTING_SECONDS;
let blackSeconds = STARTING_SECONDS;
let clockIntervalId = null;
let activeClockColor = null; // "w" or "b" — whoever's clock is running

/**
 * Converts a raw seconds count into "M:SS" display format.
 */
function formatClockTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return minutes + ":" + String(seconds).padStart(2, "0");
}

/**
 * Re-draws both clock displays in the DOM and toggles the
 * "inactive" CSS class onto whichever clock is NOT currently
 * running (styled dimmer in style.css).
 */
function renderClocks() {
  const whiteEl = document.getElementById("white-clock");
  const blackEl = document.getElementById("black-clock");

  whiteEl.textContent = formatClockTime(whiteSeconds);
  blackEl.textContent = formatClockTime(blackSeconds);

  whiteEl.classList.toggle("inactive", activeClockColor !== "w");
  blackEl.classList.toggle("inactive", activeClockColor !== "b");
}

/**
 * Starts (or switches) the running clock to the given color.
 * Internally uses setInterval to subtract one second, once per
 * second, from whichever player's time is currently active.
 *
 * onTimeOut: a callback game.js provides, called immediately
 * if a player's clock hits zero (so game.js can end the game).
 */
function startClock(color, onTimeOut) {
  activeClockColor = color;

  // Clear any previously running timer before starting a new
  // one — otherwise we'd end up with two intervals ticking at
  // once and the clock would run twice as fast.
  if (clockIntervalId !== null) {
    clearInterval(clockIntervalId);
  }

  clockIntervalId = setInterval(() => {
    if (activeClockColor === "w") {
      whiteSeconds -= 1;
    } else {
      blackSeconds -= 1;
    }

    renderClocks();

    if (whiteSeconds <= 0 || blackSeconds <= 0) {
      stopClock();
      if (typeof onTimeOut === "function") {
        onTimeOut(whiteSeconds <= 0 ? "w" : "b");
      }
    }
  }, 1000);

  renderClocks();
}

/**
 * Stops the countdown entirely. Called when the game ends.
 */
function stopClock() {
  if (clockIntervalId !== null) {
    clearInterval(clockIntervalId);
    clockIntervalId = null;
  }
  activeClockColor = null;
  renderClocks();
}

/**
 * Resets both clocks back to the starting time. Called by
 * game.js when the player clicks "New Game".
 */
function resetClocks() {
  whiteSeconds = STARTING_SECONDS;
  blackSeconds = STARTING_SECONDS;
  stopClock();
}
