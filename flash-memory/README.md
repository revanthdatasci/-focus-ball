# Flash Memory

A browser memory game: tiles flash briefly, then you tap the ones that lit up.

## Run it
No install needed.
1. Open the `flash-memory` folder.
2. Double-click `index.html` (opens in Chrome, Edge, Firefox, Safari — laptop or phone).

Optional local server: `python -m http.server 8000` in this folder, then visit http://localhost:8000.

## How to play
- Watch which tiles light up (yellow).
- Tap them all. Green = correct, red = wrong (costs a life, 3 lives).
- Each level adds more tiles, shorter flash time, and bigger grids (3x3 up to 6x6).
- Quick answers earn a speed bonus. Best score is saved in your browser.

Files: `index.html` (layout), `style.css` (look & animations), `script.js` (game logic, sounds).
