# Door Labyrinth Puzzle Game — Development Plan

## 1. Project Overview

A top-down 2D puzzle game set inside a labyrinth.

The player explores rooms and corridors while learning how different doors behave. Every door changes which routes remain available, so the challenge is not simply finding the exit. The player must understand the door rules, plan ahead, and avoid trapping themselves.

The labyrinth itself is the puzzle.

There are:

- No enemies
- No combat
- No random generation in the main campaign
- No separate mini-puzzle screens
- No traditional key collection
- No power network mechanic

The main interaction is movement through doors.

---

## 2. Core Design Goal

The player should constantly ask:

> If I pass through this door, what paths will still be available afterward?

The game should create logical route-planning puzzles using a small number of clear door mechanics.

The design should prioritize:

1. Simple controls
2. Clear visual rules
3. Small, readable levels
4. Meaningful consequences for every route choice
5. Mechanics that combine naturally
6. Solutions based on reasoning rather than trial and error

---

## 3. Core Gameplay Loop

1. Enter a labyrinth area.
2. Observe the walls, corridors, doors, and exit.
3. Identify the door types present.
4. Predict how the maze will change after each crossing.
5. Choose a route.
6. Reach the exit without becoming trapped.
7. Continue to a harder area that combines known mechanics.

The player may restart the current puzzle at any time.

---

## 4. Player Controls

For the first version:

- Arrow keys or WASD to move
- Restart button
- Undo button
- Pause button

Optional later controls:

- Mouse or touch movement
- Hold a button to preview door information
- Map view for larger labyrinths

Movement should be grid-based.

Each move places the player in the next tile or room.

---

## 5. Game Structure

The game should be divided into chapters.

Each chapter teaches one door mechanic before combining it with previously learned mechanics.

Example structure:

### Chapter 1 — Direction

Introduces:

- Normal doors
- One-way doors

Focus:

- Reading door direction
- Understanding irreversible movement

### Chapter 2 — Closure

Introduces:

- Closing doors
- Limited-use doors

Focus:

- Planning return routes
- Avoiding dead ends

### Chapter 3 — Connections

Introduces:

- Linked doors
- Toggle doors

Focus:

- Understanding how one action affects another location

### Chapter 4 — Sequence

Introduces:

- Ordered doors
- Count doors

Focus:

- Tracking route history
- Crossing doors in the correct order

### Chapter 5 — Reflection

Introduces:

- Mirrored doors
- Opposite-direction pairs

Focus:

- Symmetry
- Loop planning
- Directional relationships

### Final Chapter — The Living Labyrinth

Uses all established mechanics.

No new rules are introduced.

The final puzzles test whether the player fully understands the door language.

---

## 6. Core Door Mechanics

The first version should use approximately six core mechanics.

Too many mechanics will make the game difficult to understand and difficult to design.

---

### 6.1 Normal Door

A standard doorway.

Behavior:

- Can be crossed from either direction
- Never changes state

Purpose:

- Provides contrast with special doors
- Helps shape routes
- Gives the player safe passages

Visual idea:

- Plain doorway
- No icon
- Neutral frame

---

### 6.2 One-Way Door

Can only be crossed in the direction shown.

Behavior:

- Enter from the allowed side
- Blocks entry from the opposite side
- Remains usable from the allowed side

Purpose:

- Creates irreversible route choices
- Teaches directional planning
- Creates loops that can only be entered in one direction

Visual idea:

- Arrow on the floor or door
- Pointed frame shape
- Clear direction indicator on both sides

Example:

```text
Start → Door → Room
```

The player may enter the room but cannot return through the same door.

---

### 6.3 Closing Door

Closes permanently after being crossed.

Behavior:

- Starts open
- Player crosses once
- Door becomes sealed
- Cannot be crossed again

Purpose:

- Removes return paths
- Forces the player to consider timing
- Creates commitment points

Visual idea:

- Broken-circle symbol
- Door frame collapses or locks
- Strong closing animation

Important:

The player must be able to understand before crossing that the door will close.

---

### 6.4 Limited-Use Door

Can only be crossed a fixed number of times.

Behavior:

- Shows its remaining uses
- Loses one use after every crossing
- Becomes sealed at zero uses

Example:

```text
Door marked II = two crossings remaining
Door marked I  = one crossing remaining
```

Purpose:

- Allows temporary return paths
- Creates route-budget puzzles
- Adds more flexibility than a closing door

Visual idea:

- Visible bars, dots, or rings
- One marker disappears after each crossing

Recommended limits:

- One-use door
- Two-use door
- Rarely three-use door

Avoid higher values because they are harder to track visually.

---

### 6.5 Linked Doors

Two or more doors share a state.

Basic version:

- Crossing Door A closes Door B
- Crossing Door B closes Door A

Purpose:

- Forces the player to choose which route to preserve
- Creates mutually exclusive paths
- Supports sacrifice-based puzzle design

Visual idea:

- Matching color
- Matching shape
- Shared symbol
- Thin visual pulse showing the paired door when activated

Recommended rule:

Start with pairs only.

Avoid linking three or more doors until late in development.

---

### 6.6 Toggle Doors

A set of doors alternates between open and closed.

Behavior:

- Crossing a toggle doorway changes the state of linked toggle doors
- Open doors close
- Closed doors open

Possible version:

- Blue doors and orange doors alternate
- When blue doors are open, orange doors are closed
- Crossing a toggle trigger swaps them

Purpose:

- Creates changing routes
- Encourages planning several moves ahead
- Allows the same area to have multiple states

Visual idea:

- Two clearly different states
- Strong animation when toggled
- Matching group symbols

Important:

The player should always be able to see which doors were affected.

---

### 6.7 Ordered Doors

A group of doors must be crossed in a specific order.

Behavior:

- Doors are marked with an order
- Crossing the correct next door advances the sequence
- Crossing the wrong one resets or locks the sequence

Recommended versions:

- Fixed visible order: 1 → 2 → 3
- Pattern order taught through the environment
- Order based on symbols rather than numbers

Purpose:

- Adds route-history puzzles
- Encourages planning across the entire maze
- Creates goals beyond simply reaching the exit

Visual idea:

- Numbered symbols
- Segmented ring that fills as progress is made
- Sequence displayed near the exit

Avoid hidden sequences in early levels.

---

### 6.8 Count Door

Opens only after a certain number of special doors have been crossed.

Examples:

- Opens after exactly three marked doors
- Opens after at least two closing doors
- Opens only if no more than one linked door was used

Purpose:

- Tests route counting
- Creates optional-path decisions
- Makes the route itself act as a combination

Visual idea:

- Door displays a number
- Progress ring updates after qualifying crossings

Recommended early version:

- Use exact visible counts
- Keep required values between one and four

---

## 7. Mechanics to Exclude from the MVP

Do not include these in the first version:

- Keys and inventory
- Enemies
- Combat
- Timed doors
- Real-time movement
- Power networks
- Laser puzzles
- Mirror-beam puzzles
- Random doors
- Hidden rules
- Doors requiring separate mini-games
- Large procedural labyrinths
- Doors that depend on real-world time
- Complex story choices

These may distract from the core idea.

---

## 8. Recommended MVP Mechanics

The first playable version should contain only:

1. Normal door
2. One-way door
3. Closing door
4. Limited-use door
5. Linked door
6. Toggle door

Ordered and count doors can be added after the core system is proven.

---

## 9. MVP Scope

Build a small prototype with:

- One player character
- Grid-based movement
- Walls and floor tiles
- One entrance
- One exit
- Six door types
- Restart function
- Undo function
- Ten to fifteen handcrafted puzzles
- Simple chapter selection
- Basic sound and animation
- No story required

Suggested puzzle count:

| Section | Mechanics | Puzzle Count |
|---|---|---:|
| Tutorial | Normal movement | 1 |
| One-Way | One-way doors | 3 |
| Closing | Closing doors | 3 |
| Limited Use | Limited-use doors | 3 |
| Linked | Linked doors | 3 |
| Combination | Mixed mechanics | 3–5 |

Total MVP:

Approximately 16–18 puzzles.

A smaller first prototype may contain only 8–10 puzzles.

---

## 10. Level Design Principles

### 10.1 One Lesson Per Early Puzzle

Each tutorial puzzle should teach one idea.

Example:

- Puzzle 1: A one-way door prevents returning
- Puzzle 2: Two one-way doors create a directional loop
- Puzzle 3: A one-way door must be entered from the correct side

Do not combine mechanics before the player understands them separately.

---

### 10.2 Show Consequences Clearly

When a door changes:

- Animate it
- Play a sound
- Briefly highlight linked doors
- Update visible state markers

The player should never wonder why a route changed.

---

### 10.3 Avoid Blind Trial and Error

The player should have enough information to reason about the solution before moving.

Avoid:

- Hidden links
- Unmarked one-way directions
- Doors changing without feedback
- Rules that only appear after failure

Failure should come from incorrect planning, not missing information.

---

### 10.4 Keep Early Maps Small

Suggested early puzzle size:

- 5 × 5 to 8 × 8 tiles
- 3 to 6 rooms
- 1 to 3 special doors

Suggested late puzzle size:

- 10 × 10 to 16 × 16 tiles
- 6 to 12 rooms
- 4 to 8 special doors

Large maps are not automatically more difficult.

Difficulty should come from interactions, not walking distance.

---

### 10.5 Every Door Should Matter

Avoid placing decorative special doors.

A special door should:

- Restrict a route
- Change another route
- Create a timing decision
- Affect the final exit condition
- Allow or prevent returning

If removing the door does not change the solution, reconsider its placement.

---

### 10.6 Limit Player Memory Load

The game should visually display:

- Door state
- Remaining uses
- Linked groups
- Active toggle state
- Ordered-door progress
- Count-door progress

The player should solve logic, not memorize invisible variables.

---

## 11. Puzzle Templates

These templates can be reused with different layouts.

---

### Template A — No Return

Mechanics:

- One closing door
- One exit

Challenge:

The player must collect access to the exit before crossing the closing door.

---

### Template B — Choose a Path

Mechanics:

- Two linked doors
- Two branches
- One exit

Challenge:

Crossing one linked door seals the other.

The player must determine which branch must be completed first.

---

### Template C — Use the Door Twice

Mechanics:

- One two-use door
- Central room
- Two side objectives

Challenge:

The player must cross the door exactly twice and finish on the correct side.

---

### Template D — Alternating Routes

Mechanics:

- Toggle doors
- Two door groups
- Looping map

Challenge:

The player must alternate the maze state to progress through different sections.

---

### Template E — Directional Loop

Mechanics:

- Several one-way doors
- Circular corridor

Challenge:

The player must enter the loop at the correct point because movement around it is irreversible.

---

### Template F — Combined Commitment

Mechanics:

- One-way door
- Closing door
- Linked pair

Challenge:

The player must decide when to commit to a route while preserving access to the final exit.

---

## 12. Example Introductory Puzzle

```text
#########
#S  >   #
# ### # #
#     #E#
#########
```

Legend:

- `S` = Start
- `E` = Exit
- `>` = One-way door
- `#` = Wall

Lesson:

The player learns that the marked doorway may only be crossed from left to right.

---

## 13. Example Closing-Door Puzzle

```text
###########
#S   X    #
# ### ### #
#     E   #
###########
```

Legend:

- `X` = Closing door

Lesson:

After crossing `X`, the player cannot return.

The route must be planned before committing.

---

## 14. Example Linked-Door Puzzle

```text
#############
#S  A     B #
# ### ### # #
#     E     #
#############
```

Rules:

- Door A and Door B are linked
- Crossing A closes B
- Crossing B closes A

Lesson:

The player must determine which door should remain available.

---

## 15. Difficulty Progression

Difficulty should increase through combinations.

### Easy

- One mechanic
- Few rooms
- Obvious exit
- Minimal branching
- No more than one irreversible choice

### Medium

- Two mechanics
- Several loops
- Multiple possible routes
- One false but understandable path
- Some door-state tracking

### Hard

- Three or four mechanics
- Interconnected loops
- Multiple commitment points
- Route order matters
- Exit requires a specific final maze state

Avoid increasing difficulty only by enlarging the map.

---

## 16. Undo and Restart Design

Undo is strongly recommended.

Reasons:

- The game is turn-based
- Mistakes may happen several moves before failure becomes obvious
- Undo encourages experimentation
- Rewalking solved sections is not meaningful difficulty

Recommended system:

- Unlimited undo within the current puzzle
- Hold undo to rewind several steps
- Restart button always visible
- Door states rewind together with player movement

Optional challenge mode:

- Complete puzzles without undo
- Track minimum moves
- Track minimum door crossings

These should not affect normal progression.

---

## 17. Visual Language

Each door type must be understandable without relying only on color.

This improves accessibility.

Use combinations of:

- Shape
- Symbol
- Animation
- Frame design
- Color
- Sound

Example visual system:

| Door Type | Symbol | Shape Idea |
|---|---|---|
| One-way | Arrow | Pointed frame |
| Closing | Broken circle | Heavy shutter |
| Limited-use | Dots or bars | Segmented frame |
| Linked | Matching chain symbol | Paired frame |
| Toggle | Split circle | Alternating panels |
| Ordered | Number or sequence mark | Layered frame |
| Count | Number inside ring | Counter display |

Color should support the symbol, not replace it.

---

## 18. Art Direction

Recommended style:

- Minimal top-down 2D
- Stone, ruins, or abstract labyrinth setting
- Strong contrast between walls, floor, doors, and player
- Subtle animations
- Limited visual clutter
- Door symbols remain readable at all times

Possible themes:

- Ancient stone labyrinth
- Abstract geometric maze
- Mechanical dungeon
- Dreamlike shifting architecture
- Monochrome ruins with colored door symbols

The first prototype should use simple shapes.

Do not delay gameplay testing for detailed art.

---

## 19. Audio Design

Each mechanic should have a recognizable sound.

Examples:

- One-way door: short directional chime
- Closing door: heavy lock sound
- Limited-use door: one click per lost use
- Linked door: paired resonance sound
- Toggle door: two-tone switch sound
- Exit unlocked: clear completion tone

Audio should confirm state changes but should not be required to understand them.

---

## 20. Technical Structure

A door should be treated as an object with a common interface.

Possible data structure:

```js
{
  id: "door-a",
  type: "linked",
  position: { x: 4, y: 2 },
  direction: "horizontal",
  isOpen: true,
  usesRemaining: null,
  linkedDoorIds: ["door-b"],
  allowedDirection: null,
  groupId: "blue-group"
}
```

Recommended door functions:

```js
canEnter(playerPosition, movementDirection)
onEnter(gameState)
onExit(gameState)
updateState(gameState)
render()
serialize()
restore()
```

The game state should track:

```js
{
  playerPosition,
  moveHistory,
  doorStates,
  activeToggleGroups,
  sequenceProgress,
  crossingCounts,
  puzzleCompleted
}
```

Undo should store a snapshot or reversible action after every move.

---

## 21. Suggested Development Order

### Phase 1 — Basic Movement

Build:

- Grid
- Walls
- Player movement
- Collision
- Entrance and exit
- Restart

Goal:

Player can navigate a static maze.

---

### Phase 2 — Door Framework

Build:

- Base door object
- Open and closed states
- Door collision
- Door animations
- Door state serialization

Goal:

New door mechanics can be added without rewriting movement code.

---

### Phase 3 — First Mechanics

Implement:

1. One-way door
2. Closing door
3. Limited-use door

Goal:

Create five small test puzzles.

---

### Phase 4 — Connected Mechanics

Implement:

1. Linked doors
2. Toggle doors

Goal:

Confirm that doors can affect other doors reliably.

---

### Phase 5 — Undo System

Build:

- Move history
- Door-state history
- Multi-step rewind
- Restart confirmation if needed

Goal:

Every action can be reversed correctly.

---

### Phase 6 — Level Format

Store puzzles in JSON or JavaScript objects.

Example:

```js
{
  id: "linked-01",
  width: 8,
  height: 8,
  start: { x: 1, y: 1 },
  exit: { x: 6, y: 6 },
  walls: [],
  doors: []
}
```

Goal:

Levels can be created without changing game-engine code.

---

### Phase 7 — Campaign Prototype

Create:

- Tutorial sequence
- 10–18 puzzles
- Level selection
- Completion tracking
- Simple transitions

Goal:

Produce a complete playable MVP.

---

### Phase 8 — Playtesting

Observe:

- Whether players understand symbols
- Where players become confused
- Whether failures feel fair
- Whether maps are too large
- Whether door consequences are visible
- Whether players use undo excessively
- Which mechanics create the strongest puzzles

Revise levels before adding more door types.

---

## 22. Playtesting Questions

Ask testers:

1. What did you think each door would do?
2. Did any door change surprise you unfairly?
3. Could you explain why your failed route failed?
4. Did you feel you were reasoning or guessing?
5. Was the map easy to read?
6. Did undo remove frustration?
7. Which puzzle produced the strongest realization?
8. Which mechanic felt repetitive?
9. Were any symbols too similar?
10. Did any level take long because of walking rather than thinking?

---

## 23. Success Criteria for the MVP

The prototype is successful if:

- Players understand each door after one or two teaching puzzles
- Players can predict door consequences
- Failures feel logical
- Combined mechanics create new reasoning
- Puzzles remain readable
- The game feels different from a traditional key-and-door maze
- Players describe the game as being about route planning
- The player wants to try another puzzle after completing one

---

## 24. Risks

### Risk 1 — Too Many Door Types

Problem:

The player must remember too many unrelated rules.

Solution:

Keep six core mechanics and deepen them through combinations.

---

### Risk 2 — Trial and Error

Problem:

Players move randomly until something works.

Solution:

Show all rules and state changes clearly.

---

### Risk 3 — Excessive Backtracking

Problem:

The player spends more time walking than solving.

Solution:

Use small maps, shortcuts, undo, and instant restart.

---

### Risk 4 — Unreadable Combined States

Problem:

Linked and toggle doors become difficult to track.

Solution:

Use strong group symbols, animations, and visible state indicators.

---

### Risk 5 — Soft Locks

Problem:

The player becomes trapped without immediately realizing it.

Solution:

Allow undo and detect states where the exit is unreachable.

Optional:

Display a subtle trapped-state indicator without automatically resetting.

---

### Risk 6 — Mechanics Feel Like Variations of the Same Door

Problem:

Several mechanics may all feel like doors simply closing.

Solution:

Ensure each mechanic creates a different reasoning pattern:

- One-way = direction
- Closing = commitment
- Limited-use = resource
- Linked = sacrifice
- Toggle = state alternation
- Ordered = sequence

---

## 25. Future Expansion

Only consider these after the MVP is enjoyable:

- Ordered doors
- Count doors
- Doors affected by entry direction
- Optional challenge rooms
- Large interconnected overworld
- Persistent shortcuts
- Level editor
- Community puzzles
- Daily puzzle
- Move-count challenges
- Multiple exits
- Hidden optional endings
- Story told through the labyrinth

---

## 26. Final Design Rule

Every new mechanic should pass this test:

> Does this door create a new route-planning decision?

If the answer is no, it should not be added.

The strongest version of the game will not have the most door types.

It will have a small, understandable set of door rules that combine to create many different labyrinth puzzles.
