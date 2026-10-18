// Quick Math
// Game logic lives in plain functions (createGame, startGame, answer, update)
// so it can be tested without a browser. The page wiring runs only when a
// document exists.

const LIVES_START = 3;
const QUESTIONS_PER_LEVEL = 5;
const REVEAL_TIME = 0.7;       // seconds the answer is shown before the next question
const POINTS_PER_ANSWER = 10;  // multiplied by the level and the streak multiplier
const BEST_KEY = 'quickMathBest';

// Harder levels bring more operations, bigger numbers, and less time
function operationsFor(level) {
  if (level < 3) return ['+', '-'];
  if (level < 6) return ['+', '-', '×'];
  return ['+', '-', '×', '÷'];
}

function numberRangeFor(level) {
  return 5 + level * 4;
}

function timeLimitFor(level) {
  return Math.max(2.5, 6 - 0.3 * (level - 1));
}

// Every 3 correct answers in a row adds 1, up to x3
function multiplierFor(streak) {
  return Math.min(3, 1 + Math.floor(streak / 3));
}

function randomInt(min, max, random) {
  return min + Math.floor(random() * (max - min + 1));
}

// Builds four distinct answer choices, with the correct one somewhere among them
function makeChoices(answer, random) {
  const values = new Set([answer]);
  const spread = Math.max(2, Math.ceil(Math.abs(answer) * 0.15));
  let attempts = 0;
  while (values.size < 4 && attempts < 200) {
    attempts++;
    const offset = randomInt(1, spread, random) * (random() < 0.5 ? -1 : 1);
    if (answer + offset >= 0) values.add(answer + offset);
  }
  for (let k = 1; values.size < 4; k++) values.add(answer + spread + k);

  const choices = [...values];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { choices, correctIndex: choices.indexOf(answer) };
}

// Makes one question. The answer is always a whole, non-negative number.
function makeQuestion(level, random = Math.random) {
  const ops = operationsFor(level);
  const op = ops[randomInt(0, ops.length - 1, random)];
  const max = numberRangeFor(level);
  let a;
  let b;
  let answer;

  if (op === '+') {
    a = randomInt(1, max, random);
    b = randomInt(1, max, random);
    answer = a + b;
  } else if (op === '-') {
    a = randomInt(1, max, random);
    b = randomInt(1, a, random);
    answer = a - b;
  } else if (op === '×') {
    a = randomInt(2, Math.ceil(max / 2) + 1, random);
    b = randomInt(2, 10, random);
    answer = a * b;
  } else {
    // Division always comes out even
    b = randomInt(2, 10, random);
    answer = randomInt(1, Math.ceil(max / 2), random);
    a = b * answer;
  }

  const { choices, correctIndex } = makeChoices(answer, random);
  return { a, b, op, answer, choices, correctIndex };
}

function createGame() {
  return {
    phase: 'ready',   // 'ready' | 'question' | 'reveal' | 'over'
    level: 1,
    qInLevel: 0,      // questions answered in the current level
    score: 0,
    lives: LIVES_START,
    streak: 0,
    question: null,
    picked: -1,       // choice the player tapped, -1 if time ran out
    timer: 0,         // seconds left in the current phase
    total: 1,         // length of the current phase, for the timer bar
    feedback: 'Answer as fast as you can',
    event: null       // last thing that happened: hit, wrong, timeout, clear, over
  };
}

function setPhase(game, phase, seconds) {
  game.phase = phase;
  game.timer = seconds;
  game.total = seconds;
}

function nextQuestion(game, random = Math.random) {
  game.question = makeQuestion(game.level, random);
  game.picked = -1;
  setPhase(game, 'question', timeLimitFor(game.level));
}

function startGame(game, random = Math.random) {
  game.level = 1;
  game.qInLevel = 0;
  game.score = 0;
  game.lives = LIVES_START;
  game.streak = 0;
  game.feedback = 'Answer as fast as you can';
  nextQuestion(game, random);
}

function endGame(game) {
  setPhase(game, 'over', 0);
  game.feedback = 'Game over';
  game.event = 'over';
}

// Runs after every answer or timeout: counts progress, then shows the answer
function finishQuestion(game) {
  game.qInLevel += 1;
  if (game.lives <= 0) {
    endGame(game);
    return;
  }
  if (game.qInLevel >= QUESTIONS_PER_LEVEL) {
    game.level += 1;
    game.qInLevel = 0;
    game.event = 'clear';
    game.feedback = `Level ${game.level} unlocked!`;
  }
  setPhase(game, 'reveal', REVEAL_TIME);
}

// Handles a tap on a choice. Returns true if the tap counted.
function answer(game, index) {
  if (game.phase !== 'question') return false;
  const q = game.question;
  game.picked = index;

  if (index === q.correctIndex) {
    game.streak += 1;
    const multiplier = multiplierFor(game.streak);
    game.score += POINTS_PER_ANSWER * game.level * multiplier;
    game.feedback = multiplier > 1 ? `Correct! x${multiplier} streak` : 'Correct!';
    game.event = 'hit';
  } else {
    game.streak = 0;
    game.lives -= 1;
    game.feedback = `Not quite. It was ${q.answer}`;
    game.event = 'wrong';
  }
  finishQuestion(game);
  return true;
}

// Advances the timers. Call once per frame with the elapsed seconds.
function update(game, dt, random = Math.random) {
  if (game.phase === 'question') {
    game.timer -= dt;
    if (game.timer <= 0) {
      game.streak = 0;
      game.lives -= 1;
      game.feedback = `Too slow! It was ${game.question.answer}`;
      game.event = 'timeout';
      finishQuestion(game);
    }
  } else if (game.phase === 'reveal') {
    game.timer -= dt;
    if (game.timer <= 0) nextQuestion(game, random);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LIVES_START, QUESTIONS_PER_LEVEL, REVEAL_TIME,
    operationsFor, numberRangeFor, timeLimitFor, multiplierFor,
    makeChoices, makeQuestion,
    createGame, startGame, answer, update
  };
}

if (typeof document !== 'undefined') {
  const el = (id) => document.getElementById(id);
  const scoreEl = el('score');
  const bestEl = el('best');
  const levelEl = el('level');
  const livesEl = el('lives');
  const streakEl = el('streak');
  const progressEl = el('progress');
  const timerBar = el('timerBar');
  const feedbackEl = el('feedback');
  const questionEl = el('question');
  const choiceBtns = [...document.querySelectorAll('.choice')];
  const startOverlay = el('startOverlay');
  const overOverlay = el('overOverlay');
  const muteBtn = el('muteBtn');

  const game = createGame();
  let best = loadBest();
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

  function render() {
    const q = game.question;
    const playing = game.phase === 'question' || game.phase === 'reveal';
    const reveal = game.phase === 'reveal';

    questionEl.textContent = q && playing ? `${q.a} ${q.op} ${q.b} = ?` : '?';
    choiceBtns.forEach((btn, i) => {
      btn.textContent = q && playing ? q.choices[i] : '';
      btn.classList.toggle('correct', reveal && i === q.correctIndex);
      btn.classList.toggle('wrong', reveal && i === game.picked && i !== q.correctIndex);
      btn.disabled = game.phase !== 'question';
    });

    scoreEl.textContent = game.score;
    bestEl.textContent = Math.max(best, game.score);
    levelEl.textContent = game.level;
    livesEl.textContent = '♥'.repeat(Math.max(0, game.lives)) + '♡'.repeat(LIVES_START - Math.max(0, game.lives));
    streakEl.textContent = `×${multiplierFor(game.streak)}`;
    progressEl.textContent = `${game.qInLevel}/${QUESTIONS_PER_LEVEL}`;

    const idle = game.phase === 'ready' || game.phase === 'over' || reveal;
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

  el('choices').addEventListener('click', (event) => {
    const btn = event.target.closest('.choice');
    if (btn && !btn.disabled) answer(game, Number(btn.dataset.index));
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
