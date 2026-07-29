# Basic Plan

## Goal
Build a simple playable puzzle game where the player draws a path from a start point to an exit point.

## MVP Features
- A simple grid-based puzzle board
- Start and exit points
- Line drawing interaction
- Win detection when the player reaches the exit
- Reset button
- Simple puzzle progression
- Progress saved in localStorage

## Scope for First Version
- 1 area
- 9 puzzles
- grid size ramps up per puzzle instead of a fixed size: 1x1 -> 2x2 -> 3x3
- puzzles 1-4 teach basic path drawing only (no dots); puzzles 5-9 introduce dots (must pass through), starting on the same small 2x2 grid before growing to 3x3 and finishing on 4x4 - the new mechanic doesn't require jumping to the largest board
- no story or heavy UI

## Development Steps
1. Create the game layout and grid
2. Add drawing interaction
3. Implement win detection
4. Load puzzles from JSON
5. Add reset and next-puzzle flow
6. Save progress locally

## Success Criteria
The game is successful if a player can open it, complete a few puzzles, and enjoy the core experience without confusion.

## Beyond the MVP
This document describes the original 9-puzzle MVP. The game has since grown into a single flat sequence of 50 levels (`src/puzzles/levels.json`), each unlocking only once the previous one is solved. Every mechanic from `plan.md`'s Section 12 roadmap (Dots, Blocked Edges, Required Edges, Symmetry, Triangles, Colored Regions) gets a short solo introduction and then reappears combined with earlier mechanics in later levels — no area or mechanic name is ever shown to the player, matching `plan.md`'s "Teach Through Play" principle. See `plan.md` Section 13 for the full level-by-level breakdown.
