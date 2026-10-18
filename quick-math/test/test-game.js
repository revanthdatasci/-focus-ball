// Tests for the game logic. Run from the quick-math folder:
//   node test/test-game.js
const assert = require('assert');
const path = require('path');
const game = require(path.join(__dirname, '..', 'script.js'));

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`ok - ${name}`);
}

// Seeded random source, so every run tests the same questions
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x80000000;
  };
}

// Works out the question's value without using eval
function evaluate(q) {
  if (q.op === '+') return q.a + q.b;
  if (q.op === '-') return q.a - q.b;
  if (q.op === '×') return q.a * q.b;
  return q.a / q.b;
}

test('questions are correct, with four distinct choices, for every level', () => {
  for (let level = 1; level <= 10; level++) {
    const random = seeded(level);
    for (let n = 0; n < 200; n++) {
      const q = game.makeQuestion(level, random);
      assert.strictEqual(evaluate(q), q.answer, `${q.a} ${q.op} ${q.b}`);
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0);
      assert.strictEqual(q.choices.length, 4);
      assert.strictEqual(new Set(q.choices).size, 4);
      assert.strictEqual(q.choices[q.correctIndex], q.answer);
      q.choices.forEach((c) => assert.ok(c >= 0));
    }
  }
});

test('operations unlock as the level rises', () => {
  assert.deepStrictEqual(game.operationsFor(1), ['+', '-']);
  assert.deepStrictEqual(game.operationsFor(3), ['+', '-', '×']);
  assert.deepStrictEqual(game.operationsFor(6), ['+', '-', '×', '÷']);
});

test('time shrinks with level but has a floor', () => {
  assert.strictEqual(game.timeLimitFor(1), 6);
  assert.ok(game.timeLimitFor(2) < game.timeLimitFor(1));
  assert.strictEqual(game.timeLimitFor(50), 2.5);
});

test('streak multiplier goes up every 3 answers and caps at x3', () => {
  assert.strictEqual(game.multiplierFor(0), 1);
  assert.strictEqual(game.multiplierFor(2), 1);
  assert.strictEqual(game.multiplierFor(3), 2);
  assert.strictEqual(game.multiplierFor(6), 3);
  assert.strictEqual(game.multiplierFor(30), 3);
});

test('startGame shows a question in the question phase', () => {
  const g = game.createGame();
  game.startGame(g, seeded(1));
  assert.strictEqual(g.phase, 'question');
  assert.strictEqual(g.lives, 3);
  assert.ok(g.question);
});

test('a correct answer scores, builds the streak, and reveals the answer', () => {
  const g = game.createGame();
  game.startGame(g, seeded(2));
  assert.strictEqual(game.answer(g, g.question.correctIndex), true);
  assert.strictEqual(g.score, 10);
  assert.strictEqual(g.streak, 1);
  assert.strictEqual(g.phase, 'reveal');
});

test('a wrong answer costs a life and resets the streak', () => {
  const g = game.createGame();
  game.startGame(g, seeded(3));
  game.answer(g, g.question.correctIndex);
  game.update(g, 1, seeded(9));
  const wrong = (g.question.correctIndex + 1) % 4;
  game.answer(g, wrong);
  assert.strictEqual(g.lives, 2);
  assert.strictEqual(g.streak, 0);
  assert.strictEqual(g.score, 10);
});

test('taps are ignored while the answer is being revealed', () => {
  const g = game.createGame();
  game.startGame(g, seeded(4));
  game.answer(g, g.question.correctIndex);
  assert.strictEqual(game.answer(g, 0), false);
  assert.strictEqual(g.score, 10);
});

test('the reveal phase moves on to the next question', () => {
  const g = game.createGame();
  game.startGame(g, seeded(5));
  game.answer(g, g.question.correctIndex);
  game.update(g, 1, seeded(6));
  assert.strictEqual(g.phase, 'question');
});

test('the streak multiplier applies to points', () => {
  const g = game.createGame();
  game.startGame(g, seeded(7));
  for (let i = 0; i < 3; i++) {
    game.answer(g, g.question.correctIndex);
    game.update(g, 1, seeded(7 + i));
  }
  // Answers 1 and 2 are at x1 (+10 each); answer 3 reaches a streak of 3 and is at x2 (+20)
  assert.strictEqual(g.score, 40);
  game.answer(g, g.question.correctIndex);
  // Answer 4 is still at x2, so it adds 20
  assert.strictEqual(g.score, 60);
});

test('running out of time costs a life and records no pick', () => {
  const g = game.createGame();
  game.startGame(g, seeded(8));
  game.update(g, g.total + 0.01, seeded(8));
  assert.strictEqual(g.lives, 2);
  assert.strictEqual(g.picked, -1);
  assert.strictEqual(g.event, 'timeout');
});

test('finishing a level advances the level after its last question', () => {
  const g = game.createGame();
  game.startGame(g, seeded(9));
  for (let i = 0; i < game.QUESTIONS_PER_LEVEL; i++) {
    game.answer(g, g.question.correctIndex);
    if (i < game.QUESTIONS_PER_LEVEL - 1) game.update(g, 1, seeded(10 + i));
  }
  assert.strictEqual(g.level, 2);
  assert.strictEqual(g.qInLevel, 0);
  assert.strictEqual(g.event, 'clear');
});

test('three lives lost ends the game', () => {
  const g = game.createGame();
  game.startGame(g, seeded(11));
  for (let i = 0; i < 3; i++) {
    const wrong = (g.question.correctIndex + 1) % 4;
    game.answer(g, wrong);
    if (g.phase !== 'over') game.update(g, 1, seeded(20 + i));
  }
  assert.strictEqual(g.lives, 0);
  assert.strictEqual(g.phase, 'over');
  assert.strictEqual(g.event, 'over');
});

console.log(`\n${passed} tests passed`);
