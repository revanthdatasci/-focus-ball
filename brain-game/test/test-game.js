// Tests for the game logic. Run from the brain-game folder:
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

// Random source that always returns the same value, so picks are predictable
const fixed = () => 0.5;

test('difficulty rises with the level and stays capped', () => {
  assert.strictEqual(game.gridSizeFor(1), 3);
  assert.strictEqual(game.gridSizeFor(6), 5);
  assert.strictEqual(game.gridSizeFor(50), 6);
  assert.strictEqual(game.targetCountFor(1), 3);
  assert.strictEqual(game.targetCountFor(50), 12);
  assert.strictEqual(game.showTimeFor(1), 2);
  assert.strictEqual(game.showTimeFor(100), 0.6);
});

test('pickTargets returns unique, sorted, in-range indexes', () => {
  const picks = game.pickTargets(9, 4, fixed);
  assert.strictEqual(picks.length, 4);
  assert.strictEqual(new Set(picks).size, 4);
  assert.deepStrictEqual(picks, [...picks].sort((a, b) => a - b));
  picks.forEach((i) => assert.ok(i >= 0 && i < 9));
});

test('startGame sets up level 1 in the show phase', () => {
  const g = game.createGame();
  game.startGame(g, fixed);
  assert.strictEqual(g.phase, 'show');
  assert.strictEqual(g.level, 1);
  assert.strictEqual(g.lives, 3);
  assert.strictEqual(g.targets.length, 3);
});

test('taps are ignored while tiles are still showing', () => {
  const g = game.createGame();
  game.startGame(g, fixed);
  assert.strictEqual(game.tap(g, g.targets[0]), false);
  assert.strictEqual(g.score, 0);
});

test('the show phase hands over to recall after its time', () => {
  const g = game.createGame();
  game.startGame(g, fixed);
  game.update(g, g.total + 0.01, fixed);
  assert.strictEqual(g.phase, 'recall');
});

test('a correct tap scores points and the same tile cannot count twice', () => {
  const g = game.createGame();
  game.startGame(g, fixed);
  game.update(g, 5, fixed);
  const target = g.targets[0];
  assert.strictEqual(game.tap(g, target), true);
  assert.strictEqual(g.score, 10);
  assert.strictEqual(game.tap(g, target), false);
  assert.strictEqual(g.score, 10);
});

test('finding every target clears the level and starts the next one', () => {
  const g = game.createGame();
  game.startGame(g, fixed);
  game.update(g, 5, fixed);
  g.targets.forEach((i) => game.tap(g, i));
  assert.strictEqual(g.level, 2);
  assert.strictEqual(g.phase, 'pause');
  assert.strictEqual(g.event, 'clear');
  game.update(g, 2, fixed);
  assert.strictEqual(g.phase, 'show');
  assert.strictEqual(g.targets.length, 3);
});

test('a wrong tap costs a life but the round keeps going', () => {
  const g = game.createGame();
  game.startGame(g, fixed);
  game.update(g, 5, fixed);
  const wrongTile = [0, 1, 2, 3, 4, 5, 6, 7, 8].find((i) => !g.targets.includes(i));
  game.tap(g, wrongTile);
  assert.strictEqual(g.lives, 2);
  assert.strictEqual(g.phase, 'recall');
});

test('three wrong taps end the game', () => {
  const g = game.createGame();
  game.startGame(g, fixed);
  game.update(g, 5, fixed);
  const wrong = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => !g.targets.includes(i));
  wrong.slice(0, 3).forEach((i) => game.tap(g, i));
  assert.strictEqual(g.lives, 0);
  assert.strictEqual(g.phase, 'over');
  assert.strictEqual(g.event, 'over');
});

test('running out of time costs a life, reveals the tiles, then retries the level', () => {
  const g = game.createGame();
  game.startGame(g, fixed);
  game.update(g, 5, fixed);
  game.update(g, 7, fixed);
  assert.strictEqual(g.lives, 2);
  assert.strictEqual(g.reveal, true);
  assert.strictEqual(g.phase, 'pause');
  game.update(g, 2, fixed);
  assert.strictEqual(g.level, 1);
  assert.strictEqual(g.reveal, false);
  assert.strictEqual(g.phase, 'show');
});

test('points grow with the level', () => {
  const g = game.createGame();
  game.startGame(g, fixed);
  g.level = 3;
  game.startLevel(g, fixed);
  game.update(g, 5, fixed);
  game.tap(g, g.targets[0]);
  assert.strictEqual(g.score, 30);
});

console.log(`\n${passed} tests passed`);
