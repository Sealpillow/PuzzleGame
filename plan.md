# Puzzle Game Development Plan
### Project Codename: Insight
*A browser-based puzzle game inspired by the design philosophy of **The Witness**, built entirely with HTML, CSS, JavaScript, and SVG.*

---

# 1. Vision

## Goal

Create a logic puzzle game where players solve line-drawing puzzles that gradually teach mechanics without explicit tutorials.

The emphasis is on:

- Observation
- Deduction
- Discovery
- Elegant interactions
- Minimal UI
- Environmental progression

NOT on:

- Story
- Combat
- RPG mechanics
- Timers
- Randomness

The player should feel smart because they discovered the rule themselves.

---

# 2. Technical Constraints

Hosting:

- GitHub Pages

Technology:

- HTML
- CSS
- Vanilla JavaScript
- SVG

No:

- Backend
- Database
- Login
- Frameworks
- Build tools

Progress saved using:

- localStorage

---

# 3. Design Philosophy

## Teach Through Play

Every mechanic should be introduced naturally.

Bad:

> "Triangles mean this."

Good:

The player solves several easy puzzles until they naturally realize what triangles represent.

---

## One New Idea At A Time

Each area introduces only ONE mechanic.

Area progression:

Area 1
↓

Area 2 (new mechanic)

↓

Area 3 (combination)

↓

Area 4 (advanced)

↓

Final Area

---

## Elegant Complexity

Difficulty comes from:

- interaction of rules

NOT

- huge boards
- randomness
- impossible memorization

---

# 4. Gameplay Loop

Player enters puzzle

↓

Draw line

↓

Release

↓

Validate

↓

Solved?

Yes
↓

Unlock next puzzle

No
↓

Reset animation

Repeat

---

# 5. Game Structure

Main Menu

↓

Puzzle World

↓

Area

↓

Puzzle

↓

Solved

↓

Unlock Next

↓

Finish Area

↓

Unlock New Area

---

# 6. Puzzle Engine

Core systems:

## Grid

Supports:

- 3×3
- 4×4
- 5×5
- 6×6

Everything scales automatically.

---

## Nodes

Each intersection becomes a node.

Example:

O──O──O

│  │  │

O──O──O

│  │  │

O──O──O

---

## Edges

Edges connect nodes.

Player may travel only through valid edges.

---

## Path

Stores:

```
Node 1
↓

Node 2
↓

Node 3
↓

Node 4
```

Validation occurs only after reaching an exit.

---

# 7. Puzzle Data Format

```js
{
    id: "garden_01",

    width: 4,
    height: 4,

    start: [0,4],

    exits:[
        [4,0]
    ],

    dots:[
        [2,1],
        [3,4]
    ],

    blockedEdges:[

    ],

    requiredEdges:[

    ],

    symbols:[

    ]
}
```

Every puzzle should exist as JSON.

Never hardcode puzzles.

---

# 8. Rendering

Use SVG.

Structure:

```html
<svg>

<g class="grid"></g>

<g class="symbols"></g>

<g class="player-path"></g>

<g class="nodes"></g>

</svg>
```

Reasons:

- scalable
- crisp
- easy hit detection
- mobile friendly

---

# 9. Input System

Desktop

Mouse:

Click

↓

Drag

↓

Release

Mobile

Finger

↓

Drag

↓

Release

Rules:

- snap to nearest node
- cannot skip nodes
- cannot cross blocked edges
- cannot reverse illegally
- smooth interpolation

---

# 10. Save System

Stored locally.

```javascript
save = {

completedPuzzles:[

],

unlockedAreas:[

],

settings:{},

statistics:{}

}
```

Use:

```
localStorage
```

---

# 11. Puzzle Validation Pipeline

Step 1

Valid path?

↓

Step 2

Reached exit?

↓

Step 3

Passed all dots?

↓

Step 4

Required edges?

↓

Step 5

Blocked edges avoided?

↓

Step 6

Special mechanics

↓

Success

---

# 12. Puzzle Mechanics Roadmap

## Phase 1 — ✅ Done

Basic Path

✔ Start

✔ Exit

✔ Drawing

---

## Phase 2 — ✅ Done

Dots

Player must pass through every dot.

---

## Phase 3 — ✅ Done

Blocked Edges

Cannot cross certain edges.

`Validator.isEdgeBlocked`, the blocked-edge rendering, and the drag-time block in `Input` all work end to end. Demo puzzles live in `src/puzzles/area2_blocked.json`.

---

## Phase 4 — ✅ Done

Required Edges

Highlighted edges must be included.

`Validator.includesRequiredEdges` plus a highlighted-line style in `Renderer`/`style.css` (`.grid-edge.required`). Demo puzzles live in `src/puzzles/area3_required.json`.

---

## Phase 5 — ✅ Done

Colored Regions

Player separates regions using the path.

`Validator.satisfiesRegions` flood-fills grid cells (via `Grid.cellNeighbors`), treating any path edge as a wall; a region is invalid if it contains more than one distinct `cellColors` value. Rendered as small colored chips centered in each cell. Demo puzzles live in `src/puzzles/area5_regions.json`.

---

## Phase 6 — ✅ Done

Triangles

Cell requires exactly N adjacent edges.

`Validator.satisfiesTriangles` counts, per `triangles` entry `[col, row, count]`, how many of `Grid.cellEdges(col, row)` the path traveled, and requires an exact match. Rendered as a small triangle cluster in the cell. Demo puzzles live in `src/puzzles/area4_triangles.json`.

---

## Phase 7 — ✅ Done

Symmetry

Player controls two mirrored paths.

New `src/engine/Symmetry.js` module: `transformNode`/`mirrorPath` apply a puzzle's `symmetry` transform (currently `"rotational"`, 180° about grid center) to the drawn path, and `satisfiesSymmetry` fails if the primary and mirrored path ever share a node. The mirror path is rendered live in a distinct color, alongside a dimmed mirror start/exit marker so the player knows where it runs. No changes to `Input` were needed — the mirror path is purely derived from the one path the player actually drags. Symmetry levels live in `src/puzzles/levels.json` (20-24) — note that opposite-corner start/exit pairs are unsolvable by construction (they collide with their own reflection), and any grid node that is its own reflection must be avoided by the path. Symmetry does not combine with the other mechanics: `satisfiesSymmetry` only checks the mirrored path shares no node with the primary — it never re-validates dots/triangles/etc. against the mirrored half, so it stays a standalone mechanic throughout the level sequence.

---

## Phase 8 — ✅ Done

Mixed Mechanics

Multiple rule types.

`Validator.validateSolution` already ANDs every mechanic check together, so combining rules needed no new engine code — just puzzle data combining more than one of `dots`/`blockedEdges`/`requiredEdges`/`triangles`/`cellColors` at once. Mixed-mechanic levels are woven throughout `src/puzzles/levels.json` rather than isolated into one area — see Section 13.

---

**Superseded note (kept for history):** an earlier iteration organized these mechanics into 7 separate "areas" (`area1.json`..`area7_mixed.json`), each gated as a whole and displayed via named tabs ("Basics + Dots", "Blocked Edges", etc.). That was replaced by the flat, unlabeled level sequence described in Section 13 below — labeling an area "Triangles" before the player discovers the rule directly violated this document's own "Teach Through Play" principle (Section 3), and isolating each mechanic into its own area worked against "keep the user engaged" by letting a learned mechanic go quiet for dozens of puzzles at a time.

---

# 13. Level Progression

Puzzle data lives in a single file, `src/puzzles/levels.json` — one flat, ordered array of 50 puzzles (`level_01`..`level_50`), not separate area files. The player only ever sees "Level N of 50"; no area or mechanic name is displayed anywhere, including status messages. Levels are gated sequentially: level N+1 unlocks only once level N is solved (`main.js`'s `isLevelUnlocked`, derived from `save.completedPuzzles` — no separate unlock pointer to keep in sync). Completed levels stay freely replayable via the level-select grid.

Mechanics are introduced gradually and then rewoven into later levels combined with what came before, rather than being isolated into a single-mechanic block:

| Levels | Content |
|---|---|
| 1-4 | Basic path only (grid ramps 1x1 → 2x2 → 3x3) |
| 5-9 | Dots introduced, reinforced up to a 4x4 grid |
| 10-14 | Blocked Edges introduced, then combined with Dots |
| 15-19 | Required Edges introduced, then combined with Blocked Edges and Dots |
| 20-24 | Symmetry introduced (stays standalone — see Phase 7 note above) |
| 25-29 | Triangles introduced, then combined with Dots and Blocked Edges |
| 30-34 | Colored Regions introduced, then combined with Dots, Required Edges, and Blocked Edges |
| 35-39 | Fresh triples not seen in the intro blocks, deliberately rehearsing the riskiest pairing (Triangles + Colored Regions, the two mechanics that inspect broad path shape rather than one point) before it appears in a quadruple |
| 40-49 | All five possible quadruples of Dots/Blocked/Required/Triangles/Regions (each omitting one mechanic), first at lighter instance counts then heavier |
| 50 | Grand finale — all five mechanics combined at once |

Mechanic order (Dots → Blocked → Required → Symmetry → Triangles → Regions) groups the three simple point/edge rules first, places Symmetry as a paradigm-shift breather (matching how the actual Witness introduces it early rather than saving it as a capstone), then ends on the two mechanics requiring reasoning beyond a single point/edge — Triangles locally (one cell), Colored Regions globally (the whole board).

## Difficulty methodology

A first pass at levels 35-50 only proved "at least one solution exists" and never checked *how many* — several of those levels, despite nominally combining 4-5 mechanics, turned out to have 100+ valid alternate routes on a big, under-constrained 4x4 board, which is not actually hard no matter how many mechanic types are switched on. This was a direct violation of the "Elegant Complexity" principle above (huge boards ≠ difficulty). The fix, now the standing methodology for this puzzle set:

**Measure difficulty by counting valid solutions, not just proving one exists.** A brute-force DFS enumerates *every* valid solution up to a safety cap, using the real `Grid`/`Validator` code. Target ceilings: fresh triples (35-39) ≤10 solutions, light quadruples (40-44) ≤6, heavy quadruples (45-49) ≤3, the quintuple finale (50) 1-2. All 50 levels currently meet their tier's target (most of 42-50 land on exactly 1).

**`blockedEdges` as a real topological cut, not decoration.** Between two adjacent grid columns (or rows) there are `height+1` (or `width+1`) crossing edges — block all but one and every simple path is *provably* forced through that single gap, for the cost of just a few blocked-edge entries. Cells bounded by the newly-blocked edges get 1-2 edges fixed at zero for free — the cheapest place to add a tight triangle count (never use 4, see below). A required edge placed at the gap, or right next to it to force a specific approach direction, is satisfied by construction; region-colored cells straddling the gap are separated for free too, since the gap edge is guaranteed traveled.

**Solution count alone is not sufficient — a puzzle also needs real branching to actually be a puzzle.** A second pass at levels 42-50 pushed the cut idea to its extreme — a full "serpentine" blocking every row-crossing except one *alternating* turn point per row-boundary — which does force a unique solution, but at the cost of forcing **zero branching**: the blocked edges alone leave only one physically drawable line, so there's no wrong path to even consider and no reasoning for the player to do (this was caught by playtesting, not by the solution-count metric, which was satisfied and gave false confidence). The fix: verify branching directly. Strip every mechanic except `blockedEdges` and re-run the solution-count enumeration — this "raw" count is how many routes the maze alone still permits. A healthy level needs raw ≫ final (e.g. raw 16 solved down to a final 1-2 by genuine dots/required/triangles/regions filtering, as in the current 42-50), never raw = final = 1 (a level where the maze alone already determines everything, making the other mechanics decorative). In practice this means leaving 2+ open crossings per row/column boundary rather than exactly 1, so the underlying graph still has real decision points for dots/required/triangles/regions to filter between.

**Constraint density must scale with grid size — grid size itself stays a free stylistic choice.** `blockedEdges` is the only mechanic that removes topology; dots/required/triangles/regions just constrain which of the still-open edges get used, and a bigger board always offers more equivalent detours around a single instance of any of them. Rough guideline: ~2-3 constraint instances for a 2x2 board, ~5-6 for 3x3, ~8-10 for 4x4 (a real step up from the ~3-4 total instances per 4x4 level in the first pass, which is exactly why those felt easy despite looking complex). A level with no `blockedEdges` in its mechanic set has no cutting tool available and needs proportionally *more* of the other constraint types to reach the same tightness (see level 49 and 44, both blockedEdges-free, both still hitting ≤3/≤6 through density alone).

**Mechanic compatibility: every active mechanic must independently exclude at least one candidate — not just coexist with the others.** A third pass found that most levels 35-50, despite hitting their solution-count target *and* having real branching, still had 1-3 mechanics that were pure decoration: removing that mechanic from the puzzle didn't change the solution count at all, because a different mechanic (or the maze itself) already implied it. This happens easily when constraint placements are chosen to be "safely satisfied by the answer" rather than "actively ruling out alternatives" — e.g. a dot placed on a node the required edge already forces the path through, or a triangle cell bordering blocked edges so tightly that its count is fixed the same way for every surviving candidate. The check: for each active mechanic field, strip it and re-run the solution-count enumeration on the *rest of the puzzle unchanged* — if the count doesn't change, that mechanic contributed nothing and needs repositioning (verified on the actual remaining candidates, not just the raw maze branching — a mechanic can vary across all 16 raw paths yet still be constant among the 2-4 that survive the *other* mechanics, which is what actually matters). Fix by finding a node/edge/cell that differs among whatever currently survives the other constraints (list them out and compare), not by picking constraints independently and hoping they don't overlap. Note the corollary: once N constraints already narrow a level to exactly 1 solution, no (N+1)th constraint can be non-redundant against that final result — if a level needs 5 independently-meaningful mechanics, the underlying maze needs enough raw branching (roughly 2^5, though multi-valued constraints like triangle counts need less) to give each one real work before the field narrows to 1; the level 50 finale needed loosening from a tight 8-path maze to a 43-path one for exactly this reason. Every mechanic in every level 35-50 now independently excludes at least one candidate, verified this way.

Verification, both passes against the real engine code, never hand-derivation: (1) the solution-count enumeration above, confirming every level meets its tier's ceiling; (2) a load-bearing spot-check — solve with one mechanic's constraint stripped, confirm the alternate solution fails the full puzzle — useful for catching decorative constraints, though it's a weak signal on the fully-mazed levels (42-50) where the maze alone already forces a unique path regardless of what else is stripped, so the real evidence of tightness there is the solution count itself, not this check.

Hard design rules worth remembering when adding more levels: a triangle count of 4 is mathematically impossible (a cell's 4 edges form a cycle over 4 nodes; using all 4 forces a revisit, which the engine forbids outright — max valid count is 3); `satisfiesRegions` does not treat `blockedEdges` as flood-fill walls, only the drawn path's own edges count; and the symmetry self-mirror node (grid center on even-sized grids, none on odd-sized grids) and opposite-corner start/exit unsolvability both still apply.

---

# 14. Algorithms Needed

## Pathfinding

Track player movement.

---

## Flood Fill

Determine puzzle regions.

Used for:

- color separation
- shape grouping

---

## Graph Traversal

Represent nodes and edges.

---

## Constraint Validation

Each mechanic validates independently.

Example:

DotValidator

TriangleValidator

RegionValidator

RequiredEdgeValidator

---

Each returns:

```javascript
true
```

or

```javascript
false
```

Puzzle succeeds only if every validator returns true.

---

# 15. Project Architecture

```
src/

    engine/

        Grid.js

        Renderer.js

        Input.js

        PuzzleLoader.js

        Validator.js

    validators/

        DotValidator.js

        TriangleValidator.js

        RegionValidator.js

        RequiredEdgeValidator.js

    puzzles/

        area1.json

        area2.json

    ui/

        Menu.js

        HUD.js

        Transition.js

    save/

        SaveManager.js

index.html

style.css

main.js
```

Although GitHub Pages serves static files, organize the project as if it were a larger application. Each module should have a single responsibility.

---

# 16. Visual Style

Inspired by:

- clean architecture
- minimal geometry
- muted colors
- soft animations

Avoid:

- flashy particles
- excessive UI
- large HUDs

Focus attention on the puzzle.

---

# 17. Audio

Minimal.

- line drawing
- success chime
- failure tone
- ambient background

Music should never distract.

---

# 18. Future Expansion

Possible additions:

- Daily Puzzle
- Community Level Import
- Level Editor
- Puzzle Replay
- Hint System
- Accessibility Options
- Keyboard Controls
- Touch Gestures

All can work without a backend by storing data locally or importing/exporting JSON.

---

# 19. Milestones

## Milestone 1

- SVG grid
- Mouse drawing
- Path rendering
- Win detection

Estimated: 1 week

---

## Milestone 2

- Puzzle loading
- Save system
- Level selection
- Animations

Estimated: 1 week

---

## Milestone 3

- Dots
- Blocked edges
- Required edges

Estimated: 2 weeks

---

## Milestone 4

- Region detection
- Flood fill
- Colored regions

Estimated: 2–3 weeks

---

## Milestone 5

- Triangles
- Mixed mechanics
- Polish

Estimated: 2 weeks

---

## Milestone 6

- Sound
- UI polish
- Performance
- Mobile support

Estimated: 1–2 weeks

---

# 20. Guiding Principles

When adding a new feature, ask:

- Does this encourage observation?
- Does it introduce a genuinely new idea?
- Can players discover the rule without being told?
- Does it deepen existing mechanics instead of adding unnecessary complexity?
- Does it keep the interface calm and uncluttered?

If the answer to any of these is "no," reconsider whether the feature belongs in the game.

The goal is not to imitate *The Witness*, but to create an original puzzle game that shares its philosophy: simple rules, deep interactions, and rewarding moments of discovery.