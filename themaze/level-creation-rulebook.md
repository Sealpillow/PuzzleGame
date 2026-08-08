# Level Creation Rulebook - Door Labyrinth

This document is self-contained for adding or changing levels in `src/levels/*.svg`. For the overall game vision and mechanic descriptions in prose, see `plan.md` - this file is the practical, hands-on companion: exact data format, the authoring workflow, the verification tooling, and the mistakes that tooling exists to catch.

---

## 1. Mechanic rules & data reference

A level is **never** hand-written as raw SVG. It is authored as a compact spec (a char grid + a legend) inside `scripts/generate_levels.py` (canonical, Python) and mirrored in `scripts/generate-levels.mjs` (Node, kept in sync for anyone without Python). Running the generator turns the spec into the real `src/levels/<id>.svg` file the game fetches, and regenerates `src/levels/manifest.js`.

A spec is:

```python
dict(id='closing-1', chapter='closing', title='The Sealed Door', rows=[
    '###########',
    '#S    X   #',
    '######### #',
    '#########E#',
    '###########',
], legend={'X': {'type': 'closing'}})
```

Fixed characters (never need a legend entry): `#` wall, ` ` or `.` floor (`.` exists purely for readability when a floor cell needs to stand out next to other markers), `S` start (exactly one per level), `E` exit (exactly one per level).

Every other character must have a `legend` entry describing a door or a trigger:

| Mechanic | Legend entry | Behavior | Symbol drawn |
|---|---|---|---|
| Normal door | *(none - just use floor `' '`)* | Always passable, never changes state. | plain floor tile |
| One-way | `{'type':'oneway', 'dir':'N'\|'S'\|'E'\|'W'}` | Passable only when the player's *movement direction* equals `dir`. Direction is about the move, not which side you approach from. | arrow rotated to `dir` |
| Closing | `{'type':'closing'}` | Starts open; sealed permanently the instant the player steps onto it. | ring + shutter (shutter opacity animates in when sealed) |
| Limited-use | `{'type':'limited', 'uses':N}` | Passable while `usesRemaining > 0`; each entry decrements it; seals at 0. | ring with a live use-count number |
| Linked | `{'type':'linked', 'linkId':'a'}` | Exactly two doors must share a `linkId`. Entering either seals its partner (not itself). | two overlapping circles ("chain"), tinted by `linkId` |
| Toggle | `{'type':'toggle', 'groupId':'blue', 'initialOpen':true\|false}` | Passable while `open`. A trigger tile with the same `groupId` flips `open` on every toggle door in that group. | filled/ringed circle, swaps art on `.is-open`/`.is-closed` |
| Trigger | `{'type':'trigger', 'groupId':'blue'}` | Not a door - an always-passable floor tile. Stepping onto it flips every toggle door sharing `groupId`. | small diamond, tinted by `groupId` |

Notes on the fields:
- `dir` for one-way is the *travel* direction, e.g. `dir:'E'` means "must be moving east to step onto this tile"; approaching it while moving any other direction is blocked outright, from any side.
- `uses` should stay small (`1` or `2`) - matches plan.md §6.4's guidance that higher counts are hard to track visually, and the on-tile number is the only feedback the player gets.
- `linkId` pairs are exactly two doors, full stop - the generator throws if a `linkId` doesn't resolve to exactly two doors.
- `groupId` can be shared by any number of toggle doors and any number of triggers - all toggle doors in the group flip together whenever *any* trigger in that group is stepped on.

---

## 2. Mechanic introduction order

Tutorial (movement only) -> One-Way -> Closing -> Limited-Use -> Linked -> Toggle -> Combination.

This is plan.md's own chapter order (§5) and should not be reshuffled without a reason written down here. Each of the four "choice-and-consequence" mechanics (One-Way, Closing, Limited-Use, Linked) gets exactly **two** levels: one plain introduction, one that tests *using it well* rather than just recognizing it. Toggle also gets two (it inherently needs a trigger + a door to mean anything, so its "simple" level already teaches the full loop). Combination gets three, mixing everything taught so far.

Rationale for two, not three: a third level in each of those chapters kept turning into "the same lesson, slightly bigger" rather than a new idea - see the retired `oneway-2 "Read the Arrow"`, `closing-3`, `limited-3`, and `linked-3` in git history for what that looked like. If a genuinely new *wrinkle* on a mechanic shows up later (not just more distance), add a third level and record here what the new wrinkle is - don't add one just to pad the count.

The current lineup, level index (0-based, matches `manifest.js` and the `?level=N` debug param) in parentheses:

| # | id | Lesson |
|---|---|---|
| 1 (0) | `tutorial-1` | Plain movement, no special doors. |
| 2 (1) | `oneway-1` | A single one-way door on the only route. |
| 3 (2) | `oneway-2` | A longer route where the one-way door forces commitment mid-plan. |
| 4 (3) | `closing-1` | A single closing door on the only route. |
| 5 (4) | `closing-2` | A decoy dead-end alcove *before* the closing door - look before you seal it. |
| 6 (5) | `limited-1` | A single 2-use door on a there-and-back route. |
| 7 (6) | `limited-2` | Two 1-use doors, one real, one a trap - choose correctly before spending. |
| 8 (7) | `linked-1` | Two linked doors, one real branch, one trap branch. |
| 9 (8) | `linked-2` | Same idea, longer approach. |
| 10 (9) | `toggle-1` | One trigger, one toggle door. |
| 11 (10) | `toggle-2` | Two independent trigger/toggle groups in sequence. |
| 12 (11) | `combo-1` | one-way + closing + linked. |
| 13 (12) | `combo-2` | toggle + limited + one-way. |
| 14 (13) | `combo-3` | one-way + toggle + limited + closing, in one straight sequence - the finale. |

The level-select screen shows a **flat numbered list**, not chapter headings (that was a deliberate simplification - see git history). The `chapter` field on each spec still exists and still matters for *this document's* organization and for reasoning about pacing, but it is not exposed in the UI.

---

## 3. Design philosophy

Straight from plan.md §2 and §10 - restated here as the standard every level gets held to:

1. **The core question the player should always be asking:** *"If I pass through this door, what paths will still be available afterward?"* If a level doesn't make the player weigh that, it isn't doing its job.
2. **One lesson per early level.** Don't combine mechanics before the player has seen each one alone (that's why the Combination chapter exists as its own late block, not sprinkled earlier).
3. **Every door must matter.** If removing a door (or forcing it permanently blocked) doesn't change whether the level is solvable, it's decorative and should be redesigned or cut. This is not a guideline to eyeball - it's mechanically checked, see Section 5.
4. **No blind trial and error.** All state and all rules must be visible on the board before the player commits to a move. Never rely on a mechanic "surprising" the player as the source of difficulty.
5. **Keep early maps small.** 5x5 to 8x8 with 1-3 special doors for early levels; 10x10+ with 4-8 special doors is late-game territory (plan.md §10.4). Difficulty should come from *interaction*, not from walking distance - a bigger map that isn't teaching something new is padding, not difficulty.

---

## 4. The authoring workflow

1. Write (or edit) a spec in `scripts/generate_levels.py`. Sketch the ASCII by hand first; don't skip straight to typing it into the file.
2. Run it:
   ```
   python scripts/generate_levels.py
   ```
   This does three things for *every* spec in the file, not just the one you touched: parses the grid, runs a solver, and (if it passes) writes the `.svg` + regenerates `manifest.js`. A single bad spec aborts the whole run without writing anything - you cannot ship a partially-broken level set.
3. Fix whatever it reports (see Section 5 for what the two failure modes mean).
4. Mirror the exact same spec change into `scripts/generate-levels.mjs` - same `rows`, same `legend`, same `EXPECTED_DECORATIVE` entries if any. The two files must never drift; the Python one is what's actually been run and verified in this environment, the Node one exists for parity with the sibling `thewitness/` project's tooling convention and for anyone with Node instead of Python.
5. Delete any now-orphaned `.svg` file left over from a removed/renamed level - the generator does not clean these up itself, it only writes what's currently in the spec list.
6. Smoke-test in a real browser before calling it done (see Section 6) - a level that "passes the solver" but is visually broken or has the wrong difficulty feel has not actually been verified, only checked for the one thing the solver can check.

Use `index.html?level=N` (0-based index into `manifest.js`) to jump straight into any level while authoring, bypassing lock state and without touching real save progress.

---

## 5. Verification: the solver and the decorative-door check

Both generator scripts embed a small BFS solver that plays the level using the *exact same rule functions* as the shipped game (`src/engine/Door.js`'s `canEnter`/`onEnter`/`applyTrigger`/`initialDoorState`, ported line-for-line). This is not a separate approximation of the rules - it is provably the same logic, so "the generator says it's solvable" and "the game says it's solvable" cannot disagree.

Two checks run on every spec:

1. **Solvability.** BFS over `(position, door-state)` from `S` to `E`. If no path exists, the run fails loudly with the level id - never silently ships an unsolvable level.
2. **Decorative-door check.** For each door, re-run the same BFS with that one door permanently treated as blocked. If the level is *still* solvable, that door doesn't actually gate anything and the run fails - unless the level id + door id pair is listed in `EXPECTED_DECORATIVE` at the top of the run loop.

`EXPECTED_DECORATIVE` exists for exactly one legitimate case: **trap branches.** A trap door (the wrong choice in a linked-door or limited-use "choose correctly" level, see Section 6) is *supposed* to be individually removable without breaking solvability - the level is solvable via the real branch either way. That's not decorative in the bad sense, it's the intended lesson. Every other decorative-door failure is a real design bug: it means there's an unintended bypass around a door that was supposed to be load-bearing.

When you get an unexpected decorative-door failure, don't reach for the allowlist first - it almost always means a row/column you thought was walled off is actually open. Re-check every row string character-by-character against the column indices; see Section 7 for the specific mistake this catches most often.

---

## 6. Constraint design principles

**Default to a strict single-lane corridor.** The single most reliable way to guarantee a door is load-bearing is to make it the *only* tile connecting two otherwise-disconnected parts of the maze - i.e. wall off literally everything that isn't the intended path. Every level in the current set except the choice-branch levels is a single-lane corridor (with turns) for exactly this reason: it's trivially bypass-free, and it's also trivial to hand-verify by tracing one line instead of reasoning about an open room. Reach for an open room only when the level's whole point is a room (there currently are none in this set - all "choice" is expressed via branch shape, not room shape).

**Build genuine choice as a parallel fork from one hub, never sequential.** The linked-door and limited-use "pick correctly" levels all use the same shape: a hub cell with the trap door as one neighbor and the real door as a *different* neighbor, so the player can walk into either one directly from the hub. Do **not** put the trap door *in the corridor leading to* the real door - if reaching the real branch requires physically stepping through the trap door first, the trap fires unconditionally and the "choice" is fake. (This exact mistake happened during authoring - see Section 7.)

**A toggle level's trigger must be reachable before its door, on every route that uses that door.** If the trigger sits past the door it's supposed to open, the level is unsolvable by construction. In a single-lane corridor this just means: place the trigger earlier in the walk than the door it controls.

**Combination levels chain mechanics in sequence on one lane rather than nesting them.** `combo-1`/`combo-2`/`combo-3` are all "walk a single corridor, cross each mechanic once, in order" - this is deliberately the least clever possible way to combine mechanics, because combination levels are about *recognizing several known rules back-to-back*, not about inventing new interactions between mechanic types. If you want a level where two mechanics genuinely interact (e.g. a toggle group that also gates a linked door's approach), that's a new kind of level - design it deliberately and document the interaction here, don't back into it by accident.

---

## 7. Hazards and hard rules

- **A tile-gated door can never require more than one crossing to be useful, no matter how the maze around it is shaped.** This was discovered the hard way while trying to build a literal "cross this door exactly twice" level (plan.md's Template C, "Use the Door Twice"). Because a door only gates *entry onto its own tile* and exiting it is always free in every direction once entered, any neighbor reachable from the door is reachable in a single crossing - there is no way to force a second, necessary crossing without a second mechanic (a trigger, a key, an objective) in the loop, none of which exist in this MVP. **Do not attempt a "must cross exactly N>1 times" level with a bare limited-use door.** `limited-1`'s "Two Crossings" title refers to the door's *uses budget* (2 uses provisioned, so it tolerates a there-and-back), not a requirement that both uses get spent - that distinction matters when writing the lesson text/title for a new limited-use level.
- **The "open row" bypass.** The most common way a level fails the decorative-door check: a row or column that was meant to dead-end at the intended door actually has a gap somewhere else in an adjacent row, letting the player walk around. This happened repeatedly during authoring of the current set. When a level fails, first suspect this before anything else - print the grid and check every `#` you assumed was there actually is.
- **The "sequential trap" bypass.** The second most common mistake: putting the trap door of a choice pair directly in the corridor leading to the hub, instead of as a separate branch off the hub. See Section 6 - this makes the trap unconditional, not optional, which is a different (worse) puzzle than intended.
- **`data-group-id`/`data-link-id` are plain attribute values - CSS class hooks must be added to `class`, not stuffed into the attribute string.** The generator emits both `class="door door-toggle group-blue"` *and* `data-group-id="blue"` on the same element, on purpose - the class drives styling, the plain attribute value drives `LevelLoader.js`'s parsing. If you're editing the SVG emitter, don't merge these back into one field; `LevelLoader.js` reads `data-group-id` verbatim as the runtime `groupId`, so any extra text there breaks `applyTrigger`'s group matching silently (no error, the toggle just never fires).
- **Never stack a door and a trigger on the same tile.** A trigger is a floor-tile behavior; a door is a different cell kind entirely in the `cellAt` model. If a spec's legend accidentally gives one character both a `type` and treats it as always-passable, re-check - `type:'trigger'` is the only legend entry that produces a `floor` cell instead of a `door` cell.
- **Widths are computed from the longest row string; shorter rows silently pad with wall (`#`).** This is used deliberately in a couple of specs (e.g. `linked-2`, `linked-3`-era levels used shorter early rows) but it's easy to accidentally under-write a row and get an unintended wall where you meant floor. If a level fails to parse where you didn't expect, count characters in the shortest rows first.

---

## 8. Known scope limits (deliberate, not bugs)

- **Ordered doors and count doors (plan.md §6.7-6.8) are not implemented.** They're explicitly deferred to "Future Expansion" (plan.md §25) until the six-mechanic MVP is proven. Don't add legend entries for `type:'ordered'` or `type:'count'` without first adding the corresponding rules to `src/engine/Door.js`, `GameState.js`, and the solver in *both* generator scripts - all three need the new rule in lockstep, the same way all six current mechanics live in all three places.
- **No mouse/touch input, no level editor, no in-game hint system.** All explicitly out of scope per plan.md §7 and §25 for this MVP.
- **Board size is capped by what a single-lane corridor can comfortably show on one small SVG viewBox.** Nothing currently exceeds roughly 21x9 tiles (`combo-3`, deliberately a single wide row). There's no hard limit enforced in code, but plan.md §10.4's "10x10 to 16x16 for late levels" is the ceiling to design toward before it stops feeling like this game.
