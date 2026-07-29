# PuzzleGame
Inspired from The Witness game <br/>
Hexagon Dots <br/>
![image](https://user-images.githubusercontent.com/51332449/177965327-cab933e9-6448-4622-a8fc-3518b967a5ad.png)

## Web version (Insight)
A browser-based version of the game lives at the project root (`index.html`, `style.css`, `main.js`, `src/`). It's built with vanilla HTML/CSS/JS and SVG, no backend or build tools — see `plan.md` for the full design, architecture, and puzzle-difficulty methodology, and `basic-plan.md` for the original MVP scope.

Drag from the glowing start node to the exit tick on the border to solve each puzzle. Progress is saved locally in the browser (`localStorage`).

### Running it

Because the game loads puzzle data with `fetch()`, it needs to be served over HTTP (not opened directly as a `file://` URL). From the project root, run one of:

```
npx serve .
# or
python -m http.server 8000
```

Then open the printed local address (e.g. `http://localhost:8000`) in your browser.

### Structure

The game is one flat, sequential run of **50 levels** (`src/puzzles/levels.json`) — solving a level unlocks the next; completed levels stay freely replayable from the level-select grid. There are no separate "areas" or mechanic labels shown in the UI — new rules are introduced a couple of puzzles at a time and then rewoven into later levels combined with what came before, so the player discovers what each symbol means through play rather than being told.

### Mechanics

Six rule types are combined across the level set (for reference here — the game itself never names them):

- **Dots** — the drawn line must pass through every dot.
- **Blocked Edges** — certain grid lines can never be crossed (shown as a broken red line); the drag input physically stops you from crossing one.
- **Required Edges** — certain grid lines (highlighted gold) must be part of the final path, not just avoided.
- **Triangles** — a cell marked with 1-3 triangles requires exactly that many of its four edges to be part of the path.
- **Colored Regions** — the path must partition the grid so that same-colored cells always end up in one connected region, with no two colors sharing a region.
- **Symmetry** — a second, mirrored path is drawn automatically alongside yours; both must be valid and the two must never touch. Kept standalone rather than combined with the other mechanics.

Later levels combine multiple mechanics at once, escalating from simple pairings up to a five-mechanic finale.

### Testing

Append `?level=N` to the URL (e.g. `http://localhost:8000/?level=37`) to jump straight to level N for testing — it unlocks free navigation between all 50 levels for that session and is clearly labeled "(debug)" in the UI, without touching your real save progress.

## game.py
There are currently 10 puzzles to choose from with increasing difficulty <br/>


Instructions:
Think of it like connecting the dots! You must connect all the dots before to solve the puzzle <br/>
1: Left <br/>
![image](https://user-images.githubusercontent.com/51332449/177968794-d5a945c8-0af9-4596-babf-e53812b47a8f.png)
 <br/>
2: Right <br/>
![image](https://user-images.githubusercontent.com/51332449/177968657-1b96c9ec-9399-4ba1-8201-d0a1c75747e0.png)<br/>
3: Up <br/>
![image](https://user-images.githubusercontent.com/51332449/177969171-e49cd1f8-4da7-4a7b-9489-20dbecdab0ac.png) <br/>
4: Down <br/>
![image](https://user-images.githubusercontent.com/51332449/177969348-a782a515-f7d4-4b5d-8272-d3a79f2015b6.png) <br/>

5: Reset <br/>
![image](https://user-images.githubusercontent.com/51332449/177971129-dd2f52e4-2134-4301-b29a-8b14c1e473e3.png) <br/>

6: Return to Main Menu <br/>
![image](https://user-images.githubusercontent.com/51332449/177966074-6c658477-1cf0-4a40-9dda-c85597f176d0.png) <br/>
