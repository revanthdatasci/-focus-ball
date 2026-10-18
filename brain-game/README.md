# Flash Memory

A timed memory game for laptops and phones. A few tiles light up for a moment. Remember them, then tap the same tiles before the timer runs out.

## Features

- Start screen with rules, live score, best score (saved in your browser), level, and lives
- Each level adds more lit tiles, a bigger grid, and less time to memorize
- Wrong tiles and timeouts cost a life. Three lives and the game ends
- Game-over screen with score, level reached, and a Play again button
- Restart button in the header at any time
- Sound effects with a mute toggle, smooth tile animations, and a countdown bar
- Responsive layout for phones and desktops; respects reduced-motion settings

## Files

| File         | Purpose                                  |
| ------------ | ---------------------------------------- |
| `index.html` | The page structure and overlays          |
| `style.css`  | The colors, layout, and animations       |
| `script.js`  | The game logic, rendering, and controls  |
| `test/test-game.js` | Tests for the game logic          |

## How to Run

No installation is needed.

1. Open the `brain-game` folder.
2. Double-click `index.html`.
3. The game opens in your default browser. Click **Start**.

On a phone, open the same file in your browser, or host the folder with any static file server.

## Controls

| Input         | Action                          |
| ------------- | ------------------------------- |
| Tap / click   | Select a tile                   |
| Keyboard Tab  | Move between tiles, Enter to tap |
| Restart       | Start a new game at any time    |
| Sound button  | Turn sound effects on or off    |

## Running Tests

This needs [Node.js](https://nodejs.org/):

```bash
node test/test-game.js
```

## Customizing

- Colors: edit the variables at the top of `style.css`.
- Difficulty: change `gridSizeFor`, `targetCountFor`, and `showTimeFor` in `script.js`.
- Timing and points: change `RECALL_TIME`, `PAUSE_TIME`, `POINTS_PER_TARGET`, and `LIVES_START` at the top of `script.js`.
