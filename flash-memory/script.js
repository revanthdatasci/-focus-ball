// ---------- Elements ----------
const boardEl = document.getElementById("board");
const messageEl = document.getElementById("message");
const levelEl = document.getElementById("level");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const livesEl = document.getElementById("lives");
const startScreen = document.getElementById("startScreen");
const overScreen = document.getElementById("overScreen");
const soundToggle = document.getElementById("soundToggle");

// ---------- Game state ----------
let level, score, lives, targets, found, canTap, roundStart;
let best = Number(localStorage.getItem("flashMemoryBest")) || 0;
bestEl.textContent = best;

// ---------- Sound (generated with Web Audio, no files needed) ----------
let audioCtx;
function beep(freq, duration = 0.12, type = "sine") {
  if (!soundToggle.checked) return;
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// ---------- Difficulty ----------
// Grid grows every 3 levels (3x3 -> 6x6). Tiles to remember grows each level.
function gridSize()  { return Math.min(3 + Math.floor((level - 1) / 3), 6); }
function targetCount() { return Math.min(2 + level, Math.floor(gridSize() ** 2 / 2)); }
function flashTime() { return Math.max(350, 1300 - level * 60); } // ms, gets shorter

// ---------- Helpers ----------
const wait = ms => new Promise(r => setTimeout(r, ms));

function updateHud() {
  levelEl.textContent = level;
  scoreEl.textContent = score;
  livesEl.textContent = "❤".repeat(lives) || "—";
  bestEl.textContent = best;
}

function buildBoard() {
  const n = gridSize();
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  for (let i = 0; i < n * n; i++) {
    const tile = document.createElement("button");
    tile.className = "tile locked";
    tile.setAttribute("aria-label", "tile " + (i + 1));
    tile.addEventListener("click", () => onTap(i, tile));
    boardEl.appendChild(tile);
  }
}

function pickTargets() {
  const total = gridSize() ** 2;
  const all = [...Array(total).keys()];
  for (let i = all.length - 1; i > 0; i--) {          // shuffle
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return new Set(all.slice(0, targetCount()));
}

// ---------- Round flow ----------
async function startRound() {
  canTap = false;
  found = new Set();
  buildBoard();
  targets = pickTargets();
  updateHud();
  messageEl.textContent = "Watch closely…";
  await wait(900);

  const tiles = [...boardEl.children];
  targets.forEach(i => tiles[i].classList.add("flash"));
  beep(660, 0.15);
  await wait(flashTime());
  targets.forEach(i => tiles[i].classList.remove("flash"));

  messageEl.textContent = `Tap the ${targets.size} tiles!`;
  tiles.forEach(t => t.classList.remove("locked"));
  canTap = true;
  roundStart = performance.now();
}

function onTap(i, tile) {
  if (!canTap || tile.classList.contains("correct")) return;

  if (targets.has(i)) {
    tile.classList.add("correct");
    found.add(i);
    beep(520 + found.size * 60);
    if (found.size === targets.size) roundWon();
  } else {
    tile.classList.add("wrong");
    beep(150, 0.3, "sawtooth");
    loseLife();
  }
}

async function roundWon() {
  canTap = false;
  const seconds = (performance.now() - roundStart) / 1000;
  const speedBonus = Math.max(0, Math.round(10 - seconds)) * level;
  score += 100 * level + speedBonus;
  level++;
  messageEl.textContent = speedBonus ? `Perfect! +${speedBonus} speed bonus` : "Perfect!";
  scoreEl.classList.add("pop");
  beep(880, 0.25);
  updateHud();
  await wait(1100);
  scoreEl.classList.remove("pop");
  startRound();
}

async function loseLife() {
  canTap = false;
  lives--;
  updateHud();
  const tiles = [...boardEl.children];
  targets.forEach(i => tiles[i].classList.add("flash")); // reveal answer
  tiles.forEach(t => t.classList.add("locked"));
  messageEl.textContent = lives > 0 ? "Oops! Here's the answer…" : "Out of lives!";
  await wait(1400);
  lives > 0 ? startRound() : gameOver();
}

// ---------- Start / End ----------
function startGame() {
  level = 1; score = 0; lives = 3;
  startScreen.classList.add("hidden");
  overScreen.classList.add("hidden");
  startRound();
}

function gameOver() {
  const isBest = score > best;
  if (isBest) {
    best = score;
    localStorage.setItem("flashMemoryBest", best);
  }
  document.getElementById("finalLevel").textContent = level;
  document.getElementById("finalScore").textContent = score;
  document.getElementById("newBest").classList.toggle("hidden", !isBest);
  updateHud();
  overScreen.classList.remove("hidden");
}

document.getElementById("startBtn").addEventListener("click", startGame);
document.getElementById("restartBtn").addEventListener("click", startGame);

// Draw an empty board behind the start screen
level = 1; lives = 3; score = 0;
buildBoard();
updateHud();
