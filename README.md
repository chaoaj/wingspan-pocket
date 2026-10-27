# Wingspan Pocket (fan-made p5.js edition)

A browser version of *Wingspan Pocket*, built from the published rulebook, player aid and Automa solo rules. Play solo against Automa or pass-and-play with 2 to 4 people on one screen.

All artwork is original. Bird portraits and food icons are drawn procedurally with **p5.js** from small shape and color recipes, so no published card art is reproduced. Species names, scientific names and approximate wingspans are real. Costs, points, egg limits, powers, flavor text, goal cards and Automa cards are original designs that follow the rulebook's structure, because the actual card lists are not printed in the rulebooks.

## Run it

- **Locally:** open `index.html` in a browser. Everything is static.
- **GitHub Pages:** push this folder and enable Pages on the branch. No build step is needed.
- **Single file:** `python3 tools/build_single.py` writes `dist/wingspan-pocket.html` with the CSS and JS inlined. p5.js and the fonts still load from their CDNs.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page shell, setup form, rules dialog |
| `css/style.css` | Theme tokens (light and dark), layout, card styling |
| `js/data.js` | 66 birds, double-sided card food sides, goal cards, Automa cards |
| `js/engine.js` | Rules engine: setup, Nest actions, payment, powers, refills, end game, scoring, Automa |
| `js/ui.js` | Accessible HTML interface; answers the engine's `UI.ask()` prompts |
| `js/art.js` | p5.js `setup()` that paints every bird and icon once and caches them as images |

The engine is written with `async`/`await`. Whenever a player must decide something it calls `await UI.ask({...})`, which highlights the legal choices and resolves when the player picks one. This keeps the rules readable from top to bottom, which may be useful as a teaching example.

> **p5.js global mode note:** p5 defines global functions such as `log()` and `shuffle()`. The engine uses `glog()` and `shuffleArr()` so p5 does not overwrite them.

## Accessibility (WCAG 2.2 AA / Section 508)

- The game board is real HTML text rather than canvas drawing. Every card has a full text description for screen readers (cost, points, egg limit, wingspan, power, eggs and tucked cards).
- All choices work with the keyboard: Tab to move, Enter or Space to choose. Focus moves to the current instruction after each step, and a visible focus ring is always shown.
- Instructions and game events are announced through a polite live region. A skip link jumps to the current action.
- Selectable cards are marked with an outline and a text badge ("Choose" / "Selected"), so color is never the only cue. Food icons use distinct shapes as well as colors, and food names appear in text.
- Text contrast is at least 4.5:1 in both light and dark themes. Power bands (white on brown or green) are above 8:1.
- Disabled actions are struck through as well as dimmed. Buttons are at least 44 px tall.
- Motion is limited and turned off under `prefers-reduced-motion`. The layout reflows to one column at 400 px with no horizontal scrolling.
- Body text uses Atkinson Hyperlegible, a typeface designed for low-vision readers.

## Rules notes and assumptions

- Implemented as written: Nest actions, the 2-for-1 food conversion, egg costs, left-to-right brown powers, green ongoing powers, bird slots refilling at end of turn, food decks rebuilt from the bottom half of the discard pile, the optional discard of 3 or more matching food cards, the game end at 6 birds with equal turns, and the Reserve-size tiebreaker.
- Advanced setup: goal cards (required with Automa; the 2 incompatible goal cards are removed) and choosing which 2 of 6 starting cards are birds.
- Automa: the setup and reshuffle with one card set aside face down, all 3 phases, goal-based selection with egg-limit and arrow tiebreakers, position-based selection, her scoring, and "all players" powers tucking from the discard pile for her.
- Difficulty: Easier uses Automa cards 1 to 6 with nothing set aside. Harder swaps in hard cards 1 to 3.
- Simplifications: for "all players draw from 1 deck", the active player always draws first. "Copy a green power" is chosen at the start of your turn (and again right after you play that bird) and lasts the whole turn.
- If a position-based Automa pick lands on an empty slot, she takes the next bird in the arrow's direction.

## Testing hooks

Set these before the page loads, for example with Playwright's `addInitScript`:

- `window.WS_AUTOSTART = { players: ['You'], automa: true, difficulty: 'normal', goals: true, chooseStart: false }` skips the setup form.
- `window.WS_AUTOPLAY = true` plays random legal moves. Set it to a function `(prompt) => ({ id } | { key } | null)` to script a bot.

In testing, a simple greedy bot beat Automa in about 75% of games on Easier, 38% on Normal and 6% on Harder.

## Credits

*Wingspan* and *Wingspan Pocket* are designed by Elizabeth Hargrave and published by Stonemaier Games. The Automa was designed by David Studley and Lines J. Hutter. This is an unofficial, non-commercial study project and is not affiliated with Stonemaier Games. Buy the real game; it is lovely.
