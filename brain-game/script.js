// Flash Memory
// Game logic lives in plain functions (createGame, startGame, startLevel, tap,
// update) so it can be tested without a browser. The page wiring runs only
// when a document exists.

const LIVES_START = 3;
const RECALL_TIME = 6;         // seconds the player has to find the lit tiles
const PAUSE_TIME = 1.2;        // seconds between rounds
const POINTS_PER_TARGET = 10;  // multiplied by the level
const BEST_KEY = 'flashMemoryBest';

// Difficulty rises with the level: bigger grid, more lit tiles, shorter flash
function gridSizeFor(level) {
  return Math.min(3 + Math.floor((level - 1) / 2), 6);
}

function targetCountFor(level) {
  return Math.min(3 + Math.floor((level - 1) / 2), 12);
}

function showTimeFor(level) {
  return Math.max(0.6, 2 - 0.1 * (level - 1));
}

// Picks `count` different cell indexes out of `cellCount`, sorted
function pickTargets(cellCount, count, random = Math.random) {
  const indexes = [];
  for (let i = 0; i < cellCount; i++) indexes.push(i);
  for (let i = indexes.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
  }
  return indexes.slice(0, count).sort((a, b) => a - b);
}

function createGame() {
  return {
    phase: 'ready',   // 'ready' | 'show' | 'recall' | 'pause' | 'over'
    level: 1,
    score: 0,
    lives: LIVES_START,
    size: 3,
    targets: [],      // indexes of the lit tiles this round
    found: [],        // targets the player has tapped correctly
    wrong: [],        // tiles the player tapped by mistake
    reveal: false,    // true after a timeout, so the missed tiles are shown
    timer: 0,         // seconds left in the current phase
    total: 1,         // length of the current phase, for the timer bar
    feedback: '',
    event: null       // last thing that happened: hit, wrong, timeout, clear, over
  };
}

function setPhase(game, phase, seconds) {
  game.phase = phase;
  game.timer = seconds;
  game.total = seconds;
}

function startLevel(game, random = Math.random) {
  game.size = gridSizeFor(game.level);
  game.targets = pickTargets(game.size * game.size, targetCountFor(game.level), random);
  game.found = [];
  game.wrong = [];
  game.reveal = false;
  game.feedback = 'Memorize the lit tiles';
  setPhase(game, 'show', showTimeFor(game.level));
}

function startGame(game, random = Math.random) {
  game.level = 1;
  game.score = 0;
  game.lives = LIVES_START;
  startLevel(game, random);
}

function endGame(game) {
  setPhase(game, 'over', 0);
  game.feedback = 'Game over';
  game.event = 'over';
}

// Handles a tap on a cell. Returns true if the tap counted.
function tap(game, index) {
  if (game.phase !== 'recall') return false;
  if (game.found.includes(index) || game.wrong.includes(index)) return false;

  if (game.targets.includes(index)) {
    game.found.push(index);
    game.score += POINTS_PER_TARGET * game.level;
    game.feedback = 'Nice!';
    game.event = 'hit';
    if (game.found.length === game.targets.length) {
      game.level += 1;
      setPhase(game, 'pause', PAUSE_TIME);
      game.feedback = 'Level clear!';
      game.event = 'clear';
    }
  } else {
    game.wrong.push(index);
    game.lives -= 1;
    game.feedback = 'Wrong tile!';
    game.event = 'wrong';
    if (game.lives <= 0) endGame(game);
  }
  return true;
}

// Advances the timers. Call once per frame with the elapsed seconds.
function update(game, dt, random = Math.random) {
  if (game.phase === 'show') {
    game.timer -= dt;
    if (game.timer <= 0) {
      setPhase(game, 'recall', RECALL_TIME);
      game.feedback = 'Tap the tiles that were lit';
    }
  } else if (game.phase === 'recall') {
    game.timer -= dt;
    if (game.timer <= 0) {
      game.reveal = true;
      game.lives -= 1;
      game.event = 'timeout';
      if (game.lives <= 0) {
        endGame(game);
      } else {
        setPhase(game, 'pause', PAUSE_TIME);
        game.feedback = 'Time is up!';
      }
    }
  } else if (game.phase === 'pause') {
    game.timer -= dt;
    if (game.timer <= 0) startLevel(game, random);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    gridSizeFor, targetCountFor, showTimeFor, pickTargets,
    createGame, startGame, startLevel, tap, update
  };
}

if (typeof document !== 'undefined') {
  const el = (id) => document.getElementById(id);
  const scoreEl = el('score');
  const bestEl = el('best');
  const levelEl = el('level');
  const livesEl = el('lives');
  const timerBar = el('timerBar');
  const feedbackEl = el('feedback');
  const boardEl = el('board');
  const startOverlay = el('startOverlay');
  const overOverlay = el('overOverlay');
  const muteBtn = el('muteBtn');

  const game = createGame();
  let best = loadBest();
  let builtSize = 0;
  let cells = [];
  let soundOn = true;
  let audioCtx = null;
  let overShown = false;

  function loadBest() {
    try {
      return Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch (e) {
      return 0; // storage can be blocked; the game still works
    }
  }

  function saveBest(score) {
    try {
      localStorage.setItem(BEST_KEY, String(score));
    } catch (e) {
      // ignore: the best score just won't persist
    }
  }

  // Browsers only allow sound after a click, so create the audio context then
  function unlockAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtx = audioCtx || new AudioCtx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) {
      audioCtx = null; // no audio support; the game stays silent
    }
  }

  function beep(freq, seconds, type = 'sine') {
    if (!soundOn || !audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + seconds);
  }

  function playEvent(event) {
    if (event === 'hit') beep(660, 0.12);
    else if (event === 'wrong') beep(180, 0.25, 'square');
    else if (event === 'timeout') beep(220, 0.4, 'sawtooth');
    else if (event === 'clear') {
      beep(880, 0.15);
      setTimeout(() => beep(1320, 0.2), 120);
    } else if (event === 'over') beep(120, 0.8, 'sawtooth');
  }

  function buildBoard(size) {
    boardEl.innerHTML = '';
    cells = [];
    boardEl.style.setProperty('--size', size);
    for (let i = 0; i < size * size; i++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.dataset.index = i;
      cell.setAttribute('aria-label', `Tile ${i + 1}`);
      boardEl.appendChild(cell);
      cells.push(cell);
    }
    builtSize = size;
  }

  function render() {
    if (game.size !== builtSize) buildBoard(game.size);

    const showing = game.phase === 'show';
    cells.forEach((cell, i) => {
      const isTarget = game.targets.includes(i);
      const isFound = game.found.includes(i);
      cell.classList.toggle('lit', showing && isTarget);
      cell.classList.toggle('found', isFound);
      cell.classList.toggle('wrong', game.wrong.includes(i));
      cell.classList.toggle('reveal', game.reveal && isTarget && !isFound);
      cell.disabled = game.phase !== 'recall';
    });

    scoreEl.textContent = game.score;
    bestEl.textContent = Math.max(best, game.score);
    levelEl.textContent = game.level;
    const lost = LIVES_START - Math.max(0, game.lives);
    livesEl.textContent = '♥'.repeat(Math.max(0, game.lives)) + '♡'.repeat(lost);

    const idle = game.phase === 'ready' || game.phase === 'over';
    const fraction = game.total > 0 ? Math.max(0, game.timer / game.total) : 0;
    timerBar.style.transform = `scaleX(${idle ? 0 : fraction})`;
    timerBar.dataset.phase = game.phase;
    feedbackEl.textContent = game.feedback;

    startOverlay.hidden = game.phase !== 'ready';
    overOverlay.hidden = game.phase !== 'over';

    if (game.phase === 'over' && !overShown) {
      overShown = true;
      if (game.score > best) {
        best = game.score;
        saveBest(best);
      }
      el('finalScore').textContent = game.score;
      el('finalLevel').textContent = game.level;
      el('finalBest').textContent = best;
    }
  }

  function beginGame() {
    unlockAudio();
    startGame(game);
    overShown = false;
    render();
  }

  el('startBtn').addEventListener('click', beginGame);
  el('againBtn').addEventListener('click', beginGame);
  el('restartBtn').addEventListener('click', beginGame);

  boardEl.addEventListener('click', (event) => {
    const cell = event.target.closest('.cell');
    if (cell && !cell.disabled) tap(game, Number(cell.dataset.index));
  });

  muteBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    muteBtn.textContent = soundOn ? 'Sound: On' : 'Sound: Off';
    muteBtn.setAttribute('aria-pressed', String(!soundOn));
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    update(game, dt);
    if (game.event) {
      playEvent(game.event);
      game.event = null;
    }
    render();
    requestAnimationFrame(frame);
  }

  render();
  requestAnimationFrame(frame);
}
